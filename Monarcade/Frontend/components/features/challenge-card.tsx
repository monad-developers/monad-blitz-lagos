import Link from "next/link";
import type { Challenge } from "@/lib/challenges";

type ChallengeCardProps = {
  challenge: Challenge;
};

export function ChallengeCard({ challenge }: ChallengeCardProps) {
  const isLive = challenge.status === "live";

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-[color:var(--border)] p-4 shadow-app transition-all duration-300 sm:rounded-3xl sm:p-7 lg:p-8 xl:p-10 2xl:p-11 ${
        isLive
          ? "bg-app-surface hover:-translate-y-1 hover:shadow-xl"
          : "bg-app-soft/70"
      }`}
    >
      <div
        className={`pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full blur-3xl ${
          isLive ? "bg-primary/10" : "bg-neutral/10"
        }`}
        aria-hidden="true"
      />

      <div className="relative flex items-start gap-3 sm:gap-5 xl:gap-6 2xl:gap-7">
        <div className="flex min-w-0 items-center gap-3">
          {challenge.brandLogoPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={challenge.brandLogoPath}
              alt={`${challenge.brandName} logo`}
              className="h-11 w-11 shrink-0 rounded-2xl object-cover sm:h-16 sm:w-16"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/logo-light.png"
              alt={`${challenge.brandName} logo`}
              className="h-11 w-11 shrink-0 rounded-2xl object-contain sm:h-16 sm:w-16"
            />
          )}
          <div className="min-w-0">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-app-muted sm:text-base">Brand</p>
            <h3 className="text-[1.35rem] font-semibold tracking-tight text-app sm:text-[1.75rem] xl:text-[2.1rem] 2xl:text-[2.4rem]">
              {challenge.brandName}
            </h3>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:mt-9 xl:gap-4 2xl:mt-10 2xl:gap-5">
        <div className="rounded-2xl bg-app px-4 py-4 sm:px-5 xl:px-6 xl:py-5 2xl:px-7 2xl:py-6">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-app-muted sm:text-base">Prize</p>
          <p className="mt-2 text-[1rem] font-semibold text-app sm:text-2xl xl:text-3xl 2xl:text-[2.35rem]">{challenge.prize}</p>
        </div>
        <div className="rounded-2xl bg-app px-4 py-4 min-[420px]:text-right sm:px-5 xl:px-6 xl:py-5 2xl:px-7 2xl:py-6">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-app-muted sm:text-base">
            {isLive ? "Ends" : "Duration"}
          </p>
          <p className="mt-2 text-[1rem] font-semibold text-app sm:text-2xl xl:text-3xl 2xl:text-[2.35rem]">{challenge.time}</p>
        </div>
      </div>

      <Link
        href={isLive ? `/challenge/${challenge.id}` : "/challenge"}
        className={`mt-6 inline-flex w-full min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-semibold transition-all duration-200 active:scale-[0.99] sm:mt-auto sm:min-h-14 sm:text-lg xl:mt-8 xl:min-h-16 xl:text-xl 2xl:mt-9 2xl:min-h-18 2xl:text-2xl ${
          isLive
            ? "bg-primary text-white hover:brightness-110 dark:text-[#2f1736]"
            : "bg-app-surface text-app-muted hover:bg-app"
        }`}
        style={isLive ? { color: "var(--color-white)" } : undefined}
      >
        {challenge.buttonLabel}
      </Link>
    </article>
  );
}
