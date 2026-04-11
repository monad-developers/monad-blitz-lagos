import { beforeEach, vi } from "vitest";

const envDefaults = {
  NEXT_PUBLIC_PRIVY_APP_ID: "test-app-id",
  PRIVY_APP_SECRET: "test-app-secret",
  SERVER_SIGNER_PRIVATE_KEY: "0x1111111111111111111111111111111111111111111111111111111111111111",
  NEXT_PUBLIC_CONTRACT_ADDRESS: "0x1111111111111111111111111111111111111111",
  NEXT_PUBLIC_MONAD_RPC: "https://test-rpc.local",
  PINATA_JWT: "test-pinata-jwt",
  NEXT_PUBLIC_PINATA_GATEWAY_URL: "https://gateway.pinata.cloud",
  DISTRIBUTE_SECRET: "abcdefghijklmnopqrstuvwxyz",
  PLATFORM_FEE_BPS: "500",
  NODE_ENV: "test",
};

for (const [key, value] of Object.entries(envDefaults)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}

vi.mock("@privy-io/node", () => {
  class PrivyClient {
    constructor(_options: unknown) {}

    utils() {
      return {
        auth: () => ({
          verifyAccessToken: async (token: string) => {
            if (token !== "test-token") {
              throw new Error("invalid token");
            }

            return {
              user_id: "user_123",
            };
          },
          verifyIdentityToken: async (token: string) => {
            if (token !== "test-token") {
              throw new Error("invalid token");
            }

            return {
              id: "user_123",
              wallet: { address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
            };
          },
        }),
      };
    }

    users() {
      return {
        _get: async (_userId: string) => ({
          wallet: { address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
        }),
      };
    }
  }

  return { PrivyClient };
});

beforeEach(() => {
  vi.clearAllMocks();
});
