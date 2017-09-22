pragma solidity ^0.4.15;

contract BettingContract {
	/* Standard state variables */
	address owner;
	address public oracle;
	uint numBets;
	uint maxBets = 10;
	address[] gamblers = new address[](maxBets);
	uint totalBet;
	uint[] outcomes;

	/* Structs are custom data structures with self-defined parameters */
	struct Bet {
		uint outcome;
		uint amount;
		bool initialized;
	}

	/* Keep track of every gambler's bet */
	mapping (address => Bet) bets;
	/* Keep track of every player's winnings (if any) */
	mapping (address => uint) winnings;

	/* Add any events you think are necessary */
	event BetMade(address gambler);
	event BetClosed();

	/* Uh Oh, what are these? */
	modifier OwnerOnly() {require(msg.sender == owner); _;}
	modifier OracleOnly() {require(msg.sender == oracle); _;}
	modifier NotOracle() {require(msg.sender != oracle); _;}
	modifier NotOwner() {require(msg.sender != owner); _;}
	modifier NotAlreadyBet() {require(!bets[msg.sender].initialized); _;}
	modifier OpenBettingSlot() {require(numBets < maxBets); _;}
	modifier HasFunds(uint withdrawAmount) {
		require(winnings[msg.sender] >= withdrawAmount);
		_;
	}

	/* Constructor function, where owner and outcomes are set */
	function BettingContract(uint[] _outcomes) public {
		owner = msg.sender;
		outcomes = _outcomes;
	}

	function setOutcomes(uint[] _outcomes) public OwnerOnly {
		outcomes = _outcomes;
	}

	/* Owner chooses their trusted Oracle */
	function chooseOracle(address _oracle) public OwnerOnly() returns (address) {
		if (bets[_oracle].initialized) revert();
		oracle = _oracle;
		return oracle;
	}

	/* Gamblers place their bets, preferably after calling checkOutcomes */
	function makeBet(uint _outcome)
	public
	payable
	NotOracle()
	NotOwner()
	OpenBettingSlot()
	NotAlreadyBet() returns (bool) {
		bets[msg.sender] = Bet(_outcome, msg.value, true);
		gamblers[numBets] = msg.sender;
		totalBet += msg.value;
		numBets += 1;
		BetMade(msg.sender);
		return true;
	}

	/* The oracle chooses which outcome wins */
	function makeDecision(uint _outcome) public OracleOnly() {
		uint numWinners = 0;
		uint winnerBets = 0;
		for (uint i=0; i<numBets; i++) {
			if (bets[gamblers[i]].outcome == _outcome) {
				numWinners++;
				winnerBets += bets[gamblers[i]].amount;
			}
		}
		if (numWinners == 0) winnings[oracle] += totalBet;
		else {
			for (i=0; i<numBets; i++) {
				if (bets[gamblers[i]].outcome == _outcome) {
					//Each winner receives share of total bets
					//proportional to their share of the winning bets
					winnings[gamblers[i]] += (totalBet*bets[gamblers[i]].amount)/winnerBets;
				}
			}
		}
		contractReset();
		BetClosed();
	}

	/* Allow anyone to withdraw their winnings safely (if they have enough) */
	function withdraw(uint withdrawAmount)
	public
	HasFunds(withdrawAmount)
	returns (uint remainingBal) {
		winnings[msg.sender] -= withdrawAmount;
		msg.sender.transfer(withdrawAmount);
		remainingBal = winnings[msg.sender];
	}

	/* Allow anyone to check the outcomes they can bet on */
	function checkOutcomes() public constant returns (uint[]) {
		return outcomes;
	}

	/* Allow anyone to check if they won any bets */
	function checkWinnings() public constant returns(uint) {
		return winnings[msg.sender];
	}

	/* Call delete() to reset certain state variables. Which ones? That's upto you to decide */
	function contractReset() private {
			for (uint i = 0; i < numBets; i++) {
				delete(bets[gamblers[i]]);
			}
			delete(gamblers);
	    numBets = 0;
	}

	/* Fallback function */
	function() {
		revert();
	}
}
