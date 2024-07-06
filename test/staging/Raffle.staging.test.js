const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const {
  developmentChains,
  netWorkConfig,
} = require("../../helper-hardhat-config");
const { assert, expect } = require("chai");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Unit Tests", function () {
      let raffle, raffleEntranceFee, deployer;
      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        const signer = await ethers.getSigner(deployer);

        // raffle contract
        raffle = await ethers.getContractAt(
          "Raffle",
          (await deployments.get("Raffle")).address,
          signer
        );
      });

      describe("fulfillRandomWords", function () {
        it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
          // enter the raffle
          const startingTimeStamp = await raffle.getLastTimeStamp();
          const accounts = await ethers.getSigners();
          console.log(`getTime: ${startingTimeStamp}`);
          console.log(`player: ${accounts[0]}`);

          await new Promise(async (resolve, reject) => {
            // listener
            raffle.once("WinnerPicked", async () => {
              console.log("WinnerPicked event fired!");
              resolve();
              try {
                // add our asserts here
                const recentWinner = await raffle.getRecentWinner();
                const raffleState = await raffle.getRaffleState();
                // only one player enter
                const winnerEndingBalance =
                  await accounts[2].provider.getBalance(accounts[0].address);
                const endingTimeStamp = await raffle.getLastTimeStamp();

                // players should be reseted
                await expect(raffle.getPlayer(0)).to.be.reverted;
                assert.equal(recentWinner.toString(), accounts[0].address);
                assert.equal(raffleState, 0);
                assert.equal(
                  winnerEndingBalance.toString(),
                  winnerStartingBalance + raffleEntranceFee
                );
                assert.equal(endingTimeStamp > startingTimeStamp);
                resolve();
              } catch (error) {
                console.log(error);
                reject(e);
              }
            });
          });
          // Then entering the raffle
          console.log("entering the raffle");
          await raffle.enterRaffle({ value: raffleEntranceFee });
          const winnerStartingBalance = await accounts[0].provider.getBalance(
            accounts[0].address
          );
        });
      });
    });
