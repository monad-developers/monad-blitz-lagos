"use client";

import Link from "next/link";
import { useState } from "react";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { type Address, isAddress, parseEther } from "viem";
import type { PlayerDashboardData } from "@/components/dashboard/player/types";
import { CHAIN_ID } from "@/lib/monad";

type DashboardHeaderProps = {
  profile: PlayerDashboardData["playerProfile"];
  summary: PlayerDashboardData["playerSummary"];
};

export function DashboardHeader({ profile, summary }: DashboardHeaderProps) {
  const { client: smartWalletClient, getClientForChain } = useSmartWallets();
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawTo, setWithdrawTo] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawTxHash, setWithdrawTxHash] = useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleCopyWallet = async () => {
    try {
      if (!profile.walletAddress) {
        return;
      }

      await navigator.clipboard.writeText(profile.walletAddress);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch (error) {
      console.error("Failed to copy wallet address", error);
    }
  };

  const handleWithdraw = async () => {
    setWithdrawError(null);
    setWithdrawTxHash(null);

    const normalizedAddress = withdrawTo.trim();
    const normalizedAmount = withdrawAmount.trim();

    if (!isAddress(normalizedAddress)) {
      setWithdrawError("Enter a valid recipient wallet address.");
      return;
    }

    if (!normalizedAmount || Number(normalizedAmount) <= 0) {
      setWithdrawError("Enter an amount greater than 0.");
      return;
    }

    try {
      setIsWithdrawing(true);
      const chainClient = smartWalletClient ?? (await getClientForChain({ id: CHAIN_ID }));
      if (!chainClient) {
        throw new Error("Smart wallet is not ready. Reconnect and try again.");
      }

      const txHash = await chainClient.sendTransaction({
        to: normalizedAddress as Address,
        value: parseEther(normalizedAmount),
      });

      setWithdrawTxHash(txHash);
      setWithdrawAmount("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit withdrawal transaction.";
      setWithdrawError(message);
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <header className="relative overflow-hidden rounded-2xl border border-app/60 bg-app-surface p-4 shadow-app sm:p-5 lg:p-6">
      <div className="pointer-events-none absolute right-[-4rem] top-[-3rem] h-40 w-40 rounded-full bg-primary/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-[-4rem] left-[-4rem] h-44 w-44 rounded-full bg-secondary/10 blur-3xl" aria-hidden="true" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:justify-between">
        <div className="min-w-0">
          <p className="text-base font-semibold uppercase tracking-[0.16em] text-app-muted sm:text-lg">
            Player Dashboard
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-app sm:text-4xl lg:text-5xl">
            Hi, {profile.fullName}
          </h1>

          <div className="mt-3 flex flex-col items-start gap-1.5">
            <span className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-xl bg-app-soft px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-app sm:min-h-14 sm:min-w-14 sm:text-sm">
              {profile.level}
            </span>
            <span className="text-sm font-semibold text-app sm:text-base">
              {profile.ranking}
            </span>
          </div>
        </div>

        <div className="mt-3 flex flex-col items-center lg:mt-0">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.12em] text-app-muted sm:text-base">
            Wallet Balance
          </p>
          <div className="inline-flex rounded-xl bg-primary px-4 py-3 shadow-[0_16px_36px_color-mix(in_srgb,var(--color-primary)_24%,transparent)] sm:px-5">
            <p className="text-2xl font-bold text-white dark:text-[#2f1736] sm:text-3xl" style={{ color: "var(--color-white)" }}>{summary.walletBalance}</p>
          </div>
          <div className="mt-3 flex items-center justify-center gap-2 text-lg font-medium text-app sm:text-xl">
            <span>{profile.walletPreview}</span>
            <button
              type="button"
              onClick={handleCopyWallet}
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-app-muted transition-colors duration-200 hover:bg-app-soft hover:text-app focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label={copyState === "copied" ? "Wallet address copied" : "Copy wallet address"}
              title={copyState === "copied" ? "Copied" : "Copy wallet address"}
            >
              {copyState === "copied" ? (
                <svg className="h-4 w-4 text-primary" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <rect x="7" y="3" width="9" height="11" rx="2" stroke="currentColor" strokeWidth="1.7" />
                  <path d="M5 7H4a2 2 0 00-2 2v6a2 2 0 002 2h7a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsWithdrawOpen((prev) => !prev);
              setWithdrawError(null);
              setWithdrawTxHash(null);
            }}
            className="mt-3 inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-primary/35 bg-primary/10 px-4 py-2 text-base font-semibold text-primary transition-colors duration-200 hover:bg-primary/20 sm:text-lg"
          >
            {isWithdrawOpen ? "Close Withdrawal" : "Withdraw "}
          </button>

          {isWithdrawOpen ? (
            <div className="mt-3 w-full max-w-sm rounded-xl border border-app/45 bg-app-soft/80 p-3 text-left">
              <label htmlFor="withdraw-to" className="text-sm font-semibold uppercase tracking-[0.12em] text-app-muted sm:text-base">
                Recipient Address
              </label>
              <input
                id="withdraw-to"
                type="text"
                value={withdrawTo}
                onChange={(event) => setWithdrawTo(event.target.value)}
                placeholder="0x..."
                className="mt-1.5 w-full rounded-lg border border-app/40 bg-app-surface px-3 py-2 text-base text-app outline-none ring-primary/30 transition focus:ring sm:text-lg"
              />

              <label
                htmlFor="withdraw-amount"
                className="mt-3 block text-sm font-semibold uppercase tracking-[0.12em] text-app-muted sm:text-base"
              >
                Amount (MON)
              </label>
              <input
                id="withdraw-amount"
                type="number"
                min="0"
                step="0.0001"
                value={withdrawAmount}
                onChange={(event) => setWithdrawAmount(event.target.value)}
                placeholder="0.1"
                className="mt-1.5 w-full rounded-lg border border-app/40 bg-app-surface px-3 py-2 text-base text-app outline-none ring-primary/30 transition focus:ring sm:text-lg"
              />

              <button
                type="button"
                onClick={handleWithdraw}
                disabled={isWithdrawing}
                className="mt-3 inline-flex min-h-10 w-full cursor-pointer items-center justify-center rounded-lg bg-primary px-4 py-2 text-base font-semibold text-white transition-colors duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70 dark:text-[#2f1736] sm:text-lg"
              >
                {isWithdrawing ? "Submitting..." : "Send Withdrawal"}
              </button>

              {withdrawError ? <p className="mt-2 text-sm text-red-500 sm:text-base">{withdrawError}</p> : null}
              {withdrawTxHash ? (
                <a
                  href={`https://testnet.monadexplorer.com/tx/${withdrawTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block break-all text-sm font-semibold text-primary underline-offset-2 hover:underline sm:text-base"
                >
                  View transaction: {withdrawTxHash}
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative mt-5 flex flex-wrap gap-3">
        <Link
          href="/challenge"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 py-3 text-lg font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 dark:text-[#2f1736] sm:text-xl"
          style={{ color: "var(--color-white)" }}
        >
          Explore Challenges
        </Link>
        <Link
          href="#dashboard-rewards"
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-app-soft px-5 py-3 text-lg font-semibold text-app transition-colors duration-200 hover:bg-app sm:text-xl"
        >
          View Rewards
        </Link>
      </div>
    </header>
  );
}
