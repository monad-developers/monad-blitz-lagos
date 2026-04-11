import type { PlayerDashboardData } from "@/components/dashboard/player/types";

type PlayerInfoCardProps = {
  profile: PlayerDashboardData["playerProfile"];
  summary: PlayerDashboardData["playerSummary"];
};

export function PlayerInfoCard({ profile, summary }: PlayerInfoCardProps) {
  return (
    <aside className="h-full rounded-2xl bg-app-surface p-4 shadow-app sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-muted">Player Info</p>
      <h2 className="mt-2 text-lg font-semibold tracking-tight text-app">{profile.fullName}</h2>
      <p className="text-xs text-app-muted">{profile.username}</p>

      <div className="mt-3 space-y-2 rounded-lg bg-app-soft/70 p-3">
        <InfoRow label="Email" value={profile.email} />
        <InfoRow label="Joined" value={profile.joinedDate} />
        <InfoRow label="Ranking" value={profile.ranking} />
        <InfoRow label="Badge" value={profile.badge} />
        <InfoRow label="Wallet" value={profile.walletPreview} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <SmallStat label="Played" value={String(summary.challengesPlayed)} />
        <SmallStat label="Wins" value={String(summary.challengesWon)} />
      </div>
    </aside>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs text-app-muted">{label}</span>
      <span className="text-right text-xs font-semibold text-app">{value}</span>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-app-soft/80 px-2.5 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-app-muted">{label}</p>
      <p className="mt-1 text-base font-bold text-app">{value}</p>
    </div>
  );
}
