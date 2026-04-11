import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@privy-io/react-auth", "permissionless"],
};

export default nextConfig;
