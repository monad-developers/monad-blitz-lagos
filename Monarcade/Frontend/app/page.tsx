"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { ChallengeCard } from "@/components/features/challenge-card";
import { HeroSection } from "@/components/features/hero-section";
import { SectionHeader } from "@/components/ui/section-header";
import type { BackendChallenge } from "@/lib/challenge-source";
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

export default function Home() {
  const { entries, isLoading } = useChallengeFeed();
  const nowSec = useNowSec();

  const { featuredChallenges, upcomingChallenges } = useMemo(() => {
    const live = entries.filter((entry) => entry.started && (entry.endTime ?? 0) > nowSec);
    const pending = entries.filter((entry) => !entry.started);

    const mapToCard = (entry: BackendChallenge, status: "live" | "pending"): Challenge => ({
      id: entry.metadataHash ?? String(entry.challengeId),
      brandName: entry.name,
      brandInitials: getInitials(entry.name),
      brandLogoPath: entry.logoPath,
      status,
      prize: `${entry.prizePool} MON`,
      time: formatChallengeTime(entry.started, entry.endTime),
      buttonLabel: status === "live" ? "Play Now" : "View Details",
    });

    return {
      featuredChallenges: live.slice(0, 6).map((entry) => mapToCard(entry, "live")),
      upcomingChallenges: pending.slice(0, 4).map((entry) => mapToCard(entry, "pending")),
    };
  }, [entries, nowSec]);

  return (
    <div className="min-h-screen bg-app text-app">
      <Navbar />
      <main className="home-snap w-full">
        <section className="w-full">
          <HeroSection />
        </section>

        <section
          id="challenges"
          className="home-section home-section-compact w-full bg-app-soft/35 py-10 sm:py-12 lg:flex lg:min-h-[calc(100svh-8.5rem)] lg:items-center lg:py-12"
        >
          <div className={`${pageContainerClass} w-full`}>
            <div className="pl-5 sm:pl-0 lg:ml-10 xl:ml-14">
              <SectionHeader
                title="Featured Challenges"
                countLabel={`${featuredChallenges.length} live`}
                description="Participate in live rounds and compete for MON rewards."
                compact
              />
            </div>

            <div className="mt-8 grid grid-cols-1 items-stretch gap-6 px-5 sm:px-0 lg:ml-10 lg:grid-cols-12 lg:gap-8 xl:ml-14">
              {isLoading ? (
                <div className="lg:col-span-12">
                  <p className="text-base text-app-muted">Loading challenges...</p>
                </div>
              ) : featuredChallenges.length === 0 ? (
                <div className="lg:col-span-12">
                  <p className="text-base text-app-muted">No live challenges right now.</p>
                </div>
              ) : featuredChallenges.map((challenge, index) => (
                <div key={`${challenge.id}-${index}`} className="lg:col-span-4">
                  <ChallengeCard challenge={challenge} />
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end pr-5 lg:pr-0">
              <Link
                href="/challenge"
                className="inline-flex text-sm font-semibold text-primary transition-all duration-200 hover:translate-x-0.5 hover:brightness-110 sm:text-base xl:text-lg 2xl:text-xl"
              >
                View all -&gt;
              </Link>
            </div>
          </div>
        </section>

        <section id="coming-soon" className="home-section home-section-compact w-full py-10 sm:py-12 lg:pt-24 lg:pb-12">
          <div className={pageContainerClass}>
            <div className="lg:ml-10 xl:ml-14">
              <SectionHeader
                title="Coming Soon"
                countLabel={`${upcomingChallenges.length} pending`}
                description="Fresh campaigns are queued up. Warm up before launch."
                compact
              />
            </div>
            
            <div className="mt-8 grid grid-cols-1 items-stretch gap-6 lg:ml-10 lg:grid-cols-12 lg:gap-8 xl:ml-14">
              {isLoading ? (
                <div className="lg:col-span-12">
                  <p className="text-base text-app-muted">Loading upcoming campaigns...</p>
                </div>
              ) : upcomingChallenges.length === 0 ? (
                <div className="lg:col-span-12">
                  <p className="text-base text-app-muted">No pending campaigns yet.</p>
                </div>
              ) : upcomingChallenges.map((challenge, index) => (
                <div
                  key={`${challenge.id}-${index}`}
                  className={
                    index % 2 === 1
                      ? "lg:col-span-5 lg:col-start-8"
                      : "lg:col-span-5"
                  }
                >
                  <ChallengeCard challenge={challenge} />
                </div>
              ))}
            </div>

            <div id="how-it-works" className="mt-14 rounded-3xl bg-app-soft/28 p-5 sm:mt-16 sm:p-8 lg:mt-20 lg:p-10">
              <SectionHeader
                title="How It Works"
                description="Three quick steps from campaign to reward."
                compact
              />

              <div className="mt-8 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-3 lg:gap-8">
                {[
                  {
                    title: "Brands Launch a Challenge",
                    description:
                      "Brands set the campaign goal, upload the creative assets, and fund the reward pool before the round goes live.",
                  },
                  {
                    title: "Players Engage Through Gameplay",
                    description:
                      "Players join instantly and go through a fast 45-second experience where they spot the brand logo, recall the tagline, and answer a simple brand-related question; it feels like a game, but every action reflects real attention and understanding.",
                  },
                  {
                    title: "Results and Rewards",
                    description:
                      "Players get scored immediately, top performers win rewards, and brands receive clear proof of who engaged, what they remembered, and how well they interacted.",
                  },
                ].map((step, index) => (
                  <article
                    key={step.title}
                    className="rounded-2xl bg-app-surface px-5 py-7 shadow-app transition-all duration-300 hover:-translate-y-1 sm:min-h-[20rem] sm:px-6 sm:py-9 lg:min-h-[24rem] lg:px-7 lg:py-10"
                  >
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-app-muted sm:text-lg lg:text-xl">0{index + 1}</p>
                    <h3 className="mt-3 text-[1.45rem] font-semibold tracking-tight text-app sm:text-[1.8rem] lg:text-[2rem]">{step.title}</h3>
                    <p className="mt-4 text-[1rem] leading-relaxed text-app-muted sm:mt-5 sm:text-[1.35rem] lg:text-[1.5rem]">
                      {step.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
