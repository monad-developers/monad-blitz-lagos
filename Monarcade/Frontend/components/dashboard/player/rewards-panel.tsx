import type { PlayerDashboardData } from "@/components/dashboard/player/types";

type RewardsPanelProps = {
  rewardsHistory: PlayerDashboardData["rewardsHistory"];
  summary: PlayerDashboardData["playerSummary"];
};

const statusStyles: Record<string, string> = {
  Claimed: "bg-app text-app",
  Paid: "bg-app text-app",
  Pending: "bg-app-soft text-app",
  Processing: "bg-app-soft text-app",
};

export function RewardsPanel({ rewardsHistory, summary }: RewardsPanelProps) {
  return (
    <section id="dashboard-rewards" className="rounded-2xl border border-app/60 bg-app-surface p-5 shadow-app sm:p-6 lg:p-7">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="mt-0 text-2xl font-semibold tracking-tight text-app sm:text-3xl">Rewards</h2>
          <p className="mt-1 text-sm text-app-muted sm:text-base">
            Track payouts, pending claims, and payout history.
          </p>
        </div>
        <div className="rounded-lg border border-app/45 bg-app-soft px-3 py-2.5">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-app-muted sm:text-base">Total Earned</p>
          <p className="mt-1 text-2xl font-bold text-app sm:text-3xl">{summary.totalRewardsEarned}</p>
        </div>
      </div>

      <div className="mt-5 space-y-3 sm:space-y-4">
        {rewardsHistory.map((reward) => (
          <article key={reward.id} className="rounded-lg border border-app/45 bg-app-soft/75 px-4 py-4 sm:px-5 sm:py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-base font-semibold text-app sm:text-lg">{reward.challengeTitle}</p>
                <p className="text-sm text-app-muted sm:text-base">{reward.source}</p>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold text-app sm:text-2xl">{reward.amount}</p>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold sm:text-base ${statusStyles[reward.status] ?? "bg-app text-app"}`}
                >
                  {reward.status}
                </span>
              </div>
            </div>
            <p className="mt-2 text-sm uppercase tracking-[0.12em] text-app-muted sm:text-base">{reward.payoutDate}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
