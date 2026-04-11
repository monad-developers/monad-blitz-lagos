"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/monad";

type LeaderboardEntry = {
  rank: number;
  address: string;
  score: number;
  txHash?: string;
};

type LeaderboardProps = {
  challengeId: string | number;
  prizePool: string;
  winnerCount?: number;
  isLive?: boolean;
};

const SPLITS = [0.5, 0.3, 0.2];
const RANK_MEDALS = ["\u{1F947}", "\u{1F948}", "\u{1F949}"];
const POLL_INTERVAL_MS = 5000;
const EXPLORER_BASE = "https://testnet.monadexplorer.com";

function formatMON(weiStr: string, fraction: number): string {
  try {
    const total = Number(BigInt(weiStr)) / 1e18;
    const amount = total * fraction;
    return amount % 1 === 0 ? `${amount} MON` : `${amount.toFixed(3)} MON`;
  } catch {
    return "?";
  }
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function Leaderboard({
  challengeId,
  prizePool,
  winnerCount = 3,
  isLive = false,
}: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchLeaderboard() {
      try {
        const res = await fetch(
          `${API_BASE_URL}/leaderboard/${challengeId}?pageSize=50`,
          { headers: { Accept: "application/json" }, cache: "no-store" },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (mounted) {
          setEntries(data.entries ?? []);
          setTotal(data.total ?? 0);
          setLoading(false);
          setError(false);
        }
      } catch {
        if (mounted) {
          setLoading(false);
          setError(true);
        }
      }
    }

    fetchLeaderboard();

    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (isLive) {
      intervalId = setInterval(fetchLeaderboard, POLL_INTERVAL_MS);
    }

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [challengeId, isLive]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error && entries.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-app-muted">
        Failed to load leaderboard. Retrying...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-app-muted">
        No players yet. Be the first!
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-2 pb-3">
        <div className="flex items-center gap-2">
          {isLive ? (
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-green-600 dark:text-green-400">
                Live
              </p>
            </>
          ) : null}
          <p className="text-xs text-app-muted">{total} player{total !== 1 ? "s" : ""}</p>
        </div>
        <p className="text-xs text-app-muted">
          Top {winnerCount} share the prize
        </p>
      </div>

      {entries.map((entry) => {
        const isWinner = entry.rank <= winnerCount;
        const split = SPLITS[entry.rank - 1];

        return (
          <div
            key={entry.address}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
              isWinner
                ? "border border-primary/20 bg-primary/5"
                : "bg-app-soft/50"
            }`}
          >
            <span className="w-7 text-center text-base">
              {entry.rank <= 3 ? RANK_MEDALS[entry.rank - 1] : entry.rank}
            </span>

            <div className="min-w-0 flex-1">
              <span className="font-mono text-sm text-app-muted">
                {shortAddr(entry.address)}
              </span>
              {entry.txHash ? (
                <a
                  href={`${EXPLORER_BASE}/tx/${entry.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 text-xs text-primary/60 transition-colors hover:text-primary"
                  title="View on-chain proof"
                >
                  tx
                </a>
              ) : null}
            </div>

            <span className="text-sm font-bold text-app">{entry.score}</span>

            {isWinner && split ? (
              <span className="ml-1 text-xs font-semibold text-primary">
                {formatMON(prizePool, split)}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
