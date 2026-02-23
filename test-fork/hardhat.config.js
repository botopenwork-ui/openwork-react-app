require("@nomicfoundation/hardhat-ethers");

const ARB_SEPOLIA_RPC = "https://arb-sepolia.g.alchemy.com/v2/ECvjGU_6M0Jrw6wlFkPo2ZbonbfW5oIZ";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: ARB_SEPOLIA_RPC,
        enabled: true,
      },
      chainId: 421614,
      // allowUnlimitedContractSize removed — nowjc-v2 is now 24,423 bytes (under EIP-170 limit)
    },
  },
};
