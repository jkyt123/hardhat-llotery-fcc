const { run } = require("hardhat");

const verify = async (contractAddress, args) => {
  console.log(hre.run);
  console.log(args);
  console.log("Verifying contract...");
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
      timeout: 3000000000,
    });
  } catch (e) {
    if (e.message.toLowerCase().includes("already verififed")) {
      console.log("Already Verified!");
    } else {
      console.log(e);
    }
  }
};

module.exports = { verify };
