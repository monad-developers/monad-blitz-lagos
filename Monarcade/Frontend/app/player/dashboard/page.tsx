"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPublicClient, formatEther, http } from "viem";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PlayerDashboardShell } from "@/components/dashboard/player/player-dashboard-shell";
import type { ChallengeEntry, ChallengeCategory } from "@/lib/player-dashboard";
import { challengeCategories, rewardsHistory, recentActivity } from "@/lib/player-dashboard";
import type { BackendChallenge } from "@/lib/challenge-source";
import { fetchOnChainChallenges, fetchPublicChallenges } from "@/lib/challenge-source";
import { pageContainerClass } from "@/lib/layout";
import { MONAD_TESTNET } from "@/lib/monad";
import { useAuth } from "@/lib/auth";
import type { PlayerDashboardData } from "@/components/dashboard/player/types";

const getBrandInitials = (name: string) =>
  name
    .split(" ")
    .map((word) => word.trim()[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);

const formatTimeRemaining = (endTime?: number) => {
  if (!endTime) {
    return "In progress";
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const diff = endTime - nowSec;
  if (diff <= 0) {
    return "Ended";
  }

  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${Math.max(minutes, 1)}m`;
};

const formatMonBalance = (rawBalance: bigint) => {
  const value = Number(formatEther(rawBalance));
  if (!Number.isFinite(value)) {
    return "0 MON";
  }

  if (value === 0) {
    return "0 MON";
  }

  if (value < 0.0001) {
    return "<0.0001 MON";
  }

  return `${value.toFixed(4)} MON`;
};

const mapChallengesByCategory = (entries: BackendChallenge[]): Record<ChallengeCategory, ChallengeEntry[]> => {
  const nowSec = Math.floor(Date.now() / 1000);

  const toEntry = (challenge: BackendChallenge, status: "Live" | "Upcoming" | "Closed"): ChallengeEntry => ({
    id: challenge.metadataHash ?? String(challenge.challengeId),
    title: challenge.name,
    brandName: challenge.name,
    brandInitials: getBrandInitials(challenge.name),
    brandLogoPath: challenge.logoPath,
    reward: `${challenge.prizePool} MON`,
    statusLabel: status,
    challengeType: "Brand Challenge",
    timeRemaining: status === "Live" ? formatTimeRemaining(challenge.endTime) : undefined,
    startTime: status === "Upcoming" ? "Coming soon" : undefined,
    endedDate:
      status === "Closed" && challenge.endTime
        ? `Ended ${new Date(challenge.endTime * 1000).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}`
        : undefined,
    participated: false,
    won: false,
    actionLabel: status === "Live" ? "Play Now" : status === "Upcoming" ? "View Details" : "View Results",
  });

  const available = entries
    .filter((challenge) => challenge.started && (challenge.endTime ?? 0) > nowSec)
    .slice(0, 8)
    .map((challenge) => toEntry(challenge, "Live"));

  const upcoming = entries
    .filter((challenge) => !challenge.started)
    .slice(0, 8)
    .map((challenge) => toEntry(challenge, "Upcoming"));

  const closed = entries
    .filter((challenge) => challenge.started && (challenge.endTime ?? 0) <= nowSec)
    .slice(0, 8)
    .map((challenge) => toEntry(challenge, "Closed"));

  return {
    available,
    upcoming,
    closed,
    played: [],
    won: [],
  };
};


export default function PlayerDashboardPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [data, setData] = useState<PlayerDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userId = user?.id;
  const userEmail = user?.email;
  const userWalletAddress = user?.walletAddress;

  useEffect(() => {
    const loadData = async () => {
      if (!userId) {
        setData(null);
        setIsLoading(false);
        setError("Please sign in to view your dashboard.");
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const challengesRes = await fetchPublicChallenges();
        const mergedById = new Map<number, BackendChallenge>();

        for (const challenge of challengesRes.entries ?? []) {
          mergedById.set(challenge.challengeId, challenge);
        }

        const onChainEntries = await fetchOnChainChallenges();
        for (const challenge of onChainEntries) {
          const existing = mergedById.get(challenge.challengeId);
          if (!existing) {
            mergedById.set(challenge.challengeId, challenge);
            continue;
          }

          mergedById.set(challenge.challengeId, {
            ...challenge,
            ...existing,
            metadataHash: existing.metadataHash ?? challenge.metadataHash,
            started: existing.started || challenge.started,
            startTime: existing.startTime ?? challenge.startTime,
            endTime: existing.endTime ?? challenge.endTime,
            logoPath: existing.logoPath ?? challenge.logoPath,
            brandAddress: existing.brandAddress ?? challenge.brandAddress,
          });
        }

        const finalEntries = Array.from(mergedById.values()).sort((a, b) => b.challengeId - a.challengeId);
        const challengesByCategory = mapChallengesByCategory(finalEntries);
        const liveParticipation = challengesByCategory.available.length;

        let walletBalance = "0 MON";
        if (userWalletAddress) {
          const publicClient = createPublicClient({
            chain: MONAD_TESTNET,
            transport: http(process.env.NEXT_PUBLIC_MONAD_RPC ?? "https://testnet-rpc.monad.xyz"),
          });

          const rawBalance = await publicClient.getBalance({
            address: userWalletAddress as `0x${string}`,
          });
          walletBalance = formatMonBalance(rawBalance);
        }

        const walletPreview = userWalletAddress
          ? `${userWalletAddress.slice(0, 6)}...${userWalletAddress.slice(-4)}`
          : "0x...";

        const playerProfile = {
          fullName: userEmail?.split("@")[0] || "Player",
          displayName: (userEmail?.split("@")[0] || "Player").split(".")[0],
          username: `@${(userEmail?.split("@")[0] || "player").toLowerCase().replace(/[^a-z0-9]/g, "")}`,
          email: userEmail || "no-email@monarcade.gg",
          joinedDate: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
          level: "Active Player",
          ranking: "Unranked",
          badge: "Getting Started",
          walletPreview,
          walletAddress: userWalletAddress || "",
        };

        const playerSummary = {
          walletBalance,
          walletHelper: "Live balance from your Privy embedded wallet",
          totalRewardsEarned: "0 MON",
          challengesPlayed: 0,
          challengesWon: 0,
          availableRewards: "0",
          liveParticipation,
        };

        setData({
          challengeCategories,
          challengesByCategory,
          rewardsHistory,
          recentActivity,
          playerProfile,
          playerSummary,
        });
      } catch (err) {
        console.error("Error loading dashboard data:", err);
        setData(null);
        setError("Failed to load dashboard data. Check backend availability and NEXT_PUBLIC_API_URL.");
      } finally {
        setIsLoading(false);
      }
    };

    if (!isAuthLoading) {
      loadData();
    }
  }, [isAuthLoading, userEmail, userId, userWalletAddress]);

  return (
    <div className="page-typography player-dashboard-typography min-h-screen bg-app text-app">
      <Navbar />

      <main className="w-full pb-12 pt-4 sm:pt-6 lg:pb-16 lg:pt-8">
        <div className={pageContainerClass}>
          <div className="mb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-base text-app-muted transition-colors duration-200 hover:text-app sm:text-lg"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>
          </div>

          {isAuthLoading || isLoading ? (
            <div className="flex h-96 items-center justify-center">
              <p className="text-xl text-app-muted sm:text-2xl">Loading dashboard...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-4">
              <p className="text-base text-red-400 sm:text-lg">{error}</p>
            </div>
          ) : data ? (
            <PlayerDashboardShell data={data} />
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}
