var BettingContract = artifacts.require("BettingContract");

contract('BettingContract', function(accounts) {
  it("should distribute winnings correctly", function() {
    var betcon;
    var oracle = accounts[1];
    var gamblerA = accounts[2];
    var gamblerB = accounts[3];
    var gamblerC = accounts[4];
    return BettingContract.deployed().then(function (instance) {
      betcon = instance;
      return betcon.setOutcomes([1,2,3,4]);
    }).then(function (tx) {
      return betcon.chooseOracle(oracle);
    }).then(function (tx) {
      return betcon.makeBet(1, {from: gamblerA, value: 10});
    }).then(function (tx) {
      return betcon.makeBet(1, {from: gamblerB, value: 5});
    }).then(function (tx) {
      return betcon.makeBet(2, {from: gamblerC, value: 60});
    }).then(function (tx) {
      return betcon.makeDecision(1, {from: oracle});
    }).then(function (tx) {
      return betcon.checkWinnings.call({from: gamblerA})
    }).then(function (winningsA) {
      assert.equal(winningsA, 50, "gamblerA should win his bet + 2/3 of C's bet");
      return betcon.checkWinnings.call({from: gamblerB});
    }).then(function (winningsB) {
      assert.equal(winningsB, 25, "gamblerB should win his bet + 1/3 of C's bet");
      return betcon.checkWinnings.call({from: gamblerC});
    }).then(function (winningsC) {
      assert.equal(winningsC, 0, "You get nothing! You lose! Good day sir!");
    })
  });
});
