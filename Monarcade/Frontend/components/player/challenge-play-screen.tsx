"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { pageContainerClass } from "@/lib/layout";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/monad";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase =
  | "loading"
  | "intro"
  | "r1"
  | "transition"
  | "r2"
  | "transition2"
  | "r3"
  | "transition3"
  | "r4"
  | "transition4"
  | "r5"
  | "submitting"
  | "result"
  | "error";

type SessionBrand = {
  name: string;
  logoPath: string;
  tagline: string;
  brandFact?: string;
  brandColor?: string;
};

type SessionRounds = {
  r1: { imageUrls: string[] };
  r2: { choices: string[]; variant: string };
  r3: { choices: string[]; variant: string };
  r4: { choices: string[]; variant: string };
  r5: { choices: string[]; variant: string };
};

type SessionData = {
  sessionId: string;
  brand: SessionBrand;
  rounds: SessionRounds;
  expiresAt: number;
};

type RoundResult = {
  choiceIndex: number;
  timeMs: number;
};

type SubmitResult = {
  score: number;
  r1Score: number;
  r2Score: number;
  r3Score: number;
  r4Score: number;
  r5Score: number;
  txHash?: string;
  blockNumber?: string;
};

type ChallengePlayScreenProps = {
  challengeId: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INTRO_DURATION_MS = 5000;
const R1_TIMEOUT_MS = 5000;
const R2_TIMEOUT_MS = 10000;
const R3_TIMEOUT_MS = 15000;
const R4_TIMEOUT_MS = 15000;
const R5_TIMEOUT_MS = 10000;
const MAX_PTS_PER_ROUND = 60;
const EXPLORER_BASE = "https://testnet.monadexplorer.com";

// ---------------------------------------------------------------------------
// Audio helpers (preserved from original)
// ---------------------------------------------------------------------------

const getAudioContext = () => {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Ctx ? new Ctx() : null;
};

const playFeedbackTone = (ctx: AudioContext, isCorrect: boolean) => {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.connect(ctx.destination);
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(isCorrect ? 0.35 : 0.4, now + 0.01);
  master.gain.exponentialRampToValueAtTime(0.0001, now + (isCorrect ? 0.45 : 0.35));

  const notes = isCorrect
    ? [
        { freq: 784, end: 1046, start: 0, dur: 0.08, type: "square" as OscillatorType },
        { freq: 1046, end: 1318, start: 0.075, dur: 0.09, type: "square" as OscillatorType },
        { freq: 1318, end: 1568, start: 0.15, dur: 0.14, type: "triangle" as OscillatorType },
      ]
    : [
        { freq: 210, end: 170, start: 0, dur: 0.11, type: "square" as OscillatorType },
        { freq: 170, end: 132, start: 0.08, dur: 0.12, type: "sawtooth" as OscillatorType },
        { freq: 132, end: 96, start: 0.16, dur: 0.14, type: "square" as OscillatorType },
      ];

  for (const n of notes) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const t0 = now + n.start;
    const t1 = t0 + n.dur;
    osc.type = n.type;
    osc.frequency.setValueAtTime(n.freq, t0);
    osc.frequency.exponentialRampToValueAtTime(n.end, t1);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t1);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t1);
  }
};

// ---------------------------------------------------------------------------
// Animated score hook
// ---------------------------------------------------------------------------

