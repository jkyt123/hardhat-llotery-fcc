//require("@nomiclabs/hardhat-waffle");
require("@nomicfoundation/hardhat-chai-matchers");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-deploy");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
require("dotenv").config();
require("@nomicfoundation/hardhat-ethers");
// agent for verify, only when timeout error need that
const { ProxyAgent, setGlobalDispatcher } = require("undici");
const proxyAgent = new ProxyAgent("http://127.0.0.1:10809"); // local agent ip and port
setGlobalDispatcher(proxyAgent);

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "http";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "key";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "key";
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",

  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
      blockConfirmations: 1,
      allowUnlimitedContractSize: true, // 2-5mock.sol is too large
    },
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 11155111,
      blockConfirmations: 6,
    },
  },
  gasReporter: {
    enabled: false,
    outputFile: "gas-report.txt",
    noColors: true,
    currency: "USD",
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    player: {
      default: 1,
    },
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY,
    },
  },
  mocha: {
    timeout: 500000,
  },
};
