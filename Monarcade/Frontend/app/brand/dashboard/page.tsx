"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { type Address, createPublicClient, encodeFunctionData, formatEther, http } from "viem";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { BrandDashboardShell } from "@/components/dashboard/brand/brand-dashboard-shell";
import type {
  BrandCampaign,
  BrandDashboardData,
  BrandProfileSummary,
} from "@/components/dashboard/brand/types";
import { pageContainerClass } from "@/lib/layout";
import { useApiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { fetchPublicChallenges } from "@/lib/challenge-source";
import { API_BASE_URL, CHAIN_ID, CONTRACT_ADDRESS, MONAD_TESTNET } from "@/lib/monad";

type ChallengeDetailResponse = {
  metadata: {
    tagline?: string;
    category?: string;
    brandColor?: string;
    duration?: number;
    winnerCount?: number;
    metadataHash?: string;
  };
  chain: {
    scoreCount: string;
    distributed: boolean;
    endTime: string;
    startTime: string;
  };
};

type LeaderboardResponse = {
  entries: Array<{
    rank: number;
    address: string;
    score: number;
    txHash?: string;
  }>;
};

const START_CHALLENGE_ABI = [
  {
    type: "function",
    name: "startChallenge",
    stateMutability: "nonpayable",
    inputs: [{ name: "challengeId", type: "uint256" }],
    outputs: [],
  },
] as const;

const formatMonBalance = (rawBalance: bigint) => {
  const value = Number(formatEther(rawBalance));
  if (!Number.isFinite(value) || value <= 0) return "0 MON";
  if (value < 0.0001) return "<0.0001 MON";
  return `${value.toFixed(4)} MON`;
};

const parsePrizePool = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toCampaignStatus = (campaign: {
  started: boolean;
  endTime?: number;
  distributed?: boolean;
}) => {
  const nowSec = Math.floor(Date.now() / 1000);
  if (!campaign.started) return "pending" as const;
  if (campaign.distributed) return "settled" as const;
  if (campaign.endTime && campaign.endTime <= nowSec) return "ended" as const;
  return "live" as const;
};

export default function BrandDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-app text-app" />}>
      <BrandDashboardPageContent />
    </Suspense>
  );
}

