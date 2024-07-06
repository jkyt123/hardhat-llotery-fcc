const { network, ethers } = require("hardhat");
const {
  netWorkConfig,
  developmentChains,
} = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

const VRF_SUB_FUND_AMOUNT = ethers.parseEther("30");

/*
 * Anoren
 * for "ethers": "^6.13.1",
 */
module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  signer = await ethers.getSigner(deployer);
  let vrfCoordinatorV2_5Address, subscriptionId;
  let vRFCoordinatorV2_5Mock; // contract

  if (developmentChains.includes(network.name)) {
    // deploy mock
    vRFCoordinatorV2_5Mock = await ethers.getContractAt(
      "VRFCoordinatorV2_5Mock",
      (await get("VRFCoordinatorV2_5Mock")).address,
      signer
    );
    // get contract address from contractt
    vrfCoordinatorV2_5Address = vRFCoordinatorV2_5Mock.target;
    // emit createSubscription event
    const transactionResponse =
      await vRFCoordinatorV2_5Mock.createSubscription();
    const transactionReceipt = await transactionResponse.wait(1);
    // get subscriptionId from event log, itsn't need to listen event
    subscriptionId = transactionReceipt.logs[0].args.getValue("subId");
    //await vRFCoordinatorV2_5Mock.addConsumer(subscriptionId, signer.address);

    await vRFCoordinatorV2_5Mock.fundSubscription(
      subscriptionId,
      VRF_SUB_FUND_AMOUNT
    );
  } else {
    vrfCoordinatorV2_5Address = netWorkConfig[chainId]["vrfCoordinatorV2_5"];
    subscriptionId = netWorkConfig[chainId]["subscriptionId"];
  }

  const entranceFee = netWorkConfig[chainId]["entranceFee"];
  const gasLane = netWorkConfig[chainId]["gasLane"];
  const callbackGasLimit = netWorkConfig[chainId]["callbackGasLimit"];
  const interval = netWorkConfig[chainId]["interval"];
  const args = [
    vrfCoordinatorV2_5Address,
    entranceFee,
    gasLane,
    subscriptionId,
    callbackGasLimit,
    interval,
  ];
  const raffle = await deploy("Raffle", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log("Verifying.....");
    await verify(raffle.address, args);
  }
  log("----------------------------------");
};

module.exports.tags = ["all", "raffle"];
