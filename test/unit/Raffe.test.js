const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const {
  developmentChains,
  netWorkConfig,
} = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Unit Tests", function () {
      let raffle,
        vrfCoordinatorV2_5Mock,
        raffleEntranceFee,
        //deployer,
        player,
        interval,
        raffleContract,
        subId;
      beforeEach(async function () {
        //deployer = (await getNamedAccounts()).deployer;
        //const signer = await ethers.getSigner(deployer);
        accounts = await ethers.getSigners();
        const signer = accounts[0];
        player = accounts[1];
        await deployments.fixture(["all"]); // deploy

        // raffle contract
        raffleContract = await ethers.getContractAt(
          "Raffle",
          (await deployments.get("Raffle")).address
        );
        raffle = raffleContract.connect(player);

        // mock contract
        vrfCoordinatorV2_5Mock = await ethers.getContractAt(
          "VRFCoordinatorV2_5Mock",
          (await deployments.get("VRFCoordinatorV2_5Mock")).address,
          signer
        );
        // add consumer to call randomnum
        subId = await raffle.getSubscriptionId();
        await vrfCoordinatorV2_5Mock.addConsumer(subId, raffleContract.target);

        raffleEntranceFee = await raffle.getEntranceFee();
        interval = await raffle.getInterval();
      });

      describe("constructor", function () {
        it("Initializes the raffle correctly", async function () {
          const raffleState = await raffle.getRaffleState();
          assert.equal(raffleState.toString(), "0");
          assert.equal(
            interval.toString(),
            netWorkConfig[network.config.chainId]["interval"]
          );
        });
      });

      describe("enterRaffle", function () {
        it("reverts when you don't pay enough", async function () {
          await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(
            raffle,
            "Raffle__NotEnoughETHEntered"
          );
        });
        it("records players when they enter", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          const playerFromcontract = await raffle.getPlayer(0);
          assert.equal(playerFromcontract, player.address);
        });
        it("emit event on enter", async function () {
          await expect(
            raffle.enterRaffle({ value: raffleEntranceFee })
          ).to.emit(raffle, "RaffleEnter");
        });
        it("doesn't allow entrance when raffle is calculating", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          // make the rafflestate close
          await signer.provider.send("evm_increaseTime", [
            Number(interval) + 1,
          ]);
          await signer.provider.send("evm_mine", []);

          await raffle.performUpkeep("0x");
          await expect(
            raffle.enterRaffle({ value: raffleEntranceFee })
          ).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen");
        });
      });

      describe("checkUpkeep", function () {
        it("returns false if people haven't send any ETH", async function () {
          await network.provider.send("evm_increaseTime", [
            Number(interval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");
          assert(!upkeepNeeded);
        });
        it("returns false if raffle isn't open", async function () {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            Number(interval) + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await raffle.performUpkeep("0x");
          const raffleState = await raffle.getRaffleState();
          const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x");
          assert.equal(raffleState.toString(), "1");
          assert.equal(upkeepNeeded, false);
        });
        it("returns false if enough time hasn't passed", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            Number(interval) - 5,
          ]); // use a higher number here if this test fails
          await network.provider.request({ method: "evm_mine", params: [] });
          const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x"); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
          assert(!upkeepNeeded);
        });
        it("returns true if enough time has passed, has players, eth, and is open", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            Number(interval) + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const { upkeepNeeded } = await raffle.checkUpkeep.staticCall("0x"); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
          assert(upkeepNeeded);
        });
      });

      describe("performUpkeep", function () {
        it("can only run if checkupkeep is true", async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            Number(interval) + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const tx = await raffle.performUpkeep("0x");
          assert(tx);
        });
        it("reverts if checkup is false", async () => {
          await expect(
            raffle.performUpkeep("0x")
          ).to.be.revertedWithCustomError(raffle, "Raffle__UpkeepNotNeeded");
        });
        it("updates the raffle state and emits a requestId", async () => {
          // Too many asserts in this test!
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            Number(interval) + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const txResponse = await raffle.performUpkeep("0x"); // emits requestId
          const txReceipt = await txResponse.wait(1); // waits 1 block
          const raffleState = await raffle.getRaffleState(); // updates state
          const requestId = txReceipt.logs[1].args.getValue("requestId");
          assert(Number(requestId) > 0);
          assert(raffleState == 1); // 0 = open, 1 = calculating
        });
      });

      describe("fulfillRandomWords", function () {
        beforeEach(async () => {
          await raffle.enterRaffle({ value: raffleEntranceFee });
          await network.provider.send("evm_increaseTime", [
            Number(interval) + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
        });
        it("can only be called after performupkeep", async () => {
          await expect(
            vrfCoordinatorV2_5Mock.fulfillRandomWords(0, raffle.target) // reverts if not fulfilled
          ).to.be.reverted;
          await expect(
            vrfCoordinatorV2_5Mock.fulfillRandomWords(1, raffle.target) // reverts if not fulfilled
          ).to.be.reverted;
        });

        // This test is too big...
        // This test simulates users entering the raffle and wraps the entire functionality of the raffle
        // inside a promise that will resolve if everything is successful.
        // An event listener for the WinnerPicked is set up
        // Mocks of chainlink keepers and vrf coordinator are used to kickoff this winnerPicked event
        // All the assertions are done once the WinnerPicked event is fired
        it("picks a winner, resets, and sends money", async () => {
          const additionalEntrances = 3; // to test
          const startingIndex = 2;
          let startingBalance;
          for (
            let i = startingIndex;
            i < startingIndex + additionalEntrances;
            i++
          ) {
            // i = 2; i < 5; i=i+1
            raffle = raffleContract.connect(accounts[i]); // Returns a new instance of the Raffle contract connected to player
            await raffle.enterRaffle({ value: raffleEntranceFee });
          }
          const startingTimeStamp = await raffle.getLastTimeStamp(); // stores starting timestamp (before we fire our event)
          // This will be more important for our staging tests...
          await new Promise(async (resolve, reject) => {
            raffle.once("WinnerPicked", async () => {
              // event listener for WinnerPicked
              console.log("WinnerPicked event fired!");
              // assert throws an error if it fails, so we need to wrap
              // it in a try/catch so that the promise returns event
              // if it fails.
              try {
                // Now lets get the ending values...
                const recentWinner = await raffle.getRecentWinner();
                const raffleState = await raffle.getRaffleState();
                const winnerBalance = await accounts[2].provider.getBalance(
                  accounts[2].address
                );
                const endingTimeStamp = await raffle.getLastTimeStamp();
                await expect(raffle.getPlayer(0)).to.be.reverted;
                // Comparisons to check if our ending values are correct:
                assert.equal(recentWinner.toString(), accounts[2].address);
                assert.equal(raffleState, 0);
                assert.equal(
                  winnerBalance.toString(),
                  Number(startingBalance) + // startingBalance + ( (raffleEntranceFee * additionalEntrances) + raffleEntranceFee )
                    (Number(raffleEntranceFee) * additionalEntrances +
                      Number(raffleEntranceFee))
                );
                assert(endingTimeStamp > startingTimeStamp);
                resolve(); // if try passes, resolves the promise
              } catch (e) {
                reject(e); // if try fails, rejects the promise
              }
            });

            // kicking off the event by mocking the chainlink keepers and vrf coordinator
            // Simulate a random number then win set winner and call the above code
            try {
              const tx = await raffle.performUpkeep("0x");
              const txReceipt = await tx.wait(1);
              startingBalance = await accounts[2].provider.getBalance(
                accounts[2].address
              );
              // add subscription balance
              const tx2 =
                await vrfCoordinatorV2_5Mock.fundSubscriptionWithNative(subId, {
                  value: "1000000000000000000",
                });
              const txReceipt2 = await tx2.wait(1);
              // get randomwords number
              await vrfCoordinatorV2_5Mock.fulfillRandomWords(
                txReceipt.logs[1].args.getValue("requestId"),
                raffle.target // random number
              );
            } catch (e) {
              reject(e);
            }
          });
        });
      });
    });
