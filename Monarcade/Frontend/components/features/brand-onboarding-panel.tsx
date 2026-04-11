"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useTheme } from "@/components/providers/theme-provider";

const benefitItems = [
  " Set up Challenges.",
  "See how well users knows your brand.",
  "Reward top players with MON.",
  "Track participation with verifiable on-chain records.",
];

const flowSteps = [
  "Create your campaign",
  "Fund the prize pool",
  "Watch players compete",
  "Measure results in real time",
];

export function BrandOnboardingPanel() {
  const { theme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const logoSrc = !mounted || theme === "light" ? "/logo-light.png" : "/logo-dark.png";

  return (
    <aside className="relative overflow-hidden rounded-3xl bg-app-surface px-6 py-7 shadow-app sm:px-8 sm:py-9 lg:h-full lg:px-9 lg:py-10 xl:px-10 xl:py-11">
      <div
        className="pointer-events-none absolute -left-12 top-0 h-44 w-44 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-14 bottom-6 h-48 w-48 rounded-full bg-secondary/12 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative">
        <Link href="/" className="inline-flex items-center gap-3">
          <Image
            src={logoSrc}
            alt="Monarcade logo"
            width={44}
            height={44}
            className="h-11 w-11 rounded-xl object-contain"
            priority
            unoptimized
          />
          <div>
            <p className="text-base font-semibold uppercase tracking-[0.18em] text-app-muted sm:text-lg">
              Brand Onboarding
            </p>
            <p className="text-lg font-semibold text-app">Monarcade</p>
          </div>
        </Link>

        <h1 className="mt-7 text-[2.4rem] font-bold tracking-tight text-app sm:text-[3.1rem] lg:text-[3.4rem] xl:text-[3.7rem]">
          Create challenges
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-app-muted sm:text-xl lg:text-[1.35rem]">
          Monarcade helps brands get the attention they need. 
        </p>

        <ul className="mt-7 space-y-3.5">
          {benefitItems.map((item, index) => (
            <li key={`${index}-${item}`} className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M5 10l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="text-lg font-medium leading-relaxed text-app sm:text-xl">{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-2xl bg-app-soft/70 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-app-muted sm:text-base">
            How it works
          </p>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {flowSteps.map((step, index) => (
              <div key={`${index}-${step}`} className="rounded-xl bg-app-surface/85 px-4 py-3">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">
                  0{index + 1}
                </p>
                <p className="mt-1.5 text-base font-semibold text-app sm:text-lg">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-5 text-sm leading-relaxed text-app-muted sm:text-base">
     
        </p>
      </div>
    </aside>
  );
}
