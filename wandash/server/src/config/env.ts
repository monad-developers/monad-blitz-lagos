import dotenv from "dotenv"
import path from "path"

// Resolve .env from server root regardless of CWD
dotenv.config({ path: path.resolve(__dirname, "../../.env") })

export const env = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL!,
  rpcUrl: process.env.RPC_URL || "https://rpc.monad-testnet.category.xyz/rpc",
  chainId: parseInt(process.env.CHAIN_ID || "10143", 10),
  contractAddress: (process.env.CONTRACT_ADDRESS || "0x575dca87061898C3EbBC2a8F2a49C09120E88951") as `0x${string}`,
  signerPrivateKey: process.env.SIGNER_PRIVATE_KEY as `0x${string}` | undefined,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  subgraphUrl:
    process.env.SUBGRAPH_URL ||
    "https://api.goldsky.com/api/public/project_cmnn27cgufwam01x895lwbit9/subgraphs/giveaway/1.0.0/gn",
} as const
