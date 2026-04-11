import Link from "next/link";
import { pageContainerClass } from "@/lib/layout";

export function HeroSection() {
  return (
    <div
      className={`relative flex min-h-[calc(100svh-4.5rem)] items-center overflow-hidden py-12 sm:py-16 lg:min-h-[calc(100svh-5.5rem)] lg:justify-center lg:py-20 ${pageContainerClass}`}
    >
      <div
        className="absolute -left-14 top-0 h-64 w-64 rounded-full bg-primary/12 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute right-0 top-6 h-72 w-72 rounded-full bg-secondary/12 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-10 left-1/3 h-52 w-52 rounded-full bg-tertiary/45 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative w-full">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-center text-center">
            <p className="inline-flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-full bg-app-soft/80 px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-app-muted shadow-[0_1px_0_color-mix(in_srgb,var(--border)_60%,transparent)] sm:gap-6 sm:px-7 sm:py-3 sm:text-[1rem]">
              <span>Fast</span>
              <span>Fair</span>
              <span>On-chain</span>
          </p>

          <h1 className="mt-6 max-w-6xl text-[2.9rem] font-bold leading-[0.94] tracking-tight text-app sm:mt-8 sm:text-[5.25rem] lg:text-[7rem] xl:text-[8.5rem] 2xl:text-[9.5rem]">
            Play. Recall. Earn <span className="text-[#853953]">MON</span>.
          </h1>

          <p className="mt-5 max-w-5xl text-[1rem] leading-relaxed text-app-muted sm:mt-7 sm:text-[1.45rem] lg:text-[1.75rem] xl:text-[2.05rem] 2xl:text-[2.25rem]">
            Forget passive ads and boring surveys. Monarcade turns brand
            engagement into fast, competitive challenges where players interact,
            recall, and compete for rewards while every action is tracked and
            proven on-chain.
          </p>

          <div className="mt-8 flex w-full max-w-md flex-col gap-3 sm:mt-12 sm:max-w-none sm:flex-row sm:justify-center sm:gap-5">
            <a
              href="/auth"
              className="inline-flex min-h-13 w-full items-center justify-center rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white shadow-app transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 sm:min-h-14 sm:w-auto sm:px-8 sm:py-3.5 sm:text-lg xl:text-[1.35rem] 2xl:text-[1.55rem]"
            >
              Play Challenges
            </a>
            <Link
              href="/brands/signup"
              className="inline-flex min-h-13 w-full items-center justify-center rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white shadow-app transition-all duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 sm:min-h-14 sm:w-auto sm:px-8 sm:py-3.5 sm:text-lg xl:text-[1.35rem] 2xl:text-[1.55rem]"
            >
              Create Challenge
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
