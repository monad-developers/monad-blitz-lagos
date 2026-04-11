"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ChallengeDetails } from "@/lib/challenge-details";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { pageContainerClass } from "@/lib/layout";

type ChallengeBriefingScreenProps = {
  challenge: ChallengeDetails;
};

const formatCountdown = (seconds: number) => {
  const safeSeconds = Math.max(seconds, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

const getAudioContext = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextClass =
    window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  return AudioContextClass ? new AudioContextClass() : null;
};

const playCountdownTone = (audioContext: AudioContext, secondsLeft: number) => {
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = secondsLeft <= 5 ? "square" : "sawtooth";
  oscillator.frequency.setValueAtTime(secondsLeft <= 5 ? 1320 : 980, now);

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(secondsLeft <= 5 ? 0.34 : 0.24, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.2);
};

export function ChallengeBriefingScreen({ challenge }: ChallengeBriefingScreenProps) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(challenge.prepSeconds);
  const audioContextRef = useRef<AudioContext | null>(null);
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTimeLeft((currentValue) => {
        if (currentValue <= 1) {
          window.clearInterval(intervalId);
          return 0;
        }

        return currentValue - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [challenge.prepSeconds]);

  useEffect(() => {
    if (timeLeft !== 0 || hasNavigatedRef.current) {
      return;
    }

    hasNavigatedRef.current = true;
    router.replace(challenge.redirectPath);
  }, [challenge.redirectPath, router, timeLeft]);

  useEffect(() => {
    if (timeLeft <= 0 || timeLeft >= challenge.prepSeconds) {
      return;
    }

    const audioContext = audioContextRef.current ?? getAudioContext();
    if (!audioContext) {
      return;
    }

    audioContextRef.current = audioContext;

    if (audioContext.state === "suspended") {
      void audioContext.resume().then(() => playCountdownTone(audioContext, timeLeft));
      return;
    }

    playCountdownTone(audioContext, timeLeft);
  }, [challenge.prepSeconds, timeLeft]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        void audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="page-typography player-dashboard-typography min-h-screen bg-app text-app">
      <Navbar />

      <main className="w-full pb-14 pt-4 sm:pt-6 lg:pb-18 lg:pt-8">
        <section className={`${pageContainerClass} space-y-6 sm:space-y-8`}>
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/player/dashboard"
              className="inline-flex items-center gap-2 text-lg text-app-muted transition-colors duration-200 hover:text-app sm:text-xl"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </Link>
            <p className="text-base font-semibold uppercase tracking-[0.18em] text-app-muted sm:text-lg">
              Starts automatically in {formatCountdown(timeLeft)}
            </p>
          </div>

          <section className="relative overflow-hidden rounded-[2rem] border border-app bg-app-surface p-5 shadow-app sm:p-7 lg:p-9">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-90"
              aria-hidden="true"
              style={{
                background:
                  "radial-gradient(circle at top left, color-mix(in srgb, var(--color-primary) 22%, transparent), transparent 42%), radial-gradient(circle at top right, color-mix(in srgb, var(--color-secondary) 18%, transparent), transparent 44%)",
              }}
            />

            <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
              <div className="lg:col-span-7">
                {challenge.heroLabel ? (
                  <div className="inline-flex rounded-full bg-app px-4 py-2 text-base font-semibold uppercase tracking-[0.18em] text-app-muted sm:text-lg">
                    {challenge.heroLabel}
                  </div>
                ) : null}

                <div className="mt-5 flex items-center gap-4 sm:gap-5">
                  <div
                    className="flex h-18 w-18 items-center justify-center rounded-[1.6rem] text-2xl font-semibold sm:h-24 sm:w-24 sm:text-3xl"
                    style={{
                      background:
                        "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 92%, white), color-mix(in srgb, var(--color-secondary) 88%, white))",
                      color: "var(--color-tertiary)",
                      boxShadow: "var(--shadow)",
                    }}
                  >
                    {challenge.logoText}
                  </div>

                  <div>
                    <p className="text-lg font-semibold uppercase tracking-[0.16em] text-app-muted sm:text-xl">
                      Brand Name
                    </p>
                    <h1 className="mt-1 text-3xl font-semibold tracking-tight text-app sm:text-4xl lg:text-[3.25rem]">
                      {challenge.brandTitle}
                    </h1>
                    <p className="mt-2 max-w-2xl text-lg text-app-muted sm:text-xl">{challenge.tagline}</p>
                  </div>
                </div>

                <p className="mt-6 max-w-3xl text-lg leading-8 text-app-muted sm:text-xl">
                 
                </p>

                <div className="mt-14 rounded-[1.75rem] border border-app bg-app p-5 sm:mt-16 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold text-app sm:text-2xl">Random Facts</h2>
                  </div>
                  <div className="mt-4 space-y-3">
                    {challenge.facts.map((fact) => (
                      <div key={fact} className="rounded-2xl bg-app-surface px-4 py-3 text-lg leading-8 text-app-muted sm:text-xl">
                        {fact}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-14 rounded-[1.75rem] border border-app bg-app/75 p-5 sm:mt-16 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-semibold text-app sm:text-2xl">Instructions</h2>
                  </div>

                  <div className="mt-4 space-y-3">
                    {challenge.instructions.map((instruction, index) => (
                      <div key={instruction} className="flex items-start gap-3 rounded-2xl bg-app-surface px-4 py-3">
                        <span
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-white dark:text-[#2f1736]"
                          style={{ color: "var(--color-white)" }}
                        >
                          {index + 1}
                        </span>
                        <p className="text-lg leading-8 text-app-muted sm:text-xl">{instruction}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <aside className="lg:col-span-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="px-1 py-1 sm:px-2">
                    <p className="text-lg font-semibold uppercase tracking-[0.16em] text-app-muted sm:text-xl">Reward</p>
                    <h2 className="mt-3 text-3xl font-semibold text-app sm:text-4xl">{challenge.reward.headline}</h2>
                    <p className="mt-3 text-lg leading-8 text-app-muted sm:text-xl">{challenge.reward.details}</p>
                    <p className="mt-4 text-lg text-app-muted sm:text-xl">
                      {challenge.reward.payoutWindow}
                    </p>
                  </div>

                  <div className="rounded-[1.75rem] border border-app bg-primary px-5 py-5 text-white shadow-app dark:text-[#2f1736] sm:col-span-2 sm:px-6 sm:py-6 lg:col-span-1 lg:mt-72">
                    <p
                      className="text-lg font-semibold uppercase tracking-[0.16em] text-white/80 dark:text-[#2f1736]/75 sm:text-xl"
                      style={{ color: "var(--color-white)" }}
                    >
                      Countdown
                    </p>
                    <p
                      className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
                      style={{ color: "var(--color-white)" }}
                    >
                      {formatCountdown(timeLeft)}
                    </p>
                  
                    <button
                      type="button"
                      onClick={() => router.replace(challenge.redirectPath)}
                      className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-app-surface px-5 py-3 text-xl font-semibold text-app transition-all duration-200 hover:-translate-y-0.5 hover:brightness-105 sm:min-h-14 sm:text-2xl"
                    >
                      Start Now
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          </section>

          <section className="rounded-[2rem] border border-app bg-app-surface p-5 shadow-app sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-base font-semibold uppercase tracking-[0.16em] text-app-muted sm:text-lg">How this challenge works</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-app sm:text-3xl">Two rounds. Thirty seconds total.</h2>
              </div>
             
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {challenge.rounds.map((round) => (
                <article key={round.title} className="rounded-[1.75rem] border border-app bg-app p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold uppercase tracking-[0.16em] text-app-muted sm:text-lg">{round.title}</p>
                      <h3 className="mt-2 text-2xl font-semibold text-app sm:text-3xl">{round.duration}</h3>
                    </div>
                  </div>
                  <p className="mt-4 text-lg leading-8 text-app-muted sm:text-xl">{round.description}</p>
                </article>
              ))}
            </div>
          </section>
        </section>
      </main>

      <Footer />
    </div>
  );
}