function useCountUp(target: number, durationMs = 1500) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const start = performance.now();
    let raf: number;
    function tick() {
      const elapsed = performance.now() - start;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function BrandIntro({
  brand,
  onComplete,
}: {
  brand: SessionBrand;
  onComplete: () => void;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = Date.now();
    let raf: number;
    function tick() {
      const elapsed = Date.now() - start;
      const pct = Math.min((elapsed / INTRO_DURATION_MS) * 100, 100);
      setProgress(pct);
      if (pct < 100) {
        raf = requestAnimationFrame(tick);
      } else {
        onComplete();
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onComplete]);

  const accentColor = brand.brandColor || "var(--color-primary)";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6" style={{ background: `linear-gradient(135deg, ${accentColor}, var(--color-secondary))` }}>
      <p className="mb-6 text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
        Study this brand — you will be tested
      </p>

      {brand.logoPath ? (
        <img src={brand.logoPath} alt={brand.name} className="mb-4 h-20 w-20 rounded-2xl object-cover shadow-lg" />
      ) : (
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold text-white shadow-lg">
          {brand.name.charAt(0).toUpperCase()}
        </div>
      )}

      <h1 className="mb-2 text-3xl font-bold text-white sm:text-4xl">{brand.name}</h1>
      <p className="mb-4 max-w-md text-center text-lg text-white/80 italic">&ldquo;{brand.tagline}&rdquo;</p>

      {brand.brandFact ? (
        <p className="mb-6 max-w-md text-center text-sm text-white/60">
          <span className="mr-1">&#128161;</span>{brand.brandFact}
        </p>
      ) : null}

      <div className="h-1 w-48 overflow-hidden rounded-full bg-white/20">
        <div className="h-full rounded-full bg-white transition-none" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function LogoSpotRound({
  imageUrls,
  brandName,
  onResult,
}: {
  imageUrls: string[];
  brandName: string;
  onResult: (tappedIndex: number, timeMs: number) => void;
}) {
  const startRef = useRef(0);
  const [timeLeft, setTimeLeft] = useState(R1_TIMEOUT_MS);
  const [tapped, setTapped] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startRef.current = performance.now();
    const id = setInterval(() => {
      const elapsed = performance.now() - startRef.current;
      setTimeLeft(Math.max(0, R1_TIMEOUT_MS - elapsed));
      if (elapsed >= R1_TIMEOUT_MS) {
        clearInterval(id);
        onResult(-1, R1_TIMEOUT_MS);
      }
    }, 50);
    timerRef.current = id;
    return () => clearInterval(id);
  }, [onResult]);

  const handleTap = (index: number) => {
    if (tapped !== null) return;
    const timeMs = Math.round(performance.now() - startRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    setTapped(index);
    setTimeout(() => onResult(index, timeMs), 400);
  };

  return (
    <div className="rounded-2xl border border-app bg-app-surface p-4 shadow-app sm:rounded-[2rem] sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">
          Round 1 — Spot the Logo
        </p>
        <p className="font-mono text-base font-semibold text-app">{(timeLeft / 1000).toFixed(1)}s</p>
      </div>
      <p className="mt-1 text-xs text-app-muted">Find the real {brandName} logo</p>
      <div className="mx-auto mt-3 grid max-w-sm grid-cols-3 gap-1.5 sm:mt-4 sm:max-w-md sm:gap-2.5">
        {imageUrls.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleTap(i)}
            disabled={tapped !== null}
            className={`aspect-square cursor-pointer overflow-hidden rounded-lg border-2 transition-all duration-200 sm:rounded-xl ${
              tapped === i
                ? "scale-105 border-primary ring-2 ring-primary/40"
                : tapped !== null
                  ? "opacity-40 border-transparent"
                  : "border-app hover:border-primary/50 hover:scale-[1.02]"
            }`}
          >
            <img src={url} alt={`Option ${i + 1}`} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

function ColorSwatchRound({
  colors,
  timeoutMs,
  onResult,
}: {
  colors: string[];
  timeoutMs: number;
  onResult: (choiceIndex: number, timeMs: number) => void;
}) {
  const startRef = useRef(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(timeoutMs);

  useEffect(() => {
    startRef.current = performance.now();
    const id = setInterval(() => {
      const elapsed = performance.now() - startRef.current;
      setTimeLeft(Math.max(0, timeoutMs - elapsed));
      if (elapsed >= timeoutMs) {
        clearInterval(id);
        onResult(-1, timeoutMs);
      }
    }, 100);
    return () => clearInterval(id);
  }, [onResult, timeoutMs]);

  const handleSelect = (index: number) => {
    if (selected !== null) return;
    const timeMs = Math.round(performance.now() - startRef.current);
    setSelected(index);
    setTimeout(() => onResult(index, timeMs), 400);
  };

  return (
    <div>
      <div className="flex items-center justify-end">
        <p className="font-mono text-base font-semibold text-app">{(timeLeft / 1000).toFixed(1)}s</p>
      </div>
      <div className="mx-auto mt-3 grid max-w-xs grid-cols-2 gap-2.5 sm:max-w-sm sm:gap-3">
        {colors.map((color, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSelect(i)}
            disabled={selected !== null}
            className={`flex aspect-square cursor-pointer items-center justify-center rounded-xl border-2 transition-all duration-200 ${
              selected === i
                ? "scale-105 border-primary ring-2 ring-primary/40"
                : selected !== null
                  ? "opacity-40 border-transparent"
                  : "border-app hover:border-primary/50 hover:scale-[1.02]"
            }`}
          >
            <div
              className="h-14 w-14 rounded-lg shadow-app sm:h-16 sm:w-16"
              style={{ backgroundColor: color }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function ChoiceRound({
  title,
  subtitle,
  choices,
  timeoutMs,
  onResult,
}: {
  title: string;
  subtitle: string;
  choices: string[];
  timeoutMs: number;
  onResult: (choiceIndex: number, timeMs: number) => void;
}) {
  const startRef = useRef(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(timeoutMs);

  useEffect(() => {
    startRef.current = performance.now();
    const id = setInterval(() => {
      const elapsed = performance.now() - startRef.current;
      setTimeLeft(Math.max(0, timeoutMs - elapsed));
      if (elapsed >= timeoutMs) {
        clearInterval(id);
        onResult(-1, timeoutMs);
      }
    }, 100);
    return () => clearInterval(id);
  }, [onResult, timeoutMs]);

  const handleSelect = (index: number) => {
    if (selected !== null) return;
    const timeMs = Math.round(performance.now() - startRef.current);
    setSelected(index);
    setTimeout(() => onResult(index, timeMs), 600);
  };

  const labels = ["A", "B", "C", "D"];

  return (
    <div className="rounded-2xl border border-app bg-app-surface p-4 shadow-app sm:rounded-[2rem] sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">{title}</p>
        <p className="font-mono text-base font-semibold text-app">{(timeLeft / 1000).toFixed(1)}s</p>
      </div>
      <p className="mt-1 text-xs text-app-muted">{subtitle}</p>
      <div className="mt-3 grid gap-1.5 sm:mt-4 sm:gap-2">
        {choices.map((choice, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSelect(i)}
            disabled={selected !== null}
            className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3 ${
              selected === i
                ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                : selected !== null
                  ? "opacity-40 border-transparent"
                  : "border-app bg-app hover:border-primary/40 hover:bg-app-soft"
            }`}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-app-soft text-xs font-bold text-app-muted sm:h-8 sm:w-8 sm:text-sm">
              {labels[i]}
            </span>
            <span className="text-sm text-app sm:text-base">{choice}</span>
            {selected === i ? (
              <span className="ml-auto text-[0.65rem] font-semibold uppercase text-primary">Selected</span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function ScoreReveal({
  result,
  brand,
  challengeId,
}: {
  result: SubmitResult;
  brand: SessionBrand;
  challengeId: string;
}) {
  const displayScore = useCountUp(result.score);
  const pct = Math.round((displayScore / 300) * 100);
  const highScore = result.score >= 200;

  const rounds = [
    { label: "Logo Spot", score: result.r1Score, max: MAX_PTS_PER_ROUND },
    { label: "Brand Color", score: result.r2Score, max: MAX_PTS_PER_ROUND },
    { label: "Tagline Match", score: result.r3Score, max: MAX_PTS_PER_ROUND },
    { label: "Brand Fact", score: result.r4Score, max: MAX_PTS_PER_ROUND },
    { label: "Category", score: result.r5Score, max: MAX_PTS_PER_ROUND },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-[2rem] border border-app bg-app-surface p-6 shadow-app sm:p-8">
        <div className="flex flex-wrap items-center gap-4">
          {brand.logoPath ? (
            <img src={brand.logoPath} alt={brand.name} className="h-12 w-12 rounded-xl object-cover" />
          ) : null}
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-app-muted">Challenge Complete</p>
            <p className="text-lg font-semibold text-app">{brand.name}</p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-6xl font-bold tracking-tight text-app sm:text-7xl">{displayScore}</p>
          <p className="mt-1 text-sm text-app-muted">out of 300</p>
        </div>

        <div className="mx-auto mt-4 h-3 max-w-xs overflow-hidden rounded-full bg-app-soft">
          <div
            className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        {result.txHash ? (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-app-muted">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            <span>
              Settled on Monad ~400ms{" "}
              <a
                href={`${EXPLORER_BASE}/tx/${result.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary/70 underline hover:text-primary"
              >
                View tx
              </a>
            </span>
          </div>
        ) : null}

        {highScore ? (
          <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
            {Array.from({ length: 24 }).map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.8}s`,
                  backgroundColor: ["#836EF9", "#F59E0B", "#10B981", "#EF4444", "#EC4899"][i % 5],
                  width: `${6 + Math.random() * 6}px`,
                  height: `${6 + Math.random() * 6}px`,
                  borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="rounded-[2rem] border border-app bg-app-surface p-5 shadow-app sm:p-6">
        <p className="text-base font-semibold uppercase tracking-[0.14em] text-app-muted sm:text-lg">Round Breakdown</p>
        <div className="mt-3 space-y-2">
          {rounds.map((r) => (
            <div key={r.label} className="flex items-center justify-between rounded-2xl bg-app px-4 py-3">
              <div className="flex items-center gap-2">
                <span className={`text-base ${r.score > 0 ? "text-green-500" : "text-red-400"}`}>
                  {r.score > 0 ? "\u2713" : "\u2717"}
                </span>
                <span className="text-sm text-app-muted">{r.label}</span>
              </div>
              <span className="text-sm font-bold text-app">{r.score} / {r.max}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href={`/challenge/${challengeId}/leaderboard`}
          className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary px-5 py-3 text-lg font-semibold text-white transition-all duration-200 hover:brightness-110 dark:text-[#2f1736] sm:min-h-14"
          style={{ color: "var(--color-white)" }}
        >
          View Leaderboard
        </Link>
        <Link
          href="/challenge"
          className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-app bg-app px-5 py-3 text-lg font-semibold text-app transition-colors duration-200 hover:bg-app-soft sm:min-h-14"
        >
          Try Another Challenge
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component — State Machine
// ---------------------------------------------------------------------------

export function ChallengePlayScreen({ challengeId }: ChallengePlayScreenProps) {
  const { isLoading: authLoading } = useAuth();
  const { ready: privyReady, authenticated: privyAuthenticated, getAccessToken } = usePrivy();
  const { wallets } = useWallets();

  const [phase, setPhase] = useState<Phase>("loading");
  const [session, setSession] = useState<SessionData | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const r1Ref = useRef<RoundResult | null>(null);
  const r2Ref = useRef<RoundResult | null>(null);
  const r3Ref = useRef<RoundResult | null>(null);
  const r4Ref = useRef<RoundResult | null>(null);
  const r5Ref = useRef<RoundResult | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Use embedded wallet address (available immediately, no smart wallet needed).
  // Players never sign transactions — address is just an identifier.
  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
  const walletAddress = embeddedWallet?.address ?? "";

  // ---- Fetch session on mount ----
  useEffect(() => {
    if (!privyReady || !privyAuthenticated || !walletAddress) return;

    // Resolve challengeId — must be a valid integer
    const numericId = Number(challengeId);
    if (!Number.isFinite(numericId) || numericId < 1) {
      setErrorMsg("Invalid challenge ID");
      setPhase("error");
      return;
    }

    let cancelled = false;

    async function startSession() {
      try {
        const token = await getAccessToken();
        if (cancelled) return;
        if (!token) {
          throw new Error("Not authenticated. Please sign in and try again.");
        }

        const res = await fetch(`${API_BASE_URL}/session/start`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            challengeId: numericId,
            playerAddress: walletAddress,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          const msg =
            (data?.error?.message ?? data?.error ?? data?.message) ||
            `Session start failed (${res.status})`;
          throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
        }

        const data = await res.json();
        if (!cancelled) {
          setSession(data as SessionData);
          setPhase("intro");
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMsg((err as Error).message);
          setPhase("error");
        }
      }
    }

    startSession();
    return () => { cancelled = true; };
  }, [privyReady, privyAuthenticated, walletAddress, challengeId, getAccessToken]);

  // ---- Submit results ----
  const submitResults = useCallback(async () => {
    if (!session || !r1Ref.current || !r2Ref.current || !r3Ref.current || !r4Ref.current || !r5Ref.current) return;
    setPhase("submitting");

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("No auth token");

      const res = await fetch(`${API_BASE_URL}/session/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId: session.sessionId,
          r1: {
            tappedIndex: Math.max(0, r1Ref.current.choiceIndex),
            timeMs: Math.min(Math.max(150, r1Ref.current.timeMs), 5000),
          },
          r2: {
            choiceIndex: Math.max(0, r2Ref.current.choiceIndex),
            timeMs: Math.min(Math.max(0, r2Ref.current.timeMs), 10000),
          },
          r3: {
            choiceIndex: Math.max(0, r3Ref.current.choiceIndex),
            timeMs: Math.min(Math.max(0, r3Ref.current.timeMs), 15000),
          },
          r4: {
            choiceIndex: Math.max(0, r4Ref.current.choiceIndex),
            timeMs: Math.min(Math.max(0, r4Ref.current.timeMs), 15000),
          },
          r5: {
            choiceIndex: Math.max(0, r5Ref.current.choiceIndex),
            timeMs: Math.min(Math.max(0, r5Ref.current.timeMs), 10000),
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg =
          (data?.error?.message ?? data?.error ?? data?.message) ||
          `Submit failed (${res.status})`;
        throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
      }

      const data = (await res.json()) as SubmitResult;
      setSubmitResult(data);
      setPhase("result");
    } catch (err) {
      setErrorMsg((err as Error).message);
      setPhase("error");
    }
  }, [session, getAccessToken]);

  // ---- Round callbacks ----
  const handleR1 = useCallback(
    (tappedIndex: number, timeMs: number) => {
      r1Ref.current = { choiceIndex: tappedIndex, timeMs };
      const ctx = audioCtxRef.current ?? getAudioContext();
      if (ctx) {
        audioCtxRef.current = ctx;
        playFeedbackTone(ctx, tappedIndex >= 0);
      }
      setPhase("transition");
    },
    [],
  );

  const handleR2 = useCallback(
    (choiceIndex: number, timeMs: number) => {
      r2Ref.current = { choiceIndex, timeMs };
      const ctx = audioCtxRef.current ?? getAudioContext();
      if (ctx) playFeedbackTone(ctx, choiceIndex >= 0);
      setPhase("transition2");
    },
    [],
  );

  const handleR3 = useCallback(
    (choiceIndex: number, timeMs: number) => {
      r3Ref.current = { choiceIndex, timeMs };
      const ctx = audioCtxRef.current ?? getAudioContext();
      if (ctx) playFeedbackTone(ctx, choiceIndex >= 0);
      setPhase("transition3");
    },
    [],
  );

  const handleR4 = useCallback(
    (choiceIndex: number, timeMs: number) => {
      r4Ref.current = { choiceIndex, timeMs };
      const ctx = audioCtxRef.current ?? getAudioContext();
      if (ctx) playFeedbackTone(ctx, choiceIndex >= 0);
      setPhase("transition4");
    },
    [],
  );

  const handleR5 = useCallback(
    (choiceIndex: number, timeMs: number) => {
      r5Ref.current = { choiceIndex, timeMs };
      const ctx = audioCtxRef.current ?? getAudioContext();
      if (ctx) playFeedbackTone(ctx, choiceIndex >= 0);
      submitResults();
    },
    [submitResults],
  );

  // ---- Transition timers ----
  useEffect(() => {
    const transitions: Record<string, Phase> = {
      transition: "r2",
      transition2: "r3",
      transition3: "r4",
      transition4: "r5",
    };
    const next = transitions[phase];
    if (!next) return;
    const id = setTimeout(() => setPhase(next), 1000);
    return () => clearTimeout(id);
  }, [phase]);

  // ---- Scroll to top on every phase change ----
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [phase]);

  // ---- Cleanup audio context ----
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) void audioCtxRef.current.close().catch(() => {});
    };
  }, []);

  // ---- Auth gate ----
  if (authLoading || !privyReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app text-app">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!privyAuthenticated || !walletAddress) {
    return (
      <div className="page-typography flex min-h-screen flex-col bg-app text-app">
        <Navbar />
        <main className="flex flex-1 items-center justify-center">
          <div className="max-w-md text-center">
            <p className="text-2xl font-semibold text-app">Sign in to play</p>
            <p className="mt-2 text-app-muted">Connect your account to start this challenge.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ---- Render phase ----
  return (
    <div className="page-typography min-h-screen bg-app text-app">
      {phase === "intro" && session ? (
        <BrandIntro brand={session.brand} onComplete={() => setPhase("r1")} />
      ) : null}

      {phase !== "intro" ? <Navbar /> : null}

      {phase !== "intro" ? (
        <main className="w-full py-6 sm:py-8 lg:py-10">
          <section className={`${pageContainerClass} space-y-5`}>

            {/* Loading */}
            {phase === "loading" ? (
              <div className="flex flex-col items-center gap-3 py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-app-muted">Preparing your challenge...</p>
              </div>
            ) : null}

            {/* Round 1 */}
            {phase === "r1" && session ? (
              <LogoSpotRound
                imageUrls={session.rounds.r1.imageUrls}
                brandName={session.brand.name}
                onResult={handleR1}
              />
            ) : null}

            {/* Transition 1 → 2 */}
            {phase === "transition" ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-2xl font-semibold text-app-muted">Round 2</p>
              </div>
            ) : null}

            {/* Round 2 — Brand Color */}
            {phase === "r2" && session ? (
              session.rounds.r2.variant === "color_match" ? (
                <div className="rounded-[2rem] border border-app bg-app-surface p-5 shadow-app sm:p-6">
                  <p className="text-base font-semibold uppercase tracking-[0.14em] text-app-muted sm:text-lg">
                    Round 2 — Brand Color
                  </p>
                  <p className="mt-1 text-sm text-app-muted">Pick {session.brand.name}&apos;s brand color</p>
                  <ColorSwatchRound
                    colors={session.rounds.r2.choices}
                    timeoutMs={R2_TIMEOUT_MS}
                    onResult={handleR2}
                  />
                </div>
              ) : (
                <ChoiceRound
                  title="Round 2 — Tagline Match"
                  subtitle={`Which tagline belongs to ${session.brand.name}?`}
                  choices={session.rounds.r2.choices}
                  timeoutMs={R2_TIMEOUT_MS}
                  onResult={handleR2}
                />
              )
            ) : null}

            {/* Transition 2 → 3 */}
            {phase === "transition2" ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-2xl font-semibold text-app-muted">Round 3</p>
              </div>
            ) : null}

            {/* Round 3 — Tagline Match */}
            {phase === "r3" && session ? (
              <ChoiceRound
                title="Round 3 — Tagline Match"
                subtitle={`Which tagline belongs to ${session.brand.name}?`}
                choices={session.rounds.r3.choices}
                timeoutMs={R3_TIMEOUT_MS}
                onResult={handleR3}
              />
            ) : null}

            {/* Transition 3 → 4 */}
            {phase === "transition3" ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-2xl font-semibold text-app-muted">Round 4</p>
              </div>
            ) : null}

            {/* Round 4 — Brand Fact or Real/Fake */}
            {phase === "r4" && session ? (
              <ChoiceRound
                title={
                  session.rounds.r4.variant === "fact_match"
                    ? "Round 4 — Brand Fact"
                    : "Round 4 — Real or Fake"
                }
                subtitle={
                  session.rounds.r4.variant === "fact_match"
                    ? `Which fact is true about ${session.brand.name}?`
                    : `Which is the real ${session.brand.name} logo?`
                }
                choices={session.rounds.r4.choices}
                timeoutMs={R4_TIMEOUT_MS}
                onResult={handleR4}
              />
            ) : null}

            {/* Transition 4 → 5 */}
            {phase === "transition4" ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-2xl font-semibold text-app-muted">Final Round</p>
              </div>
            ) : null}

            {/* Round 5 — Category Match */}
            {phase === "r5" && session ? (
              <ChoiceRound
                title="Round 5 — Category Match"
                subtitle={`What category does ${session.brand.name} belong to?`}
                choices={session.rounds.r5.choices}
                timeoutMs={R5_TIMEOUT_MS}
                onResult={handleR5}
              />
            ) : null}

            {/* Submitting */}
            {phase === "submitting" ? (
              <div className="flex flex-col items-center gap-3 py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-app-muted">Submitting score on-chain...</p>
              </div>
            ) : null}

            {/* Result */}
            {phase === "result" && session && submitResult ? (
              <ScoreReveal
                result={submitResult}
                brand={session.brand}
                challengeId={challengeId}
              />
            ) : null}

            {/* Error */}
            {phase === "error" ? (
              errorMsg.toLowerCase().includes("already played") ? (
                <div className="rounded-[2rem] border border-app bg-app-surface p-6 shadow-app">
                  <p className="text-xl font-semibold text-app">You&apos;ve already played this challenge</p>
                  <p className="mt-2 text-sm text-app-muted">Each player gets one attempt per challenge. Check the leaderboard to see your ranking.</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={`/challenge/${challengeId}/leaderboard`}
                      className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-primary px-6 py-3 text-base font-semibold text-white transition-all hover:brightness-110 dark:text-[#2f1736]"
                      style={{ color: "var(--color-white)" }}
                    >
                      View Leaderboard
                    </Link>
                    <Link
                      href="/challenge"
                      className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-app bg-app px-6 py-3 text-base font-semibold text-app transition-colors hover:bg-app-soft"
                    >
                      Try Another Challenge
                    </Link>
                  </div>
                </div>
              ) : (
              <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 dark:border-red-900/40 dark:bg-red-950/20">
                <p className="text-base font-semibold text-red-700 dark:text-red-400">Something went wrong</p>
                <p className="mt-2 text-sm text-red-600 dark:text-red-400/80">{errorMsg}</p>
                <div className="mt-4 flex gap-3">
                  <Link
                    href={`/challenge/${challengeId}`}
                    className="inline-flex items-center rounded-xl border border-app bg-app px-4 py-2 text-sm font-semibold text-app transition-colors hover:bg-app-soft"
                  >
                    Back to Challenge
                  </Link>
                  <Link
                    href="/challenge"
                    className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-all hover:brightness-110 dark:text-[#2f1736]"
                    style={{ color: "var(--color-white)" }}
                  >
                    Browse Challenges
                  </Link>
                </div>
              </div>
              )
            ) : null}

          </section>
        </main>
      ) : null}

      {phase !== "intro" ? <Footer /> : null}
    </div>
  );
}
