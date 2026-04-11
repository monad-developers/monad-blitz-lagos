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
  solidity: "0.8.24",
  networks: {
    hardhat: {},
    monad: {
      url: process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
      chainId: Number(process.env.MONAD_CHAIN_ID || "10143"),
      accounts: normalizePrivateKey(process.env.MONAD_PRIVATE_KEY),
    },
  },
  sourcify: {
    enabled: true,
    apiUrl: "https://sourcify-api-monad.blockvision.org/",
    browserUrl: "https://testnet.monadvision.com/"
  },
  etherscan: {
    enabled: false
  }
};

export default config;
