"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useRouter } from "next/navigation";
import { parseEther } from "viem";
import { useState } from "react";
import Link from "next/link";
import { AJOCHAIN_ABI, AJOCHAIN_ADDRESS } from "@/lib/contract";

const FREQUENCIES = [
  { label: "Daily",   value: "86400" },
  { label: "Weekly",  value: "604800" },
  { label: "Monthly", value: "2592000" },
];

export default function RegisterPage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const [contribution, setContribution] = useState("");
  const [groupSize, setGroupSize]       = useState("3");
  const [frequency, setFrequency]       = useState("86400");

  const { writeContractAsync, isPending } = useWriteContract();

  const { data: intentId } = useReadContract({
    address:      AJOCHAIN_ADDRESS,
    abi:          AJOCHAIN_ABI,
    functionName: "walletIntent",
    args:         [address ?? "0x0000000000000000000000000000000000000000"],
    query:        { enabled: !!address },
  });

  const hasIntent = intentId && BigInt(intentId.toString()) > 0n;

  async function handleRegister() {
    if (!contribution) return;
    try {
      await writeContractAsync({
        address:      AJOCHAIN_ADDRESS,
        abi:          AJOCHAIN_ABI,
        functionName: "registerIntent",
        args:         [parseEther(contribution), Number(groupSize), BigInt(frequency)],
      });
      router.push("/profile");
    } catch (err: unknown) {
      alert("Transaction failed: " + (err instanceof Error ? err.message.slice(0, 100) : String(err)));
    }
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight">AjoChain</span>
          <span className="dot-live" />
        </div>
        <div className="flex items-center gap-6">
          <Link href="/profile" className="text-sm transition-colors hover:text-white" style={{ color: "var(--gray)" }}>Profile</Link>
          <Link href="/log"     className="text-sm transition-colors hover:text-white" style={{ color: "var(--gray)" }}>Agent Log</Link>
          <ConnectButton />
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center flex-1 px-6 pt-24 pb-16 text-center fade-up">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
          style={{ background: "#00d4a015", color: "var(--teal)", border: "1px solid #00d4a030" }}
        >
          ⚡ Built on Monad · Powered by AI
        </div>

        <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight max-w-2xl mb-5">
          Save together.<br />
          <span style={{ color: "var(--teal)" }}>Trust no one.</span>
        </h1>

        <p className="text-lg max-w-lg mb-10" style={{ color: "var(--gray)" }}>
          AjoChain automates rotating savings — AI matches strangers, enforces rules,
          and earns yield on idle funds. No admin. No WhatsApp. No trust required.
        </p>

        {/* Stats row */}
        <div className="flex gap-8 mb-14 fade-up fade-up-1">
          {[
            { label: "BLOCK TIME",    value: "0.4s" },
            { label: "DEFAULT RISK",  value: "Zero" },
            { label: "IDLE FUNDS",    value: "Earning" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-bold" style={{ color: "var(--teal)" }}>{s.value}</div>
              <div className="text-xs mt-1 tracking-widest uppercase" style={{ color: "var(--gray)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Register card */}
        {isConnected ? (
          <div
            className="w-full max-w-md rounded-2xl p-6 fade-up fade-up-2 text-left"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            {hasIntent ? (
              <div className="text-center py-4 space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <span className="dot-live" />
                  <p className="font-semibold" style={{ color: "var(--teal)" }}>
                    Waiting for AI matchmaking
                  </p>
                </div>
                <p className="text-sm" style={{ color: "var(--gray)" }}>
                  The treasurer is scanning for compatible group members.
                </p>
                <button onClick={() => router.push("/profile")} className="btn-teal w-full">
                  View My Profile
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="label mb-3">Register Savings Intent</p>
                  <p className="text-xs" style={{ color: "var(--gray)" }}>
                    Tell the AI what you want. It finds your group.
                  </p>
                </div>

                {/* Contribution */}
                <div className="space-y-1.5">
                  <label className="label">Contribution per round (MON)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="0.05"
                    value={contribution}
                    onChange={(e) => setContribution(e.target.value)}
                  />
                </div>

                {/* Group size */}
                <div className="space-y-1.5">
                  <label className="label">Group size</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setGroupSize(String(n))}
                        className="py-2 rounded-xl text-sm font-medium border transition-all"
                        style={{
                          background:  groupSize === String(n) ? "#00d4a015" : "transparent",
                          borderColor: groupSize === String(n) ? "var(--teal)" : "var(--border)",
                          color:       groupSize === String(n) ? "var(--teal)" : "var(--gray)",
                        }}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Frequency */}
                <div className="space-y-1.5">
                  <label className="label">Round frequency</label>
                  <div className="grid grid-cols-3 gap-2">
                    {FREQUENCIES.map((f) => (
                      <button
                        key={f.value}
                        onClick={() => setFrequency(f.value)}
                        className="py-2 rounded-xl text-sm font-medium border transition-all"
                        style={{
                          background:  frequency === f.value ? "#00d4a015" : "transparent",
                          borderColor: frequency === f.value ? "var(--teal)" : "var(--border)",
                          color:       frequency === f.value ? "var(--teal)" : "var(--gray)",
                        }}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Collateral note */}
                {contribution && (
                  <div
                    className="rounded-xl px-4 py-3 text-xs"
                    style={{ background: "#0b1120", color: "var(--gray)", border: "1px solid var(--border)" }}
                  >
                    Security deposit:{" "}
                    <span className="text-white font-medium">
                      {(parseFloat(contribution || "0") * 2).toFixed(4)} MON
                    </span>{" "}
                    — fully returned when your group completes
                  </div>
                )}

                <button
                  onClick={handleRegister}
                  disabled={!contribution || isPending}
                  className="btn-teal w-full disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isPending ? "Registering..." : "Register Intent"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            className="w-full max-w-md rounded-2xl p-8 text-center fade-up fade-up-2"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <p className="mb-5" style={{ color: "var(--gray)" }}>
              Connect your wallet to register a savings intent
            </p>
            <ConnectButton />
          </div>
        )}
      </section>
    </main>
  );
}
