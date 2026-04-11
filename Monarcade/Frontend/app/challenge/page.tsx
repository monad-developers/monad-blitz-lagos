"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChallengeCard } from "@/components/features/challenge-card";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { SectionHeader } from "@/components/ui/section-header";
import type { Challenge } from "@/lib/challenges";
import { pageContainerClass } from "@/lib/layout";
import { useChallengeFeed } from "@/lib/use-challenge-feed";
import { useNowSec } from "@/lib/use-now-sec";

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((word) => word.trim()[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);

const formatChallengeTime = (started: boolean, endTime?: number) => {
  if (!started) {
    return "Starts soon";
  }

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


export default function ChallengePage() {
  const { entries, isLoading } = useChallengeFeed();
  const nowSec = useNowSec();

  const cards = useMemo<Challenge[]>(
    () =>
      entries.map((entry) => {
        const isLive = entry.started && (entry.endTime ?? 0) > nowSec;

        return {
          id: String(entry.challengeId),
          brandName: entry.name,
          brandInitials: getInitials(entry.name),
          brandLogoPath: entry.logoPath,
          status: isLive ? "live" : "pending",
          prize: `${entry.prizePool} MON`,
          time: formatChallengeTime(entry.started, entry.endTime),
          buttonLabel: isLive ? "Play Now" : "View Details",
        };
      }),
    [entries, nowSec],
  );

  return (
    <div className="page-typography player-dashboard-typography min-h-screen bg-app text-app">
      <Navbar />

      <main className="w-full py-8 sm:py-10 lg:py-12">
        <section className={pageContainerClass}>
          <div className="mb-6">
            <Link
              href="/player/dashboard"
              className="inline-flex items-center gap-2 text-sm text-app-muted transition-colors duration-200 hover:text-app sm:text-base"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
          </div>

          <SectionHeader
            title="All Challenges"
            titleClassName="text-[2.8rem] sm:text-[3.5rem] lg:text-[3.9rem] xl:text-[4.35rem] 2xl:text-[4.9rem]"
            countLabel={`${cards.filter((item) => item.status === "live").length} live`}
            description="Browse every active Monarcade challenge currently open to players."
          />

          <div className="mt-8 grid grid-cols-1 items-stretch gap-4 sm:gap-6 lg:grid-cols-12 lg:auto-rows-fr lg:gap-8">
            {isLoading ? (
              <div className="lg:col-span-12">
                <p className="text-base text-app-muted">Loading challenges...</p>
              </div>
            ) : cards.length === 0 ? (
              <div className="lg:col-span-12">
                <p className="text-base text-app-muted">No challenges available yet.</p>
              </div>
            ) : cards.map((challenge, index) => (
              <div key={`${challenge.id}-${index}`} className="lg:col-span-4">
                <ChallengeCard challenge={challenge} />
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
