import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import type { HardhatUserConfig } from "hardhat/config";

loadEnv({ path: resolve(__dirname, "../.env") });

function normalizePrivateKey(privateKey?: string) {
  if (!privateKey) {
    return [];
  }

  return [privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`];
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {},
    monadTestnet: {
      url: process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
      chainId: Number(process.env.MONAD_CHAIN_ID || "10143"),
      accounts: normalizePrivateKey(process.env.MONAD_PRIVATE_KEY),
    },
  },
  etherscan: {
    apiKey: {
      monadTestnet: "monad",
    },
    customChains: [
      {
        network: "monadTestnet",
        chainId: 10143,
        urls: {
          apiURL: "https://testnet-explorer.monad.xyz/api",
          browserURL: "https://testnet-explorer.monad.xyz",
        },
      },
    ],
  },
};

export default config;
