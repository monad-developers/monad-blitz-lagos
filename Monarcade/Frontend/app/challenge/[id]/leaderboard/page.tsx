"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatEther } from "viem";

import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { Leaderboard } from "@/components/player/leaderboard";
import { pageContainerClass } from "@/lib/layout";
import { API_BASE_URL } from "@/lib/monad";

type ChallengeInfo = {
  name: string;
  logoPath?: string;
  prizePool: string;
  started: boolean;
  endTime: number;
};

export default function ChallengeLeaderboardPage() {
  const params = useParams<{ id: string }>();
  const challengeId = params.id;

  const [challenge, setChallenge] = useState<ChallengeInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const res = await fetch(`${API_BASE_URL}/challenge/${challengeId}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();

        const prizePoolWei = data.chain?.prizePool ?? "0";
        const endTimeSec = Number(data.chain?.endTime ?? data.metadata?.endTime ?? 0);
        const started = data.chain?.started ?? data.metadata?.started ?? false;

        if (mounted) {
          setChallenge({
            name: data.metadata?.name ?? `Challenge #${challengeId}`,
            logoPath: data.metadata?.logoPath,
            prizePool: prizePoolWei.toString(),
            started,
            endTime: endTimeSec,
          });
        }
      } catch {
        // leave challenge null
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [challengeId]);

  const nowSec = Math.floor(Date.now() / 1000);
  const isLive = Boolean(challenge?.started && challenge.endTime > nowSec);

  const prizePoolFormatted = challenge
    ? (() => {
        try {
          const val = Number(formatEther(BigInt(challenge.prizePool)));
          return val > 0 ? `${val.toFixed(4)} MON` : "0 MON";
        } catch {
          return "0 MON";
        }
      })()
    : "";

  return (
    <div className="page-typography min-h-screen bg-app text-app">
      <Navbar />

      <main className="w-full py-8 sm:py-10 lg:py-12">
        <section className={`${pageContainerClass} space-y-6`}>
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : challenge ? (
            <>
              <div className="rounded-[2rem] border border-app bg-app-surface p-6 shadow-app sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {challenge.logoPath ? (
                      <img
                        src={challenge.logoPath}
                        alt={challenge.name}
                        className="h-12 w-12 rounded-xl object-cover sm:h-14 sm:w-14"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary sm:h-14 sm:w-14">
                        {challenge.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h1 className="text-xl font-semibold tracking-tight text-app sm:text-2xl">
                        {challenge.name}
                      </h1>
                      <p className="mt-1 text-sm text-app-muted">
                        Prize pool: {prizePoolFormatted}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/challenge/${challengeId}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-5 py-2.5 text-base font-semibold text-white transition-all duration-200 hover:brightness-110 dark:text-[#2f1736] sm:min-h-12 sm:text-lg"
                    style={{ color: "var(--color-white)" }}
                  >
                    Play Now
                  </Link>
                </div>
              </div>

              <div className="rounded-[2rem] border border-app bg-app-surface p-5 shadow-app sm:p-6">
                <p className="mb-4 text-base font-semibold uppercase tracking-[0.14em] text-app-muted sm:text-lg">
                  Leaderboard
                </p>
                <Leaderboard
                  challengeId={challengeId}
                  prizePool={challenge.prizePool}
                  winnerCount={3}
                  isLive={isLive}
                />
              </div>
            </>
          ) : (
            <div className="py-16 text-center text-app-muted">
              Challenge not found.
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
