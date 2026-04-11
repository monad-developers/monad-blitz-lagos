"use client";

import { useParams, useRouter } from "next/navigation";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { formatEther, parseEther } from "viem";
import { useEffect } from "react";
import { AJOCHAIN_ABI, AJOCHAIN_ADDRESS, GROUP_STATUS, FUND_STATUS } from "@/lib/contract";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

function short(addr: string) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function countdown(deadline: bigint) {
  const diff = Number(deadline) - Math.floor(Date.now() / 1000);
  if (diff <= 0) return "Deadline passed";
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function DashboardPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { address }  = useAccount();
  const router       = useRouter();

  const { data: group, refetch: refetchGroup } = useReadContract({
    address:      AJOCHAIN_ADDRESS,
    abi:          AJOCHAIN_ABI,
    functionName: "getGroup",
    args:         [BigInt(groupId)],
  });

  const { data: members, refetch: refetchMembers } = useReadContract({
    address:      AJOCHAIN_ADDRESS,
    abi:          AJOCHAIN_ABI,
    functionName: "getGroupMembers",
    args:         [BigInt(groupId)],
  });

  const { data: idleFunds } = useReadContract({
    address:      AJOCHAIN_ADDRESS,
    abi:          AJOCHAIN_ABI,
    functionName: "getIdleFunds",
    args:         [BigInt(groupId)],
  });

  const { writeContractAsync, isPending } = useWriteContract();

  // Auto-refresh every 15s so users see round changes without manual refresh
  useEffect(() => {
    const interval = setInterval(() => {
      refetchGroup();
      refetchMembers();
    }, 15000);
    return () => clearInterval(interval);
  }, [refetchGroup, refetchMembers]);

  const me = members?.find((m) => m.wallet.toLowerCase() === address?.toLowerCase());

  async function handleLockCollateral() {
    if (!group) return;
    await writeContractAsync({
      address:      AJOCHAIN_ADDRESS,
      abi:          AJOCHAIN_ABI,
      functionName: "lockCollateral",
      args:         [BigInt(groupId)],
      value:        group.collateralAmount,
    });
    refetchGroup(); refetchMembers();
  }

  async function handlePay() {
    if (!group) return;
    await writeContractAsync({
      address:      AJOCHAIN_ADDRESS,
      abi:          AJOCHAIN_ABI,
      functionName: "payContribution",
      args:         [BigInt(groupId)],
      value:        group.contributionAmount,
    });
    refetchGroup(); refetchMembers();
  }

  if (!group) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <p style={{ color: "var(--gray)" }}>Loading group {groupId}…</p>
      </main>
    );
  }

  const status     = GROUP_STATUS[group.status] ?? "Unknown";
  const fundStatus = FUND_STATUS[group.fundStatus] ?? "Idle";
  const isActive   = status === "Active";
  const isForming  = status === "Forming";

  const totalPot   = Number(group.contributionAmount) * Number(group.totalMembers);
  const yieldMon   = parseFloat(formatEther(group.yieldEarned)).toFixed(6);
  const idleMon    = idleFunds ? parseFloat(formatEther(idleFunds)).toFixed(4) : "0";

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-bold tracking-tight">AjoChain</Link>
          <span style={{ color: "var(--border)" }}>/</span>
          <span style={{ color: "var(--gray)" }}>Group #{groupId}</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/log" className="text-sm" style={{ color: "var(--gray)" }}>Agent Log</Link>
          <Link href="/profile" className="text-sm" style={{ color: "var(--gray)" }}>Profile</Link>
          <ConnectButton />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        {/* Status header */}
        <div className="fade-up flex items-start justify-between">
          <div>
            <p className="label label-teal mb-1">GROUP #{groupId}</p>
            <h1 className="text-3xl font-bold">{status}</h1>
            <p className="text-sm mt-1" style={{ color: "var(--gray)" }}>
              Round {group.currentRound} of {group.totalMembers} ·{" "}
              {isActive && `Deadline: ${countdown(group.roundDeadline)}`}
              {isForming && "Waiting for all members to lock collateral"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="dot-live" />
            <span className="text-xs" style={{ color: "var(--gray)" }}>{fundStatus}</span>
          </div>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-3 gap-4 fade-up fade-up-1">
          {[
            { label: "POT THIS ROUND",    value: `${parseFloat(formatEther(BigInt(totalPot))).toFixed(4)} MON` },
            { label: "YIELD EARNED",       value: `${yieldMon} MON`,   teal: true },
            { label: "IDLE FUNDS",         value: `${idleMon} MON` },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl p-5"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <p className="label mb-2">{s.label}</p>
              <p
                className="text-2xl font-bold"
                style={s.teal ? { color: "var(--teal)" } : {}}
              >
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Members table */}
        <div
          className="rounded-2xl overflow-hidden fade-up fade-up-2"
          style={{ background: "var(--card)", border: "1px solid var(--border)" }}
        >
          <div className="px-6 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <p className="label">Members · {group.paidCount}/{group.totalMembers} paid</p>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {members?.map((m) => {
              const isMe = m.wallet.toLowerCase() === address?.toLowerCase();
              return (
                <div key={m.wallet} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: isMe ? "#00d4a020" : "#1f2d45", color: isMe ? "var(--teal)" : "var(--gray)" }}
                    >
                      {m.wallet.slice(2, 4).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {short(m.wallet)} {isMe && <span style={{ color: "var(--teal)", fontSize: "0.7rem" }}>YOU</span>}
                      </p>
                      <p className="text-xs" style={{ color: "var(--gray)" }}>
                        Score: {m.creditScore.toString()} · Defaults: {m.defaultCount.toString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Collateral */}
                    <span
                      className="text-xs px-2.5 py-1 rounded-full"
                      style={{
                        background: m.hasCollateral ? "#00d4a015" : "#ff444410",
                        color:      m.hasCollateral ? "var(--teal)" : "#ff7070",
                      }}
                    >
                      {m.hasCollateral ? "Deposit ✓" : "No deposit"}
                    </span>
                    {/* Paid */}
                    {isActive && (
                      <span
                        className="text-xs px-2.5 py-1 rounded-full"
                        style={{
                          background: m.hasPaid ? "#00d4a015" : "#1f2d45",
                          color:      m.hasPaid ? "var(--teal)" : "var(--gray)",
                        }}
                      >
                        {m.hasPaid ? "Paid ✓" : "Unpaid"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action panel for current user */}
        {me && (
          <div
            className="rounded-2xl p-6 fade-up fade-up-3"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <p className="label mb-4">Your Action</p>

            {isForming && !me.hasCollateral && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Pay Security Deposit</p>
                  <p className="text-sm mt-0.5" style={{ color: "var(--gray)" }}>
                    {formatEther(group.collateralAmount)} MON — fully returned when group completes
                  </p>
                </div>
                <button
                  onClick={handleLockCollateral}
                  disabled={isPending}
                  className="btn-teal disabled:opacity-40"
                >
                  {isPending ? "Submitting…" : "Pay Deposit"}
                </button>
              </div>
            )}

            {isForming && me.hasCollateral && (
              <p style={{ color: "var(--gray)" }}>
                Security deposit paid. Waiting for other members…
              </p>
            )}

            {isActive && !me.hasPaid && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Pay Round {group.currentRound.toString()}</p>
                  <p className="text-sm mt-0.5" style={{ color: "var(--gray)" }}>
                    {formatEther(group.contributionAmount)} MON · {countdown(group.roundDeadline)} remaining
                  </p>
                </div>
                <button
                  onClick={handlePay}
                  disabled={isPending}
                  className="btn-teal disabled:opacity-40"
                >
                  {isPending ? "Paying…" : "Pay Now"}
                </button>
              </div>
            )}

            {isActive && me.hasPaid && (
              <div className="flex items-center gap-2">
                <span className="dot-live" />
                <p style={{ color: "var(--teal)" }}>
                  Paid. Waiting for AI treasurer to advance round.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Quick links */}
        <div className="flex gap-3 fade-up fade-up-4">
          <button
            onClick={() => router.push("/log")}
            className="btn-ghost text-sm"
          >
            View Agent Decisions
          </button>
          <button
            onClick={() => { refetchGroup(); refetchMembers(); }}
            className="btn-ghost text-sm"
          >
            Refresh
          </button>
        </div>
      </div>
    </main>
  );
}
