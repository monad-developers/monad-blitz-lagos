"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
import { ChallengeQR } from "@/components/ui/challenge-qr";
import { type Address, isAddress, parseEther } from "viem";

import { CHAIN_ID } from "@/lib/monad";
import type {
  BrandCampaign,
  BrandCampaignStatus,
  BrandDashboardData,
} from "@/components/dashboard/brand/types";

type BrandDashboardShellProps = {
  data: BrandDashboardData;
  isStartingId: number | null;
  isRefundingId: number | null;
  startError: string | null;
  refundError: string | null;
  startSuccessTx: string | null;
  refundSuccessTx: string | null;
  onStartCampaign: (challengeId: number) => Promise<void> | void;
  onRefundCampaign: (challengeId: number) => Promise<void> | void;
  onLogout: () => Promise<void> | void;
};

const statusLabelMap: Record<BrandCampaignStatus, string> = {
  pending: "Pending setup",
  live: "Live now",
  ended: "Ended",
  settled: "Settled",
};

const statusToneMap: Record<BrandCampaignStatus, string> = {
  pending: "bg-amber-500/12 text-amber-700 dark:text-amber-200",
  live: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-200",
  ended: "bg-app-soft text-app",
  settled: "bg-primary/12 text-primary",
};

const summaryCardDefinitions = [
  { key: "totalCampaigns", label: "Campaigns", helper: "All brand challenge records" },
  { key: "liveCampaigns", label: "Live Now", helper: "Challenges currently accepting players" },
  { key: "totalParticipants", label: "Participants", helper: "On-chain submissions across your campaigns" },
  {
    key: "totalPrizePoolMon",
    label: "Prize Pool",
    helper: "Total MON committed across campaigns",
    format: (value: number) => `${formatCompactNumber(value)} MON`,
  },
  { key: "bestScore", label: "Top Score", helper: "Best player result captured on-chain" },
  { key: "walletBalance", label: "Wallet Balance", helper: "Live balance from your Privy wallet" },
] as const;

const tableColumnClass = "px-4 py-3 align-top text-sm sm:text-base";
const inputClassName =
  "w-full rounded-2xl border border-app/45 bg-app-surface px-4 py-3 text-base text-app outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10 sm:text-lg";

const formatCompactNumber = (value: number) => {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
};

const formatDateTime = (unixSeconds?: number) => {
  if (!unixSeconds) {
    return "Not scheduled";
  }

  return new Date(unixSeconds * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatDuration = (duration?: number) => {
  if (!duration) {
    return "Flexible";
  }

  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
};

const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

const getCampaignTimingLabel = (campaign: BrandCampaign) => {
  if (campaign.status === "pending") {
    return "Waiting for brand launch";
  }

  if (campaign.status === "live") {
    return `Ends ${formatDateTime(campaign.endTime)}`;
  }

  if (campaign.endTime) {
    return `Ended ${formatDateTime(campaign.endTime)}`;
  }

  return "Lifecycle recorded on-chain";
};

const getCampaignLogoPath = (campaign: BrandCampaign, profile: BrandDashboardData["profile"]) =>
  campaign.logoPath ?? profile?.logoPath;

const getRefundEligibility = (campaign: BrandCampaign) => {
  if (campaign.refunded || campaign.status !== "ended" || (campaign.scoreCount ?? 0) > 0 || !campaign.endTime) {
    return { eligible: false, helper: null as string | null };
  }

  const refundTime = campaign.endTime + 48 * 60 * 60;
  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec >= refundTime) {
    return {
      eligible: true,
      helper: "No players joined. Refund is available now.",
    };
  }

  return {
    eligible: false,
    helper: `Refund unlocks after ${formatDateTime(refundTime)} if no players join.`,
  };
};

function SummaryCards({ data }: { data: BrandDashboardData }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {summaryCardDefinitions.map((card) => {
        const rawValue = data.summary[card.key];
        const value =
          typeof rawValue === "number"
            ? "format" in card && card.format
              ? card.format(rawValue)
              : formatCompactNumber(rawValue)
            : rawValue;

        return (
          <article key={card.key} className="rounded-[1.6rem] border border-app/55 bg-app-surface p-5 shadow-app">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">{card.label}</p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-app sm:text-4xl">{value}</p>
            <p className="mt-2 text-sm text-app-muted sm:text-base">{card.helper}</p>
          </article>
        );
      })}
    </div>
  );
}

