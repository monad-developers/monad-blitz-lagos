export async function register() {
  // Only run on the Node.js server (not edge runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startAutoDistributor } = await import("@/services/auto-distribute");
    startAutoDistributor();
  }
}