function BrandDashboardPageContent() {
  const { user, logout, isLoading: isAuthLoading, getAuthToken } = useAuth();
  const api = useApiClient();
  const { client: smartWalletClient, getClientForChain } = useSmartWallets();
  const searchParams = useSearchParams();

  const [data, setData] = useState<BrandDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStartingId, setIsStartingId] = useState<number | null>(null);
  const [isRefundingId, setIsRefundingId] = useState<number | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [startSuccessTx, setStartSuccessTx] = useState<string | null>(null);
  const [refundSuccessTx, setRefundSuccessTx] = useState<string | null>(null);
  const getAuthTokenRef = useRef(getAuthToken);
  const apiRef = useRef(api);
  const hasLoadedRef = useRef(false);

  const walletAddress = useMemo(() => (user?.walletAddress ?? "").toLowerCase(), [user?.walletAddress]);
  const refreshKey = searchParams.get("refresh") ?? "";

  useEffect(() => {
    getAuthTokenRef.current = getAuthToken;
    apiRef.current = api;
  }, [getAuthToken, api]);

  useEffect(() => {
    hasLoadedRef.current = false;
  }, [refreshKey, walletAddress]);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      if (!walletAddress) {
        if (!cancelled) {
          setData(null);
          setError("Please sign in to view your brand dashboard.");
          setIsLoading(false);
        }
        return;
      }

      try {
        if (!cancelled) {
          setIsLoading(!hasLoadedRef.current);
          setError(null);
        }

        const publicChallenges = await fetchPublicChallenges();

        // Build a set of addresses that belong to this brand.
        // The frontend wallet (smart wallet) may differ from the backend-stored
        // address (embedded wallet), so we check both.
        const brandAddresses = new Set<string>([walletAddress]);

        const profileResponse = await apiRef.current
          .get<{ profile: BrandProfileSummary & { brandAddress?: string } }>("/brand/profile")
          .catch(() => null);
        const profileBrandAddress = profileResponse?.profile?.brandAddress?.toLowerCase();
        if (profileBrandAddress) {
          brandAddresses.add(profileBrandAddress);
        }

        const mergedById = new Map<number, BrandCampaign>();
        for (const source of publicChallenges.entries ?? []) {
          const entryBrandAddress = (source.brandAddress ?? "").toLowerCase();
          if (!brandAddresses.has(entryBrandAddress)) continue;

          mergedById.set(source.challengeId, {
            challengeId: source.challengeId,
            name: source.name,
            logoPath: source.logoPath,
            prizePool: source.prizePool,
            started: source.started,
            startTime: source.startTime,
            endTime: source.endTime,
            status: "pending",
          });
        }

        const campaigns = Array.from(mergedById.values()).sort((a, b) => b.challengeId - a.challengeId);

        const detailPayloads = await Promise.all(
          campaigns.map(async (campaign) => {
            const [detailResponse, leaderboardResponse] = await Promise.all([
              fetch(`${API_BASE_URL}/challenge/${campaign.challengeId}`, {
                headers: { Accept: "application/json" },
                cache: "no-store",
              }).then((response) => (response.ok ? response.json() : null)).catch(() => null),
              fetch(`${API_BASE_URL}/leaderboard/${campaign.challengeId}?pageSize=3`, {
                headers: { Accept: "application/json" },
                cache: "no-store",
              }).then((response) => (response.ok ? response.json() : null)).catch(() => null),
            ]);

            return {
              detail: detailResponse as ChallengeDetailResponse | null,
              leaderboard: leaderboardResponse as LeaderboardResponse | null,
            };
          }),
        );

        const publicClient = createPublicClient({
          chain: MONAD_TESTNET,
          transport: http(process.env.NEXT_PUBLIC_MONAD_RPC ?? "https://testnet-rpc.monad.xyz"),
        });

        const rawBalance = await publicClient.getBalance({
          address: walletAddress as `0x${string}`,
        });

        const profileLogoPath = profileResponse?.profile?.logoPath;
        const enrichedCampaigns = campaigns.map((campaign, index) => {
          const detail = detailPayloads[index]?.detail;
          const leaderboard = detailPayloads[index]?.leaderboard;

          const nextCampaign: BrandCampaign = {
            ...campaign,
            logoPath: campaign.logoPath ?? profileLogoPath,
            tagline: detail?.metadata.tagline,
            category: detail?.metadata.category,
            brandColor: detail?.metadata.brandColor,
            duration: detail?.metadata.duration,
            winnerCount: detail?.metadata.winnerCount,
            metadataHash: detail?.metadata.metadataHash,
            scoreCount: Number(detail?.chain.scoreCount ?? 0),
            distributed: detail?.chain.distributed ?? false,
            startTime: Number(detail?.chain.startTime ?? campaign.startTime ?? 0) || campaign.startTime,
            endTime: Number(detail?.chain.endTime ?? campaign.endTime ?? 0) || campaign.endTime,
            leaderboard: leaderboard?.entries ?? [],
            status: "pending",
          };
          nextCampaign.status = toCampaignStatus(nextCampaign);
          return nextCampaign;
        });

        const summary = {
          totalCampaigns: enrichedCampaigns.length,
          pendingCampaigns: enrichedCampaigns.filter((campaign) => campaign.status === "pending").length,
          liveCampaigns: enrichedCampaigns.filter((campaign) => campaign.status === "live").length,
          completedCampaigns: enrichedCampaigns.filter((campaign) => campaign.status === "ended" || campaign.status === "settled").length,
          totalPrizePoolMon: enrichedCampaigns.reduce((sum, campaign) => sum + parsePrizePool(campaign.prizePool), 0),
          totalParticipants: enrichedCampaigns.reduce((sum, campaign) => sum + (campaign.scoreCount ?? 0), 0),
          bestScore: Math.max(0, ...enrichedCampaigns.flatMap((campaign) => campaign.leaderboard?.map((entry) => entry.score) ?? [0])),
          walletBalance: formatMonBalance(rawBalance),
        };

        if (!cancelled) {
          setData({
            walletAddress,
            walletPreview: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
            explorerBaseUrl: MONAD_TESTNET.blockExplorers?.default.url ?? "https://testnet.monadexplorer.com",
            profile: profileResponse?.profile ?? null,
            summary,
            campaigns: enrichedCampaigns,
          });
          hasLoadedRef.current = true;
        }
      } catch (loadError) {
        if (!cancelled) {
          setData(null);
          setError(loadError instanceof Error ? loadError.message : "Failed to load brand dashboard.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    if (!isAuthLoading) {
      void loadDashboard();
    }

    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, refreshKey, walletAddress]);

  const handleStartCampaign = async (challengeId: number) => {
    try {
      setStartError(null);
      setStartSuccessTx(null);
      setRefundError(null);
      setRefundSuccessTx(null);
      setIsStartingId(challengeId);

      const contractAddress = CONTRACT_ADDRESS as Address | undefined;
      if (!contractAddress) {
        throw new Error("Missing NEXT_PUBLIC_CONTRACT_ADDRESS in frontend environment.");
      }

      const chainSmartWalletClient = smartWalletClient ?? (await getClientForChain({ id: CHAIN_ID }));
      if (!chainSmartWalletClient) {
        throw new Error("Smart wallet is not ready yet. Please reconnect your Privy wallet and retry.");
      }

      const publicClient = createPublicClient({
        chain: MONAD_TESTNET,
        transport: http(process.env.NEXT_PUBLIC_MONAD_RPC ?? "https://testnet-rpc.monad.xyz"),
      });

      const txHash = await chainSmartWalletClient.sendTransaction({
        to: contractAddress,
        data: encodeFunctionData({
          abi: START_CHALLENGE_ABI,
          functionName: "startChallenge",
          args: [BigInt(challengeId)],
        }),
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });
      await api.post<{ ok: boolean }>(
        "/challenge/start",
        { challengeId },
        { headers: { "x-kyc-verified": "true" } },
      );

      setStartSuccessTx(txHash);
      setData((current) =>
        current
          ? {
              ...current,
              campaigns: current.campaigns.map((campaign) =>
                campaign.challengeId === challengeId
                  ? { ...campaign, started: true, status: "live" }
                  : campaign,
              ),
              summary: {
                ...current.summary,
                pendingCampaigns: Math.max(0, current.summary.pendingCampaigns - 1),
                liveCampaigns: current.summary.liveCampaigns + 1,
              },
            }
          : current,
      );
    } catch (startErr) {
      setStartError(startErr instanceof Error ? startErr.message : "Failed to start campaign.");
    } finally {
      setIsStartingId(null);
    }
  };

  const handleRefundCampaign = async (challengeId: number) => {
    try {
      setRefundError(null);
      setRefundSuccessTx(null);
      setStartError(null);
      setStartSuccessTx(null);
      setIsRefundingId(challengeId);

      const response = await api.post<{ ok: boolean; txHash: string }>(
        `/challenge/refund/${challengeId}`,
        undefined,
        { headers: { "x-kyc-verified": "true" } },
      );

      setRefundSuccessTx(response.txHash);
      setData((current) =>
        current
          ? {
              ...current,
              campaigns: current.campaigns.map((campaign) =>
                campaign.challengeId === challengeId
                  ? { ...campaign, refunded: true }
                  : campaign,
              ),
            }
          : current,
      );
    } catch (refundErr) {
      setRefundError(refundErr instanceof Error ? refundErr.message : "Failed to refund challenge.");
    } finally {
      setIsRefundingId(null);
    }
  };

  return (
    <div className="page-typography min-h-screen bg-app text-app">
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
              <p className="text-xl text-app-muted sm:text-2xl">Loading brand dashboard...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-500/50 bg-red-500/10 p-4">
              <p className="text-base text-red-500 sm:text-lg">{error}</p>
            </div>
          ) : data ? (
            <BrandDashboardShell
              data={data}
              isStartingId={isStartingId}
              isRefundingId={isRefundingId}
              startError={startError}
              refundError={refundError}
              startSuccessTx={startSuccessTx}
              refundSuccessTx={refundSuccessTx}
              onStartCampaign={handleStartCampaign}
              onRefundCampaign={handleRefundCampaign}
              onLogout={logout}
            />
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}