function CampaignCard({
  campaign,
  profile,
  isStarting,
  isRefunding,
  onStartCampaign,
  onRefundCampaign,
}: {
  campaign: BrandCampaign;
  profile: BrandDashboardData["profile"];
  isStarting: boolean;
  isRefunding: boolean;
  onStartCampaign: (challengeId: number) => Promise<void> | void;
  onRefundCampaign: (challengeId: number) => Promise<void> | void;
}) {
  const [linkCopyState, setLinkCopyState] = useState<"idle" | "copied">("idle");
  const challengeIdentifier = String(campaign.challengeId);
  const challengeLink =
    typeof window === "undefined"
      ? `/challenge/${challengeIdentifier}`
      : `${window.location.origin}/challenge/${challengeIdentifier}`;

  const handleCopyChallengeLink = async () => {
    try {
      await navigator.clipboard.writeText(challengeLink);
      setLinkCopyState("copied");
      window.setTimeout(() => setLinkCopyState("idle"), 1800);
    } catch {
      setLinkCopyState("idle");
    }
  };
  const refundState = getRefundEligibility(campaign);
  const logoPath = getCampaignLogoPath(campaign, profile);

  return (
    <article className="rounded-[1.6rem] border border-app/50 bg-app-surface p-5 shadow-app sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            {logoPath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoPath}
                alt={`${campaign.name} logo`}
                className="h-14 w-14 rounded-2xl border border-app/40 bg-app-soft object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-app/40 bg-app-soft text-sm font-bold uppercase text-app-muted">
                {campaign.name.slice(0, 2)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-2xl font-semibold tracking-tight text-app">{campaign.name}</h3>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${statusToneMap[campaign.status]}`}>
                  {statusLabelMap[campaign.status]}
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-app-muted sm:text-base">
                {campaign.tagline || "Interactive brand challenge designed to improve recall, attention, and measurable engagement."}
              </p>
            </div>
          </div>
        </div>

        {campaign.status === "pending" ? (
          <button
            type="button"
            onClick={() => void onStartCampaign(campaign.challengeId)}
            disabled={isStarting}
            className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-2xl bg-primary px-6 py-3.5 text-lg font-semibold text-white shadow-app transition hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            style={{ color: "var(--color-white)" }}
          >
            {isStarting ? "Starting..." : "Start Challenge"}
          </button>
        ) : campaign.status === "live" ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => void handleCopyChallengeLink()}
              className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-2xl bg-app-soft px-5 py-3 text-base font-semibold text-app transition hover:bg-app"
            >
              {linkCopyState === "copied" ? "Challenge link copied" : "Copy challenge link"}
            </button>
            <ChallengeQR challengeId={campaign.challengeId} size={100} />
          </div>
        ) : refundState.eligible ? (
          <button
            type="button"
            onClick={() => void onRefundCampaign(campaign.challengeId)}
            disabled={isRefunding}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-2xl bg-app-soft px-5 py-3 text-base font-semibold text-app transition hover:bg-app disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRefunding ? "Processing refund..." : "Refund challenge"}
          </button>
        ) : (
          <span className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-app-soft px-5 py-3 text-base font-semibold text-app-muted">
            {campaign.refunded ? "Refunded" : "Campaign closed"}
          </span>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl bg-app-soft/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">Prize</p>
          <p className="mt-2 text-xl font-bold text-app">{campaign.prizePool} MON</p>
        </div>
        <div className="rounded-2xl bg-app-soft/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">Entries</p>
          <p className="mt-2 text-xl font-bold text-app">{formatCompactNumber(campaign.scoreCount ?? 0)}</p>
        </div>
        <div className="rounded-2xl bg-app-soft/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">Winners</p>
          <p className="mt-2 text-xl font-bold text-app">{campaign.winnerCount ?? 3}</p>
        </div>
        <div className="rounded-2xl bg-app-soft/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">Duration</p>
          <p className="mt-2 text-xl font-bold text-app">{formatDuration(campaign.duration)}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-app">Lifecycle</p>
          <p className="text-sm text-app-muted sm:text-base">{getCampaignTimingLabel(campaign)}</p>
          {campaign.status === "ended" && refundState.helper ? (
            <p className="mt-1 text-sm text-app-muted sm:text-base">{refundState.helper}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-app-muted sm:text-base">
          {campaign.category ? <span className="rounded-full bg-app-soft px-3 py-1">{campaign.category}</span> : null}
          {campaign.metadataHash ? <span className="rounded-full bg-app-soft px-3 py-1">Hash committed</span> : null}
          {campaign.distributed ? <span className="rounded-full bg-app-soft px-3 py-1">Rewards distributed</span> : null}
          {campaign.refunded ? <span className="rounded-full bg-app-soft px-3 py-1">Refunded</span> : null}
        </div>
      </div>

      {campaign.leaderboard && campaign.leaderboard.length > 0 ? (
        <div className="mt-5 rounded-2xl border border-app/45 bg-app-soft/50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">Top performers</p>
              <p className="mt-1 text-lg font-semibold text-app">Latest leaderboard snapshot</p>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {campaign.leaderboard.slice(0, 3).map((entry) => (
              <div
                key={`${campaign.challengeId}-${entry.rank}-${entry.address}`}
                className="flex items-center justify-between rounded-2xl bg-app-surface px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-app sm:text-base">#{entry.rank} {formatAddress(entry.address)}</p>
                  <p className="text-xs uppercase tracking-[0.12em] text-app-muted sm:text-sm">Verified on-chain</p>
                </div>
                <p className="text-lg font-bold text-app sm:text-xl">{entry.score}/300</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function CampaignTable({
  campaigns,
  profile,
}: {
  campaigns: BrandCampaign[];
  profile: BrandDashboardData["profile"];
}) {
  if (!campaigns.length) {
    return (
      <div className="rounded-[1.6rem] border border-dashed border-app/45 bg-app-soft/40 p-8 text-center">
        <p className="text-xl font-semibold text-app">No campaigns created yet.</p>
        <p className="mt-2 text-app-muted">
          Move through onboarding to save your brand profile, lock the prize pool, and launch your first challenge.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-app/50 bg-app-surface shadow-app">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead className="bg-app-soft/75">
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-app-muted sm:text-sm">
              <th className={tableColumnClass}>Campaign</th>
              <th className={tableColumnClass}>Status</th>
              <th className={tableColumnClass}>Prize</th>
              <th className={tableColumnClass}>Players</th>
              <th className={tableColumnClass}>Next milestone</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr key={campaign.challengeId} className="border-t border-app/35">
                <td className={tableColumnClass}>
                  <div className="flex items-center gap-3">
                    {getCampaignLogoPath(campaign, profile) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getCampaignLogoPath(campaign, profile)!}
                        alt={`${campaign.name} logo`}
                        className="h-11 w-11 rounded-xl border border-app/35 bg-app-soft object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-app/35 bg-app-soft text-xs font-bold uppercase text-app-muted">
                        {campaign.name.slice(0, 2)}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-app">{campaign.name}</p>
                      <p className="mt-1 text-app-muted">{campaign.category || "Brand challenge"} • #{campaign.challengeId}</p>
                    </div>
                  </div>
                </td>
                <td className={tableColumnClass}>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${statusToneMap[campaign.status]}`}>
                    {statusLabelMap[campaign.status]}
                  </span>
                </td>
                <td className={tableColumnClass}>{campaign.prizePool} MON</td>
                <td className={tableColumnClass}>{formatCompactNumber(campaign.scoreCount ?? 0)}</td>
                <td className={tableColumnClass}>{getCampaignTimingLabel(campaign)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WalletPanel({
  walletPreview,
  walletAddress,
  walletBalance,
  explorerBaseUrl,
  onLogout,
}: {
  walletPreview: string;
  walletAddress: string;
  walletBalance: string;
  explorerBaseUrl: string;
  onLogout: () => Promise<void> | void;
}) {
  const { client: smartWalletClient, getClientForChain } = useSmartWallets();
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [withdrawTo, setWithdrawTo] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawTxHash, setWithdrawTxHash] = useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("idle");
    }
  };

  const handleWithdraw = async () => {
    setWithdrawError(null);
    setWithdrawTxHash(null);

    if (!isAddress(withdrawTo.trim())) {
      setWithdrawError("Enter a valid recipient wallet address.");
      return;
    }

    if (!withdrawAmount || Number(withdrawAmount) <= 0) {
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
        to: withdrawTo.trim() as Address,
        value: parseEther(withdrawAmount),
      });

      setWithdrawTxHash(txHash);
      setWithdrawAmount("");
    } catch (error) {
      setWithdrawError(error instanceof Error ? error.message : "Failed to submit withdrawal transaction.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <aside className="rounded-[1.8rem] border border-app/55 bg-app-surface p-5 shadow-app sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">Brand wallet</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-app">{walletBalance}</h2>
        </div>
        <button
          type="button"
          onClick={() => void onLogout()}
          className="rounded-2xl border border-app/35 px-4 py-2 text-sm font-semibold text-app transition hover:bg-app-soft sm:text-base"
        >
          Logout
        </button>
      </div>

      <div className="mt-5 rounded-2xl bg-app-soft/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">Connected address</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-semibold text-app">{walletPreview}</p>
            <p className="truncate text-xs text-app-muted sm:text-sm">{walletAddress}</p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-xl bg-app-surface px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-app transition hover:bg-app sm:text-sm"
          >
            {copyState === "copied" ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <a
          href={`${explorerBaseUrl}/address/${walletAddress}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-4 py-3 text-base font-semibold text-white transition hover:brightness-110"
          style={{ color: "var(--color-white)" }}
        >
          View in Monad Explorer
        </a>
      </div>

      <div className="mt-5 rounded-2xl border border-app/35 p-4">
        <p className="text-sm font-semibold text-app">Transfer MON</p>
        <p className="mt-1 text-sm text-app-muted">Move campaign funds or treasury balance from your embedded wallet.</p>
        <div className="mt-4 space-y-3">
          <input
            type="text"
            value={withdrawTo}
            onChange={(event) => setWithdrawTo(event.target.value)}
            placeholder="Recipient wallet address"
            className={inputClassName}
          />
          <input
            type="number"
            min="0"
            step="0.0001"
            value={withdrawAmount}
            onChange={(event) => setWithdrawAmount(event.target.value)}
            placeholder="Amount in MON"
            className={inputClassName}
          />
          <button
            type="button"
            onClick={() => void handleWithdraw()}
            disabled={isWithdrawing}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-2xl bg-app-soft px-4 py-3 text-base font-semibold text-app transition hover:bg-app disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isWithdrawing ? "Submitting..." : "Send transfer"}
          </button>
          {withdrawError ? <p className="text-sm text-red-500">{withdrawError}</p> : null}
          {withdrawTxHash ? (
            <a
              href={`${explorerBaseUrl}/tx/${withdrawTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="break-all text-sm font-semibold text-primary hover:brightness-110"
            >
              View transaction {withdrawTxHash}
            </a>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

export function BrandDashboardShell({
  data,
  isStartingId,
  isRefundingId,
  startError,
  refundError,
  startSuccessTx,
  refundSuccessTx,
  onStartCampaign,
  onRefundCampaign,
  onLogout,
}: BrandDashboardShellProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "campaigns" | "ops">("overview");

  const liveCampaigns = useMemo(
    () => data.campaigns.filter((campaign) => campaign.status === "live"),
    [data.campaigns],
  );
  const pendingCampaigns = useMemo(
    () => data.campaigns.filter((campaign) => campaign.status === "pending"),
    [data.campaigns],
  );
  const completedCampaigns = useMemo(
    () => data.campaigns.filter((campaign) => campaign.status === "ended" || campaign.status === "settled"),
    [data.campaigns],
  );

  return (
    <div className="min-h-screen space-y-5 pb-10 sm:space-y-6 lg:space-y-8 lg:pb-14">
      <header className="relative overflow-hidden rounded-[2rem] border border-app/60 bg-app-surface p-5 shadow-app sm:p-6 lg:p-7">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--color-primary)_18%,transparent),transparent_55%)]" />
        <div className="pointer-events-none absolute bottom-[-5rem] left-[-4rem] h-52 w-52 rounded-full bg-secondary/10 blur-3xl" />

        <div className="relative grid gap-5 xl:grid-cols-[1.25fr_0.75fr] xl:items-stretch">
          <div className="flex flex-col justify-between rounded-[1.8rem] border border-app/45 bg-app-surface/70 p-5 sm:p-6">
            <div className="inline-flex rounded-full bg-app-soft/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-app-muted sm:text-sm">
              Brand command center
            </div>
            <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight text-app sm:text-5xl lg:text-[3.4rem]">
              Build recall, fund challenges, and manage campaign outcomes from one place.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-app-muted sm:text-lg">
              The Brand dashboard is built around the product lifecycle in the architecture: create the challenge,
              fund the prize pool, start it when ready, and monitor attention, participation, and on-chain proof.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/brand/onboard"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary px-6 py-3 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:brightness-110 sm:text-lg"
                style={{ color: "var(--color-white)" }}
              >
                Create new campaign
              </Link>
              <button
                type="button"
                onClick={() => setActiveTab("campaigns")}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-app-soft px-6 py-3 text-base font-semibold text-app transition hover:bg-app sm:text-lg"
              >
                Review pipeline
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-[1.8rem] border border-app/45 bg-app-soft/70 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">Brand profile</p>
              <div className="mt-4 flex items-center gap-4">
                {data.profile?.logoPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.profile.logoPath}
                    alt={`${data.profile.companyName} logo`}
                    className="h-18 w-18 rounded-2xl border border-app/40 bg-app-surface object-cover"
                  />
                ) : (
                  <div className="flex h-18 w-18 items-center justify-center rounded-2xl border border-app/40 bg-app-surface text-xl font-bold uppercase text-app-muted">
                    {data.profile?.companyName?.slice(0, 2) || "BR"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-2xl font-semibold tracking-tight text-app">
                    {data.profile?.companyName || "Set up your brand profile"}
                  </p>
                  <p className="mt-1 text-sm text-app-muted sm:text-base">
                    {data.profile?.tagline || "Add your brand story, tagline, and creative assets during onboarding."}
                  </p>
                  {data.profile?.website ? (
                    <a
                      href={data.profile.website}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex text-sm font-semibold text-primary transition hover:brightness-110"
                    >
                      Visit website
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-app/45 bg-app-surface/85 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">Category</p>
                <p className="mt-2 text-base font-semibold text-app sm:text-lg">{data.profile?.category || "Not set"}</p>
              </div>
              <div className="rounded-[1.5rem] border border-app/45 bg-app-surface/85 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">Wallet</p>
                <p className="mt-2 text-base font-semibold text-app sm:text-lg">{data.walletPreview}</p>
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-app/45 bg-app-surface/85 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">Fact prompt</p>
              <p className="mt-2 text-sm leading-relaxed text-app sm:text-base">
                {data.profile?.brandFact || "No fact prompt added yet. Add one in onboarding to power the knowledge round."}
              </p>
            </div>
          </div>
        </div>
      </header>

      {startError ? (
        <div className="rounded-[1.6rem] border border-red-500/30 bg-red-500/10 p-4 text-red-600">
          {startError}
        </div>
      ) : null}
      {refundError ? (
        <div className="rounded-[1.6rem] border border-red-500/30 bg-red-500/10 p-4 text-red-600">
          {refundError}
        </div>
      ) : null}
      {startSuccessTx ? (
        <div className="rounded-[1.6rem] border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-200">
          Campaign launched successfully.
          {" "}
          <a
            href={`${data.explorerBaseUrl}/tx/${startSuccessTx}`}
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline-offset-2 hover:underline"
          >
            View transaction
          </a>
        </div>
      ) : null}
      {refundSuccessTx ? (
        <div className="rounded-[1.6rem] border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-200">
          Refund completed successfully.
          {" "}
          <a
            href={`${data.explorerBaseUrl}/tx/${refundSuccessTx}`}
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline-offset-2 hover:underline"
          >
            View transaction
          </a>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {[
          { key: "overview", label: "Overview" },
          { key: "campaigns", label: "Campaign pipeline" },
          { key: "ops", label: "Wallet & operations" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as "overview" | "campaigns" | "ops")}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition sm:text-base ${
              activeTab === tab.key ? "bg-primary text-white" : "bg-app-surface text-app-muted hover:text-app"
            }`}
            style={activeTab === tab.key ? { color: "var(--color-white)" } : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" ? (
        <>
          <SummaryCards data={data} />
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <div className="rounded-[1.8rem] border border-app/55 bg-app-surface p-5 shadow-app sm:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">Go live</p>
                    <h2 className="mt-1 text-3xl font-semibold tracking-tight text-app">Pending campaigns</h2>
                  </div>
                  <p className="text-sm text-app-muted sm:text-base">
                    Review each campaign, confirm the prize pool and timing, then launch when you are ready for players to join.
                  </p>
                </div>

                <div className="mt-5 space-y-4">
                  {pendingCampaigns.length ? pendingCampaigns.map((campaign) => (
                    <CampaignCard
                      key={campaign.challengeId}
                      campaign={campaign}
                      profile={data.profile}
                      isStarting={isStartingId === campaign.challengeId}
                      isRefunding={isRefundingId === campaign.challengeId}
                      onStartCampaign={onStartCampaign}
                      onRefundCampaign={onRefundCampaign}
                    />
                  )) : (
                    <div className="rounded-[1.4rem] border border-dashed border-app/45 bg-app-soft/40 p-7">
                      <p className="text-xl font-semibold text-app">Your launch queue is clear.</p>
                      <p className="mt-2 text-app-muted">
                        Create a new campaign when you are ready to upload creative, define the prize pool, and prepare the on-chain deposit.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[1.8rem] border border-app/55 bg-app-surface p-5 shadow-app sm:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">Monitor</p>
                    <h2 className="mt-1 text-3xl font-semibold tracking-tight text-app">Live campaigns</h2>
                  </div>
                  <p className="text-sm text-app-muted sm:text-base">
                    Use score volume, leaderboard movement, and deadline state to manage performance in real time.
                  </p>
                </div>

                <div className="mt-5 space-y-4">
                  {liveCampaigns.length ? liveCampaigns.map((campaign) => (
                    <CampaignCard
                      key={campaign.challengeId}
                      campaign={campaign}
                      profile={data.profile}
                      isStarting={false}
                      isRefunding={false}
                      onStartCampaign={onStartCampaign}
                      onRefundCampaign={onRefundCampaign}
                    />
                  )) : (
                    <div className="rounded-[1.4rem] border border-dashed border-app/45 bg-app-soft/40 p-7">
                      <p className="text-xl font-semibold text-app">Nothing is live right now.</p>
                      <p className="mt-2 text-app-muted">
                        Once a challenge is started, this section becomes your operating view for current player activity.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <WalletPanel
                walletPreview={data.walletPreview}
                walletAddress={data.walletAddress}
                walletBalance={data.summary.walletBalance}
                explorerBaseUrl={data.explorerBaseUrl}
                onLogout={onLogout}
              />

              <section className="rounded-[1.8rem] border border-app/55 bg-app-surface p-5 shadow-app sm:p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">Responsibilities</p>
                <h2 className="mt-1 text-3xl font-semibold tracking-tight text-app">Brand dashboard jobs</h2>
                <div className="mt-5 space-y-3">
                  {[
                    "Prepare brand metadata that becomes the source for the player intro and memory rounds.",
                    "Deposit MON, register the challenge, and start it only when timing and creative are ready.",
                    "Track player participation, leaderboard movement, and completion state from one place.",
                    "Use on-chain records as proof of attention, recall, and engagement quality.",
                  ].map((item) => (
                    <div key={item} className="rounded-2xl bg-app-soft/70 px-4 py-4">
                      <p className="text-sm leading-relaxed text-app sm:text-base">{item}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </section>
        </>
      ) : null}

      {activeTab === "campaigns" ? (
        <section className="space-y-5">
          <div className="rounded-[1.8rem] border border-app/55 bg-app-surface p-5 shadow-app sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">Pipeline</p>
                <h2 className="mt-1 text-3xl font-semibold tracking-tight text-app">Campaign portfolio</h2>
              </div>
              <p className="text-sm text-app-muted sm:text-base">
                Every campaign moves through pending, live, ended, and distribution states based on the architecture lifecycle.
              </p>
            </div>
            <div className="mt-5">
              <CampaignTable campaigns={data.campaigns} profile={data.profile} />
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-[1.8rem] border border-app/55 bg-app-surface p-5 shadow-app sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">Completed</p>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight text-app">Recent finished campaigns</h3>
              <div className="mt-5 space-y-4">
                {completedCampaigns.length ? completedCampaigns.slice(0, 3).map((campaign) => (
                  <CampaignCard
                    key={campaign.challengeId}
                    campaign={campaign}
                    profile={data.profile}
                    isStarting={false}
                    isRefunding={isRefundingId === campaign.challengeId}
                    onStartCampaign={onStartCampaign}
                    onRefundCampaign={onRefundCampaign}
                  />
                )) : (
                  <p className="text-app-muted">Finished campaigns will appear here after the first challenge completes.</p>
                )}
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-app/55 bg-app-surface p-5 shadow-app sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">Launch readiness</p>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight text-app">Operational checklist</h3>
              <div className="mt-5 space-y-3">
                {[
                  {
                    label: "Brand intro assets",
                    detail: data.profile?.logoPath ? "Logo is uploaded and profile data exists." : "Upload logo and define profile metadata.",
                    complete: Boolean(data.profile?.logoPath),
                  },
                  {
                    label: "Campaign drafts",
                    detail: pendingCampaigns.length ? `${pendingCampaigns.length} pending challenge${pendingCampaigns.length === 1 ? "" : "s"} ready to start.` : "No pending challenge is waiting for launch.",
                    complete: pendingCampaigns.length > 0,
                  },
                  {
                    label: "Live proof",
                    detail: liveCampaigns.length ? `${liveCampaigns.length} campaign${liveCampaigns.length === 1 ? "" : "s"} currently collecting verifiable submissions.` : "Start a challenge to begin capturing on-chain performance.",
                    complete: liveCampaigns.length > 0,
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-app-soft/70 px-4 py-4">
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full ${
                          item.complete ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-200" : "bg-app text-app-muted"
                        }`}
                      >
                        {item.complete ? "✓" : "•"}
                      </span>
                      <div>
                        <p className="font-semibold text-app">{item.label}</p>
                        <p className="mt-1 text-sm text-app-muted sm:text-base">{item.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "ops" ? (
        <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <WalletPanel
            walletPreview={data.walletPreview}
            walletAddress={data.walletAddress}
            walletBalance={data.summary.walletBalance}
            explorerBaseUrl={data.explorerBaseUrl}
            onLogout={onLogout}
          />

          <div className="rounded-[1.8rem] border border-app/55 bg-app-surface p-5 shadow-app sm:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">Operating model</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight text-app">How the brand side works</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {[
                {
                  title: "Prepare",
                  body: "Upload the logo, set the tagline, optional fact, category, and prize defaults. This metadata shapes the player intro and the recall tests.",
                },
                {
                  title: "Fund",
                  body: "Prize pool is attached to the on-chain create transaction as `msg.value`, with funds isolated per challenge.",
                },
                {
                  title: "Launch",
                  body: "Starting a challenge flips it from pending into the active leaderboard window. Players can now join while the contract tracks lifecycle state.",
                },
                {
                  title: "Measure",
                  body: "Leaderboard entries and score counts become the proof layer for attention, recall, and engagement quality.",
                },
              ].map((item) => (
                <article key={item.title} className="rounded-2xl bg-app-soft/70 p-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">{item.title}</p>
                  <p className="mt-3 text-sm leading-relaxed text-app sm:text-base">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
