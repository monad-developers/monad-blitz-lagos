"use client";

import Link from "next/link";
import type { ChallengeDetails } from "@/lib/challenge-details";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { pageContainerClass } from "@/lib/layout";
import { useAuth } from "@/lib/auth";

type ChallengeBriefingScreenProps = {
  challenge: ChallengeDetails;
};

export function ChallengeBriefingScreen({ challenge }: ChallengeBriefingScreenProps) {
  const { isAuthenticated, login, isLoading } = useAuth();

  return (
    <div className="page-typography min-h-screen bg-app text-app">
      <Navbar />

      <main className="w-full py-8 sm:py-10 lg:py-12">
        <section className={`${pageContainerClass} space-y-6 sm:space-y-8`}>

          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/challenge"
              className="inline-flex items-center gap-2 text-sm text-app-muted transition-colors duration-200 hover:text-app"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              All Challenges
            </Link>

            {challenge.heroLabel ? (
              <span className="rounded-full bg-app-soft px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-app-muted">
                {challenge.heroLabel}
              </span>
            ) : null}
          </div>

          {/* Hero — Prize + CTA */}
          <section className="relative overflow-hidden rounded-[2rem] border border-app bg-app-surface p-6 shadow-app sm:p-8">
            <div
              className="pointer-events-none absolute inset-0 opacity-90"
              aria-hidden="true"
              style={{
                background:
                  "radial-gradient(circle at 12% 12%, color-mix(in srgb, var(--color-primary) 20%, transparent), transparent 46%), radial-gradient(circle at 88% 0%, color-mix(in srgb, var(--color-secondary) 18%, transparent), transparent 38%)",
              }}
            />
            <div className="relative flex flex-wrap items-center justify-between gap-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-app-muted">Challenge Prize</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-app sm:text-4xl">
                  {challenge.reward.headline}
                </p>
                <p className="mt-2 text-sm text-app-muted">{challenge.reward.details}</p>
              </div>

              {isLoading ? (
                <div className="h-12 w-36 animate-pulse rounded-2xl bg-app-soft" />
              ) : challenge.status === "pending" ? (
                <div className="flex flex-col items-end gap-2">
                  <span className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-app-soft px-7 py-3 text-lg font-semibold text-app-muted sm:min-h-14 sm:text-xl">
                    Starting Soon
                  </span>
                  {isAuthenticated ? (
                    <Link
                      href="/brand/dashboard"
                      className="text-xs text-primary underline hover:brightness-110"
                    >
                      Brand owner? Start it from dashboard
                    </Link>
                  ) : null}
                </div>
              ) : challenge.status === "ended" ? (
                <Link
                  href={`/challenge/${challenge.id}/leaderboard`}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-app-soft px-7 py-3 text-lg font-semibold text-app-muted transition-all duration-200 hover:bg-app sm:min-h-14 sm:text-xl"
                >
                  View Results
                </Link>
              ) : isAuthenticated ? (
                <Link
                  href={challenge.redirectPath}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary px-7 py-3 text-lg font-semibold text-white transition-all duration-200 hover:brightness-110 dark:text-[#2f1736] sm:min-h-14 sm:text-xl"
                  style={{ color: "var(--color-white)" }}
                >
                  Play Now
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => login()}
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary px-7 py-3 text-lg font-semibold text-white transition-all duration-200 hover:brightness-110 dark:text-[#2f1736] sm:min-h-14 sm:text-xl"
                  style={{ color: "var(--color-white)" }}
                >
                  Sign In to Play
                </button>
              )}
            </div>
          </section>

          {/* How It Works — 3 Rounds */}
          <section className="rounded-[2rem] border border-app bg-app-surface p-5 shadow-app sm:p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">How it works</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-app sm:text-3xl">
              Five rounds. Speed is everything.
            </h2>
            <p className="mt-2 text-sm text-app-muted">
              Max score: 300 points. Every round is speed-weighted — faster correct answers earn more.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {challenge.rounds.map((round, index) => (
                <article key={round.title} className="rounded-[1.75rem] border border-app bg-app p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white dark:text-[#2f1736]" style={{ color: "var(--color-white)" }}>
                      {index + 1}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-app-muted">{round.duration}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-app">{round.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-app-muted">{round.description}</p>
                </article>
              ))}
            </div>
          </section>

          {/* Strategy Tips */}
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
            <div className="rounded-[2rem] border border-app bg-app-surface p-5 shadow-app sm:p-7 lg:col-span-7">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">Strategy</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-app sm:text-3xl">
                Tips to top the leaderboard
              </h2>

              <div className="mt-5 space-y-3">
                {challenge.instructions.map((tip, index) => (
                  <div key={index} className="flex items-start gap-3 rounded-2xl bg-app px-4 py-3">
                    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-soft text-xs font-bold text-app-muted">
                      {index + 1}
                    </span>
                    <p className="text-sm leading-relaxed text-app-muted">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            <aside className="space-y-5 lg:col-span-5">
              {/* Why Speed Matters */}
              <div className="rounded-[2rem] border border-app bg-app-surface p-5 shadow-app sm:p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">Why speed matters</p>
                <div className="mt-3 space-y-3">
                  <div className="rounded-2xl bg-app px-4 py-3">
                    <p className="text-sm font-semibold text-app">Speed-weighted scoring</p>
                    <p className="mt-1 text-xs text-app-muted">
                      All five rounds reward speed. A correct answer in 1 second scores higher than the same answer in 10 seconds.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-app px-4 py-3">
                    <p className="text-sm font-semibold text-app">On-chain in ~400ms</p>
                    <p className="mt-1 text-xs text-app-muted">
                      Your score settles on Monad blockchain with sub-second finality. Every result is verifiable and permanent.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-app px-4 py-3">
                    <p className="text-sm font-semibold text-app">Top scorers win</p>
                    <p className="mt-1 text-xs text-app-muted">
                      Prize pool splits among the top performers. Rank is determined by total score — ties broken by speed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Payout Info */}
              <div className="rounded-[2rem] border border-app bg-app-surface p-5 shadow-app sm:p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">Payout</p>
                <p className="mt-2 text-sm text-app-muted">{challenge.reward.payoutWindow}</p>
              </div>
            </aside>
          </section>

          {/* Bottom CTA */}
          <div className="flex justify-center">
            {challenge.status === "pending" ? (
              <div className="flex flex-col items-center gap-3">
                <span className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-app-soft px-10 py-3 text-xl font-semibold text-app-muted">
                  This challenge hasn&apos;t started yet
                </span>
                {isAuthenticated ? (
                  <Link
                    href="/brand/dashboard"
                    className="text-sm text-primary underline hover:brightness-110"
                  >
                    Go to Brand Dashboard to start this challenge
                  </Link>
                ) : null}
              </div>
            ) : challenge.status === "ended" ? (
              <Link
                href={`/challenge/${challenge.id}/leaderboard`}
                className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-app-soft px-10 py-3 text-xl font-semibold text-app-muted transition-all duration-200 hover:bg-app"
              >
                Challenge ended — View Leaderboard
              </Link>
            ) : isAuthenticated ? (
              <Link
                href={challenge.redirectPath}
                className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-primary px-10 py-3 text-xl font-semibold text-white transition-all duration-200 hover:brightness-110 dark:text-[#2f1736]"
                style={{ color: "var(--color-white)" }}
              >
                Play Now
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => login()}
                className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-primary px-10 py-3 text-xl font-semibold text-white transition-all duration-200 hover:brightness-110 dark:text-[#2f1736]"
                style={{ color: "var(--color-white)" }}
              >
                Sign In to Play
              </button>
            )}
          </div>

        </section>
      </main>

      <Footer />
    </div>
  );
}
