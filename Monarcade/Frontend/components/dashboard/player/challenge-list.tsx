import Link from "next/link";
import type { ChallengeCategory, ChallengeEntry } from "@/lib/player-dashboard";

type ChallengeListProps = {
  category: ChallengeCategory;
  challenges: ChallengeEntry[];
};

export function ChallengeList({ category, challenges }: ChallengeListProps) {
  if (!challenges.length) {
    return (
      <div className="rounded-lg border border-app/50 bg-app-soft/80 p-4 text-center">
        <p className="text-lg font-semibold text-app sm:text-xl">No challenges here yet.</p>
        <p className="mt-2 text-base text-app-muted sm:text-lg">New rounds and results will appear in this section soon.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {challenges.map((challenge, index) => {
        const isAvailable = category === "available";
        const isUpcoming = category === "upcoming";

        return (
          <article
            key={`${challenge.id}-${index}`}
            className="max-w-4xl rounded-2xl border border-app/45 bg-app-soft/70 p-5 transition-all duration-200 hover:bg-app-soft/90 sm:p-6"
          >
            <div className="pt-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {challenge.brandLogoPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={challenge.brandLogoPath}
                      alt={`${challenge.brandName} logo`}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="/logo-light.png"
                      alt={`${challenge.brandName} logo`}
                      className="h-12 w-12 rounded-lg object-contain"
                    />
                  )}
                  <p className="text-lg font-semibold uppercase tracking-[0.10em] text-app-muted sm:text-xl">{challenge.brandName}</p>
                  <span className="rounded-full bg-app px-3 py-1 text-sm font-semibold text-app sm:text-base">
                    {challenge.statusLabel}
                  </span>
                </div>
                <p className="mt-2 text-base text-app-muted sm:text-lg">{challenge.challengeType}</p>

                <div className="mt-3 grid grid-cols-1 gap-2 text-base text-app-muted sm:grid-cols-2 sm:text-lg">
                  <p>
                    <span className="font-semibold text-app">Reward:</span> {challenge.reward}
                  </p>
                  {isAvailable ? (
                    <p>
                      <span className="font-semibold text-app">Time Remaining:</span> {challenge.timeRemaining}
                    </p>
                  ) : null}
                  {isUpcoming ? (
                    <p>
                      <span className="font-semibold text-app">Starts:</span> {challenge.startTime}
                    </p>
                  ) : null}
                  {challenge.endedDate ? (
                    <p>
                      <span className="font-semibold text-app">Date:</span> {challenge.endedDate}
                    </p>
                  ) : null}
                  {challenge.score ? (
                    <p>
                      <span className="font-semibold text-app">Score:</span> {challenge.score}
                    </p>
                  ) : null}
                  {challenge.payoutStatus ? (
                    <p>
                      <span className="font-semibold text-app">Payout:</span> {challenge.payoutStatus}
                    </p>
                  ) : null}
                </div>

                <div className="mt-5">
                  <Link
                    href={isAvailable ? `/challenge/${challenge.id}` : "/challenge"}
                    className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-base font-semibold transition-all duration-200 sm:text-lg ${
                      isAvailable
                        ? "bg-primary text-white hover:brightness-110 dark:text-[#2f1736]"
                        : "bg-app text-app hover:bg-app-surface"
                    }`}
                    style={isAvailable ? { color: "var(--color-white)" } : undefined}
                  >
                    {challenge.actionLabel}
                  </Link>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
