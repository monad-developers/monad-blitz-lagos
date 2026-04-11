import type { PlayerDashboardData } from "@/components/dashboard/player/types";

type RecentActivityPanelProps = {
  activity: PlayerDashboardData["recentActivity"];
};

const toneClasses: Record<string, string> = {
  positive: "bg-primary/15",
  neutral: "bg-app/70",
  upcoming: "bg-secondary/15",
};

export function RecentActivityPanel({ activity }: RecentActivityPanelProps) {
  return (
    <aside className="rounded-2xl border border-app/60 bg-app-surface p-4 shadow-app sm:p-5 lg:p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.12em] text-app-muted sm:text-base">Recent Activity</p>
      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-app sm:text-3xl">Live Feed</h2>

      <div className="mt-4 space-y-2.5">
        {activity.map((item) => (
          <article key={item.id} className="rounded-lg border border-app/40 bg-app-soft/75 p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <span
                className={`mt-1 block h-2.5 w-2.5 shrink-0 rounded-full ${toneClasses[item.tone] ?? "bg-app"}`}
                aria-hidden="true"
              />
              <div>
                <p className="text-base font-medium leading-relaxed text-app sm:text-lg">{item.detail}</p>
                <p className="mt-1 text-sm uppercase tracking-[0.12em] text-app-muted sm:text-base">{item.time}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}
