"use client";

import { useAccount, useReadContract } from "wagmi";
import { formatEther } from "viem";
import { AJOCHAIN_ABI, AJOCHAIN_ADDRESS, GROUP_STATUS } from "@/lib/contract";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

function short(addr: string) { return addr.slice(0, 6) + "…" + addr.slice(-4); }

function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circ   = 2 * Math.PI * radius;
  const dash   = (score / 100) * circ;
  const color  = score >= 80 ? "#00d4a0" : score >= 50 ? "#f5a623" : "#ff6b6b";

  return (
    <svg width="96" height="96" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r={radius} fill="none" stroke="#1f2d45" strokeWidth="7" />
      <circle
        cx="48" cy="48" r={radius}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        strokeDashoffset={circ / 4}
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text x="48" y="48" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="18" fontWeight="700">
        {score}
      </text>
    </svg>
  );
}

function GroupCard({ groupId }: { groupId: bigint }) {
  const { data: group } = useReadContract({
    address:      AJOCHAIN_ADDRESS,
    abi:          AJOCHAIN_ABI,
    functionName: "getGroup",
    args:         [groupId],
  });

  if (!group) return null;

  const status = GROUP_STATUS[group.status] ?? "Unknown";
  const statusColor = status === "Active" ? "var(--teal)" : status === "Completed" ? "#8b9ab4" : "#f5a623";

  return (
    <Link href={`/dashboard/${groupId}`}>
      <div
        className="rounded-2xl p-5 hover:border-[#3a5070] transition-colors cursor-pointer"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="label">Group #{groupId.toString()}</p>
          <span className="text-xs font-medium" style={{ color: statusColor }}>{status}</span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="label mb-1">ROUND</p>
            <p className="font-semibold">{group.currentRound.toString()}/{group.totalMembers.toString()}</p>
          </div>
          <div>
            <p className="label mb-1">CONTRIBUTION</p>
            <p className="font-semibold">{parseFloat(formatEther(group.contributionAmount)).toFixed(3)} MON</p>
          </div>
          <div>
            <p className="label mb-1">YIELD</p>
            <p className="font-semibold" style={{ color: "var(--teal)" }}>
              {parseFloat(formatEther(group.yieldEarned)).toFixed(6)} MON
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount();

  const { data: groupIds } = useReadContract({
    address:      AJOCHAIN_ADDRESS,
    abi:          AJOCHAIN_ABI,
    functionName: "getMemberGroups",
    args:         [address ?? "0x0000000000000000000000000000000000000000"],
    query:        { enabled: !!address },
  });

  const { data: intentId } = useReadContract({
    address:      AJOCHAIN_ADDRESS,
    abi:          AJOCHAIN_ABI,
    functionName: "walletIntent",
    args:         [address ?? "0x0000000000000000000000000000000000000000"],
    query:        { enabled: !!address },
  });

  // Derive credit score: read member data from first group as proxy
  // In prod you'd aggregate across all groups; for demo first group is fine
  const firstGroupId = groupIds?.[0];
  const { data: memberData } = useReadContract({
    address:      AJOCHAIN_ADDRESS,
    abi:          AJOCHAIN_ABI,
    functionName: "getMember",
    args:         [firstGroupId ?? 0n, address ?? "0x0000000000000000000000000000000000000000"],
    query:        { enabled: !!firstGroupId && !!address },
  });

  const creditScore  = Number(memberData?.creditScore ?? 100);
  const defaultCount = Number(memberData?.defaultCount ?? 0);
  const hasIntent    = intentId && BigInt(intentId.toString()) > 0n;

  if (!isConnected) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center" style={{ background: "var(--bg)" }}>
        <p className="mb-4" style={{ color: "var(--gray)" }}>Connect your wallet to view your profile</p>
        <ConnectButton />
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <Link href="/" className="text-lg font-bold tracking-tight">AjoChain</Link>
        <div className="flex items-center gap-4">
          <Link href="/log" className="text-sm" style={{ color: "var(--gray)" }}>Agent Log</Link>
          <ConnectButton />
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        {/* Profile header */}
        <div
          className="rounded-2xl p-6 flex items-center gap-6 fade-up"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <ScoreRing score={creditScore} />
          <div className="flex-1">
            <p className="label label-teal mb-1">Credit Profile</p>
            <p className="text-xl font-bold">{short(address ?? "")}</p>
            <p className="text-sm mt-1" style={{ color: "var(--gray)" }}>
              {creditScore >= 90
                ? "Excellent standing — preferred for high-value groups"
                : creditScore >= 70
                ? "Good standing"
                : creditScore >= 50
                ? "Fair — may affect matchmaking priority"
                : "Poor — collateral requirements may increase"}
            </p>
          </div>
          <div className="text-right">
            <div
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: defaultCount === 0 ? "#00d4a015" : "#ff444415", color: defaultCount === 0 ? "var(--teal)" : "#ff7070" }}
            >
              {defaultCount === 0 ? "Clean record" : `${defaultCount} default${defaultCount > 1 ? "s" : ""}`}
            </div>
          </div>
        </div>

        {/* Intent status */}
        {hasIntent && (
          <div
            className="rounded-2xl px-6 py-4 flex items-center gap-3 fade-up fade-up-1"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <span className="dot-live" />
            <div>
              <p className="text-sm font-medium">Intent registered</p>
              <p className="text-xs" style={{ color: "var(--gray)" }}>
                AI treasurer is scanning for compatible group members
              </p>
            </div>
          </div>
        )}

        {/* Groups */}
        <div className="fade-up fade-up-2 space-y-3">
          <p className="label">Your Groups</p>
          {!groupIds || groupIds.length === 0 ? (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <p style={{ color: "var(--gray)" }}>No groups yet.</p>
              <p className="text-sm mt-1" style={{ color: "var(--gray)" }}>
                Register an intent and the AI will match you.
              </p>
              <Link href="/" className="btn-teal inline-block mt-4">Register Intent</Link>
            </div>
          ) : (
            groupIds.map((id) => <GroupCard key={id.toString()} groupId={id} />)
          )}
        </div>

        {/* Go to agent log */}
        <div className="fade-up fade-up-3">
          <Link
            href="/log"
            className="btn-ghost inline-flex items-center gap-2 text-sm"
          >
            View AI Treasurer Decisions →
          </Link>
        </div>
      </div>
    </main>
  );
}
