pragma solidity ^0.4.15;

contract BettingContract {
	/* Standard state variables */
	address owner;
	address public gamblerA;
	address public gamblerB;
	address public oracle;
	uint numBets;
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
	modifier NotAlreadyBet() {
		require(msg.sender != gamblerA && msg.sender != gamblerB);
		_;
	}
	modifier OpenBettingSlot() {require(numBets < 2); _;}
	modifier HasFunds(uint withdrawAmount) {
		require(winnings[msg.sender] >= withdrawAmount);
		_;
	}

	/* Constructor function, where owner and outcomes are set */
	function BettingContract(uint[] _outcomes) public {
		owner = msg.sender;
		outcomes = _outcomes;
	}

	/* Owner chooses their trusted Oracle */
	function chooseOracle(address _oracle) public OwnerOnly() returns (address) {
		if (_oracle == gamblerA || _oracle == gamblerB) revert();
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
		if (numBets==0)
		  gamblerA = msg.sender;
		else
			gamblerB = msg.sender;
		BetMade(msg.sender);
		numBets += 1;
		return true;
	}

	/* The oracle chooses which outcome wins */
	function makeDecision(uint _outcome) public OracleOnly() {
		if (bets[gamblerA].outcome == _outcome &&
			  bets[gamblerB].outcome == _outcome) {
			winnings[gamblerA] += bets[gamblerA].amount;
			winnings[gamblerB] += bets[gamblerB].amount;
		} else if (bets[gamblerA].outcome == _outcome) {
			winnings[gamblerA] += bets[gamblerA].amount + bets[gamblerB].amount;
		} else if (bets[gamblerB].outcome == _outcome) {
			winnings[gamblerB] += bets[gamblerA].amount + bets[gamblerB].amount;
		} else {
			winnings[oracle] += bets[gamblerA].amount + bets[gamblerB].amount;
		}
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
	    delete(gamblerA);
	    delete(gamblerB);
	    numBets = 0;
	}

	/* Fallback function */
	function() {
		revert();
	}
}
