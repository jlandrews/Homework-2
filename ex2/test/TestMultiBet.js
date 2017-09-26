var BettingContract = artifacts.require("BettingContract");

contract('BettingContract', accounts => {
  var betcon;

  function promiseToThrow(p,msg) {
    return p.then(_ => false).catch(_ => true).then(res =>
      assert(res, msg));
  }

  beforeEach(() => {
    return BettingContract.new([1,2,3]).then(instance => {
      betcon = instance;
    })
  });

  it("should return list of outcomes correctly", () => {
    return betcon.checkOutcomes().then(k => {
      assert.deepEqual(k.map(Number),[1,2,3],"should be equal to default constructor values");
    })
  })

  it("should not allow a bettor to be chosen as oracle", () => {
    return promiseToThrow(
      betcon.makeBet(1, {from: accounts[1], value: 10}).then(tx => {
        return betcon.chooseOracle(accounts[1]);
      }), "transaction should throw an exception"
    );
  });

  it("should not allow the oracle to make a bet", () => {
    return promiseToThrow(
      betcon.chooseOracle(accounts[1]).then(tx => {
        return betcon.makeBet(1, {from: accounts[1], value:10});
      }), "transaction should throw an exception"
    );
  });

  it("should not allow owner to make a bet", () => {
    return promiseToThrow(
      betcon.makeBet(1, {value: 10}), "transaction should throw an exception"
    );
  });

  it("should not allow a bettor to change their bet", () => {
    return promiseToThrow(
      betcon.makeBet(1, {value: 10, from: accounts[1]}).then(tx => {
        return betcon.makeBet(2, {value: 10, from: accounts[1]});
      }), "transaction should throw an exception"
    );
  });

  it("should not allow someone other the owner to set the oracle", () => {
    return promiseToThrow(
      betcon.chooseOracle(accounts[1], {from: accounts[2]}),
      "transaction should throw exception"
    );
  });

  it("should not allow anyone other than the oracle to determine the winner", () => {
    return promiseToThrow(
      betcon.makeDecision(1, {from: accounts[1]}), "transaction should throw exception"
    );
  });

  it("should not allow funds to be sent directly to the contract", () => {
    return promiseToThrow(
      betcon.send(10), "transaction should throw exception"
    );
  });


  it("should have remaining balance after incomplete withdraw", () => {
    return Promise.all([
      betcon.chooseOracle(accounts[1]),
      betcon.makeBet(1,{from: accounts[2], value: 1000})
    ]).then(tx => {
      return betcon.makeDecision(1, {from: accounts[1]});
    }).then(tx => {
      return betcon.withdraw(700, {from: accounts[2]});
    }).then(tx => {
      return betcon.checkWinnings({from: accounts[2]});
    }).then(winnings => {
      assert.equal(winnings,300,"winnings should equal 300000");
    });
  });

  it("should allow withdrawal of full winnings", () => {
    return Promise.all([
      betcon.chooseOracle(accounts[1]),
      betcon.makeBet(1,{from: accounts[2], value: 1000})
    ]).then(tx => {
      return betcon.makeDecision(1, {from: accounts[1]});
    }).then(tx => {
      return betcon.withdraw(1000, {from: accounts[2]});
    });
  });

  it("should block withdrawal of more than full winnings", () => {
    return promiseToThrow(
      Promise.all([
        betcon.chooseOracle(accounts[1]),
        betcon.makeBet(1,{from: accounts[2], value: 1000})
      ]).then(tx => {
        return betcon.makeDecision(1, {from: accounts[1]});
      }).then(tx => {
        return betcon.withdraw(1500, {from: accounts[2]});
      }), "transaction should throw exception"
    );
  });

  it("should allow up to 5 bettors", () => {
    return Promise.all([
      betcon.makeBet(1, {from: accounts[1], value: 1000}),
      betcon.makeBet(1, {from: accounts[2], value: 1000}),
      betcon.makeBet(1, {from: accounts[3], value: 1000}),
      betcon.makeBet(1, {from: accounts[4], value: 1000}),
      betcon.makeBet(1, {from: accounts[5], value: 1000})
    ]).then(() => {
      assert.equal(true,true,"should be no exceptions");
    });
  });

  it("should not allow more than 5 bettors", () => {
    Promise.all([
        betcon.makeBet(1, {from: accounts[1], value: 1000}),
        betcon.makeBet(1, {from: accounts[2], value: 1000}),
        betcon.makeBet(1, {from: accounts[3], value: 1000}),
        betcon.makeBet(1, {from: accounts[4], value: 1000}),
        betcon.makeBet(1, {from: accounts[5], value: 1000})
      ]).then(() => {
        promiseToThrow(
          betcon.makeBet(1, {from: accounts[6], value: 1000}),
          "transaction should throw exception");
      })
  });

  it("should distribute winnings proportionally", () => {
    var oracle = accounts[1];
    var gamblerA = accounts[2];
    var gamblerB = accounts[3];
    var gamblerC = accounts[4];
    return Promise.all([
      betcon.chooseOracle(oracle),
      betcon.makeBet(1, {from: gamblerA, value: 1000}),
      betcon.makeBet(1, {from: gamblerB, value: 500}),
      betcon.makeBet(2, {from: gamblerC, value: 6000}),
      betcon.makeDecision(1, {from: oracle})
    ]).then(tx => {
      return Promise.all([
        betcon.checkWinnings.call({from: gamblerA}),
        betcon.checkWinnings.call({from: gamblerB}),
        betcon.checkWinnings.call({from: gamblerC}),
        betcon.checkWinnings.call({from: oracle}),
      ]);
    }).then(([wA, wB, wC, wO]) => {
      assert.equal(wA, 5000, "gamblerA should win his bet + 2/3 of C's bet");
      assert.equal(wB, 2500, "gamblerB should win his bet + 1/3 of C's bet");
      assert.equal(wC, 0, "You get nothing! You lose! Good day sir!");
      assert.equal(wO, 0, "Oracle should not have any winnings");
    });
  });

  it("should give all bets to oracle if no bet is correct", () => {
    var oracle = accounts[1];
    var gamblerA = accounts[2];
    var gamblerB = accounts[3];
    var gamblerC = accounts[4];
    return Promise.all([
      betcon.chooseOracle(oracle),
      betcon.makeBet(1, {from: gamblerA, value: 1000}),
      betcon.makeBet(1, {from: gamblerB, value: 500}),
      betcon.makeBet(2, {from: gamblerC, value: 6000}),
      betcon.makeDecision(3, {from: oracle})
    ]).then(tx => {
      return Promise.all([
        betcon.checkWinnings.call({from: gamblerA}),
        betcon.checkWinnings.call({from: gamblerB}),
        betcon.checkWinnings.call({from: gamblerC}),
        betcon.checkWinnings.call({from: oracle}),
      ]);
    }).then(([wA, wB, wC, wO]) => {
      assert.equal(wA, 0, "You get nothing!");
      assert.equal(wB, 0, "You lose!");
      assert.equal(wC, 0, "Good day sir!");
      assert.equal(wO, 7500, "Oracle gets all the money");
    });
  });
});
