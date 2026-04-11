"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

type LogEntry = {
  id:        number;
  timestamp: string;
  type:      "YIELD" | "DEFAULT" | "ROUND_ADVANCE" | "MATCHMAKING";
  groupId:   string | null;
  action:    string;
  reasoning: string;
  txHash:    string | null;
};

const TYPE_META: Record<string, { label: string; color: string; icon: string }> = {
  YIELD:         { label: "Yield",       color: "#00d4a0", icon: "📈" },
  DEFAULT:       { label: "Default",     color: "#ff6b6b", icon: "⚡" },
  ROUND_ADVANCE: { label: "Round",       color: "#a78bfa", icon: "🏆" },
  MATCHMAKING:   { label: "Match",       color: "#f5a623", icon: "🤝" },
};

const ACTION_COLORS: Record<string, string> = {
  DEPLOY:       "#00d4a0",
  WITHDRAW:     "#a78bfa",
  HOLD:         "#8b9ab4",
  SLASH:        "#ff6b6b",
  SLASHED:      "#ff6b6b",
  WAIT:         "#f5a623",
  ADVANCE:      "#a78bfa",
  CREATE_GROUP: "#f5a623",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m    = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function LogPage() {
  const [entries, setEntries]   = useState<LogEntry[]>([]);
  const [filter, setFilter]     = useState<string>("ALL");
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch("/api/log");
        const data = await res.json();
        setEntries(data);
      } catch {
        setEntries([]);
      }
    }
    load();
    const interval = setInterval(load, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const FILTERS = ["ALL", "YIELD", "DEFAULT", "ROUND_ADVANCE", "MATCHMAKING"];

  const visible = filter === "ALL"
    ? entries
    : entries.filter((e) => e.type === filter);

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <Link href="/" className="text-lg font-bold tracking-tight">AjoChain</Link>
        <div className="flex items-center gap-4">
          <Link href="/profile" className="text-sm" style={{ color: "var(--gray)" }}>Profile</Link>
          <ConnectButton />
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        {/* Header */}
        <div className="fade-up">
          <p className="label label-teal mb-1">AI Treasurer</p>
          <h1 className="text-3xl font-bold">Decision Log</h1>
          <p className="text-sm mt-1" style={{ color: "var(--gray)" }}>
            Every decision the treasurer makes is logged here with full reasoning.
            Nothing is hidden. No admin. No black box.
          </p>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2 fade-up fade-up-1">
          <span className="dot-live" />
          <span className="text-xs" style={{ color: "var(--gray)" }}>
            Refreshing every 10s · {entries.length} decisions logged
          </span>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap fade-up fade-up-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
              style={{
                background:  filter === f ? "#00d4a015" : "transparent",
                borderColor: filter === f ? "var(--teal)" : "var(--border)",
                color:       filter === f ? "var(--teal)" : "var(--gray)",
              }}
            >
              {f === "ALL" ? "All" : TYPE_META[f]?.label ?? f}
            </button>
          ))}
        </div>

        {/* Entries */}
        <div className="space-y-3 fade-up fade-up-3">
          {visible.length === 0 ? (
            <div
              className="rounded-2xl p-10 text-center"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <p style={{ color: "var(--gray)" }}>
                {entries.length === 0
                  ? "No decisions yet — start the agent to see activity here."
                  : "No entries for this filter."}
              </p>
            </div>
          ) : (
            visible.map((entry) => {
              const meta       = TYPE_META[entry.type] ?? { label: entry.type, color: "var(--gray)", icon: "•" };
              const actionColor = ACTION_COLORS[entry.action] ?? "var(--gray)";
              const isOpen     = expanded === entry.id;

              return (
                <div
                  key={entry.id}
                  className="rounded-2xl overflow-hidden cursor-pointer hover:border-[#2a3f60] transition-colors"
                  style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                  onClick={() => setExpanded(isOpen ? null : entry.id)}
                >
                  {/* Row */}
                  <div className="flex items-center gap-4 px-5 py-4">
                    {/* Type icon */}
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: meta.color + "18" }}
                    >
                      {meta.icon}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold" style={{ color: meta.color }}>
                          {meta.label}
                        </span>
                        {entry.groupId && (
                          <span className="text-xs" style={{ color: "var(--gray)" }}>
                            Group #{entry.groupId}
                          </span>
                        )}
                        <span
                          className="text-xs font-mono px-2 py-0.5 rounded-md"
                          style={{ background: actionColor + "18", color: actionColor }}
                        >
                          {entry.action}
                        </span>
                      </div>
                      <p
                        className="text-sm mt-0.5 truncate"
                        style={{ color: "var(--gray)" }}
                      >
                        {entry.reasoning}
                      </p>
                    </div>

                    {/* Time + chevron */}
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs" style={{ color: "var(--gray)" }}>{timeAgo(entry.timestamp)}</p>
                      <p className="text-xs mt-1" style={{ color: "var(--border)" }}>
                        {isOpen ? "▲" : "▼"}
                      </p>
                    </div>
                  </div>

                  {/* Expanded reasoning */}
                  {isOpen && (
                    <div
                      className="px-5 pb-5 pt-1 border-t"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <p className="label mb-2">Full Reasoning</p>
                      <p className="text-sm leading-relaxed" style={{ color: "#c8d6ef" }}>
                        {entry.reasoning}
                      </p>
                      {entry.txHash && (
                        <div className="mt-3">
                          <p className="label mb-1">Transaction</p>
                          <a
                            href={`https://testnet.monadexplorer.com/tx/${entry.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono"
                            style={{ color: "var(--teal)" }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {entry.txHash.slice(0, 20)}…{entry.txHash.slice(-8)} ↗
                          </a>
                        </div>
                      )}
                      <p className="text-xs mt-3" style={{ color: "var(--gray)" }}>
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
