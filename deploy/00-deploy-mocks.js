const { network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");

const BASE_FEE = "100000000000000000"; // 0.25 is the premium. It cost 0.25 Link
const GAS_PRICE_LINK = "1000000000"; // calculated value based on the gas price of the chain.
const WEI_PERUNIT_LINK = 4133242054020401;

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const args = [BASE_FEE, GAS_PRICE_LINK, WEI_PERUNIT_LINK];

  if (developmentChains.includes(network.name)) {
    log("Local network detected! Deploying mocks.");
    await deploy("VRFCoordinatorV2_5Mock", {
      from: deployer,
      log: true,
      args: args,
    });
    log("Mocks Deployed!");
    log("------------------------------------------");
  }
};

module.exports.tags = ["all", "mocks"];
