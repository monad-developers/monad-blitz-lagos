import type { PlayerDashboardData } from "@/components/dashboard/player/types";

type SummaryCardsProps = {
  summary: PlayerDashboardData["playerSummary"];
};

const stats = [
  {
    key: "walletBalance",
    label: "Wallet Balance",
    helper: "Updated after reward payouts",
  },
  {
    key: "totalRewardsEarned",
    label: "Total Rewards Earned",
    helper: "Across all challenge rounds",
  },
  {
    key: "challengesPlayed",
    label: "Challenges Played",
    helper: "Completed rounds",
  },
  {
    key: "challengesWon",
    label: "Challenges Won",
    helper: "Top performance finishes",
  },
  {
    key: "availableRewards",
    label: "Available Rewards",
    helper: "Pending claim or payout",
  },
  {
    key: "liveParticipation",
    label: "Live Participation",
    helper: "Rounds currently active",
  },
] as const;

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
      {stats.map((item) => {
        const value = summary[item.key];

        return (
          <article key={item.key} className="rounded-xl border border-app/60 bg-app-surface p-4 shadow-app sm:p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-app-muted sm:text-base">{item.label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-app sm:text-3xl">
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
            <p className="mt-1 text-sm text-app-muted sm:text-base">{item.helper}</p>
          </article>
        );
      })}
    </div>
  );
}
