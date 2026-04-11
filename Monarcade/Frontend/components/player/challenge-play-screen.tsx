"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { pageContainerClass } from "@/lib/layout";

type OptionType = "text" | "logo" | "color";

type QuestionOption = {
  id: string;
  label: string;
  detail?: string;
  logoMark?: string;
  colorValue?: string;
};

type ColorQuestionOption = QuestionOption & {
  colorValue: string;
};

type LogoQuestionOption = QuestionOption & {
  logoMark: string;
};

type ChallengeQuestion = {
  id: string;
  prompt: string;
  optionType: OptionType;
  options: QuestionOption[];
  correctOptionId: string;
};

type ChallengeRound = {
  id: string;
  title: string;
  questions: ChallengeQuestion[];
};

type ChallengePlayScreenProps = {
  challengeId: string;
};

const roundDurationSeconds = 15;

const challengeBlueprint = {
  brandName: "Bites",
  brandCategory: "Food",
  logoMark: "BI",
  rounds: [
    {
      id: "round-1",
      title: "1",
      questions: [
        {
          id: "r1-logo",
          prompt: "Spot the Brand's official logo.",
          optionType: "logo",
          correctOptionId: "logo-a",
          options: [
            { id: "logo-a", label: "", detail: "", logoMark: "BI" },
            { id: "logo-b", label: "", detail: "", logoMark: "BZ" },
            { id: "logo-c", label: "", detail: "", logoMark: "BY" },
            { id: "logo-d", label: "", detail: "", logoMark: "BT" },
          ],
        },
        {
          id: "r1-color",
          prompt: "Pick the core brand color.",
          optionType: "color",
          correctOptionId: "color-a",
          options: [
            { id: "color-a", label: "Signature berry", colorValue: "var(--color-primary)" },
            { id: "color-b", label: "Deep plum", colorValue: "var(--color-secondary)" },
            { id: "color-c", label: "Soft neutral", colorValue: "var(--color-neutral)" },
            { id: "color-d", label: "Light cream", colorValue: "var(--color-tertiary)" },
          ],
        },
        {
          id: "r1-tagline",
          prompt: "Choose the Brand's tagline.",
          optionType: "text",
          correctOptionId: "tagline-a",
          options: [
            { id: "tagline-a", label: "Crave the crunch." },
            { id: "tagline-b", label: "Snack louder. Play smarter." },
            { id: "tagline-c", label: "Crunch once. Remember forever." },
            { id: "tagline-d", label: "Fast bites. Bold life." },
          ],
        },
      ],
    },
    {
      id: "round-2",
      title: "2",
      questions: [
        {
          id: "r2-fact",
          prompt: "Pick the real random fact about Bites.",
          optionType: "text",
          correctOptionId: "fact-c",
          options: [
            { id: "fact-a", label: "Bites started as a mountain hiking club snack line in 2004." },
            { id: "fact-b", label: "The first Bites product was a frozen dessert only sold in airports." },
            {
              id: "fact-c",
              label: "Bites launched a campus pop-up tasting tour in Lagos before scaling online.",
            },
            { id: "fact-d", label: "Bites became famous after only selling midnight-only vending packs." },
          ],
        },
        {
          id: "r2-logo",
          prompt: "Select the exact real Bites logo from these similar options.",
          optionType: "logo",
          correctOptionId: "logo-2b",
          options: [
            { id: "logo-2a", label: "Similar logo", detail: "BIIES", logoMark: "BI" },
            { id: "logo-2b", label: "Official logo", detail: "BITES", logoMark: "BI" },
            { id: "logo-2c", label: "Similar logo", detail: "B!TES", logoMark: "B!" },
            { id: "logo-2d", label: "Similar logo", detail: "BIT3S", logoMark: "B3" },
          ],
        },
      ],
    },
  ] satisfies ChallengeRound[],
};

const formatTimer = (seconds: number) => {
  const safe = Math.max(seconds, 0);
  const minutes = Math.floor(safe / 60);
  const remainingSeconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
};

const hasColorValue = (option: QuestionOption): option is ColorQuestionOption => Boolean(option.colorValue);

const hasLogoMark = (option: QuestionOption): option is LogoQuestionOption => Boolean(option.logoMark);

const getAudioContext = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextClass =
    window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  return AudioContextClass ? new AudioContextClass() : null;
};

const playFeedbackTone = (audioContext: AudioContext, isCorrect: boolean) => {
  const now = audioContext.currentTime;
  const masterGain = audioContext.createGain();
  const compressor = audioContext.createDynamicsCompressor();
  const filter = audioContext.createBiquadFilter();

  compressor.threshold.setValueAtTime(-18, now);
  compressor.knee.setValueAtTime(12, now);
  compressor.ratio.setValueAtTime(10, now);
  compressor.attack.setValueAtTime(0.003, now);
  compressor.release.setValueAtTime(0.18, now);

  filter.type = isCorrect ? "highpass" : "lowpass";
  filter.frequency.setValueAtTime(isCorrect ? 180 : 900, now);
  filter.Q.setValueAtTime(isCorrect ? 1.4 : 0.9, now);

  masterGain.connect(filter);
  filter.connect(compressor);
  compressor.connect(audioContext.destination);

  masterGain.gain.setValueAtTime(0.0001, now);
  masterGain.gain.exponentialRampToValueAtTime(isCorrect ? 0.4 : 0.5, now + 0.01);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, now + (isCorrect ? 0.5 : 0.38));

  const notes = isCorrect
    ? [
        { frequency: 784, endFrequency: 1046, start: 0, duration: 0.08, type: "square" as OscillatorType, gain: 0.32 },
        { frequency: 1046, endFrequency: 1318, start: 0.075, duration: 0.09, type: "square" as OscillatorType, gain: 0.32 },
        { frequency: 1318, endFrequency: 1568, start: 0.15, duration: 0.14, type: "triangle" as OscillatorType, gain: 0.28 },
        { frequency: 1568, endFrequency: 1760, start: 0.24, duration: 0.16, type: "sine" as OscillatorType, gain: 0.22 },
      ]
    : [
        { frequency: 210, endFrequency: 170, start: 0, duration: 0.11, type: "square" as OscillatorType, gain: 0.34 },
        { frequency: 170, endFrequency: 132, start: 0.08, duration: 0.12, type: "sawtooth" as OscillatorType, gain: 0.32 },
        { frequency: 132, endFrequency: 96, start: 0.16, duration: 0.14, type: "square" as OscillatorType, gain: 0.32 },
      ];

  notes.forEach((note) => {
    const oscillator = audioContext.createOscillator();
    const noteGain = audioContext.createGain();
    const startTime = now + note.start;
    const endTime = startTime + note.duration;

    oscillator.type = note.type;
    oscillator.frequency.setValueAtTime(note.frequency, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(note.endFrequency, endTime);

    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.exponentialRampToValueAtTime(note.gain, startTime + 0.01);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

    oscillator.connect(noteGain);
    noteGain.connect(masterGain);
    oscillator.start(startTime);
    oscillator.stop(endTime);
  });
};

export function ChallengePlayScreen({ challengeId }: ChallengePlayScreenProps) {
  const router = useRouter();
  const [roundIndex, setRoundIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(roundDurationSeconds);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [feedbackState, setFeedbackState] = useState<{ selectedOptionId: string; isCorrect: boolean } | null>(null);
  const submitRoundRef = useRef<(fromTimeout: boolean) => void>(() => {});
  const audioContextRef = useRef<AudioContext | null>(null);
  const isSubmittingRoundRef = useRef(false);
  const hasFinishedRef = useRef(false);

  const rounds = challengeBlueprint.rounds;
  const activeRound = rounds[roundIndex] ?? rounds[0];
  const activeQuestion = activeRound.questions[questionIndex] ?? activeRound.questions[0];

  const activeAnswer = selectedAnswers[activeQuestion.id] ?? "";
  const isLastQuestionInRound = questionIndex === activeRound.questions.length - 1;
  const isFinalRound = roundIndex === rounds.length - 1;

  const allQuestions = useMemo(() => rounds.flatMap((round) => round.questions), [rounds]);

  const submitRound = useCallback(
    (fromTimeout: boolean) => {
      if (hasFinishedRef.current || isSubmittingRoundRef.current) {
        return;
      }

      isSubmittingRoundRef.current = true;

      if (!isFinalRound) {
        setRoundIndex((current) => Math.min(current + 1, rounds.length - 1));
        setQuestionIndex(0);
        setTimeLeft(roundDurationSeconds);
        setFeedbackState(null);
        return;
      }

      hasFinishedRef.current = true;

      const correctAnswers = allQuestions.reduce((count, question) => {
        const selectedOptionId = selectedAnswers[question.id];
        return selectedOptionId === question.correctOptionId ? count + 1 : count;
      }, 0);

      const round1 = rounds[0];
      const round2 = rounds[1];
      const round1Correct = round1.questions.reduce((count, question) => {
        const selectedOptionId = selectedAnswers[question.id];
        return selectedOptionId === question.correctOptionId ? count + 1 : count;
      }, 0);
      const round2Correct = round2.questions.reduce((count, question) => {
        const selectedOptionId = selectedAnswers[question.id];
        return selectedOptionId === question.correctOptionId ? count + 1 : count;
      }, 0);
      const finalScore = Math.round((correctAnswers / allQuestions.length) * 100);

      const reason = fromTimeout ? "timeout" : "manual";
      router.push(
        `/challenge/${challengeId}/results?correct=${correctAnswers}&total=${allQuestions.length}&reason=${reason}&round1Correct=${round1Correct}&round1Total=${round1.questions.length}&round2Correct=${round2Correct}&round2Total=${round2.questions.length}&outcome=${finalScore >= 70 ? "win" : "lose"}`,
      );
    },
    [allQuestions, challengeId, isFinalRound, rounds, router, selectedAnswers],
  );

  useEffect(() => {
    submitRoundRef.current = submitRound;
  }, [submitRound]);

  useEffect(() => {
    isSubmittingRoundRef.current = false;
  }, [roundIndex]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTimeLeft((currentValue) => {
        if (currentValue <= 1) {
          window.clearInterval(intervalId);
          window.setTimeout(() => submitRoundRef.current(true), 0);
          return 0;
        }

        return currentValue - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [roundIndex]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        void audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const handleSelectAnswer = (optionId: string) => {
    if (feedbackState || isSubmittingRoundRef.current || hasFinishedRef.current) {
      return;
    }

    const isCorrect = optionId === activeQuestion.correctOptionId;
    setSelectedAnswers((current) => ({ ...current, [activeQuestion.id]: optionId }));
    setFeedbackState({ selectedOptionId: optionId, isCorrect });

    const audioContext = audioContextRef.current ?? getAudioContext();
    if (audioContext) {
      audioContextRef.current = audioContext;
      if (audioContext.state === "suspended") {
        void audioContext.resume().then(() => playFeedbackTone(audioContext, isCorrect));
      } else {
        playFeedbackTone(audioContext, isCorrect);
      }
    }

    if (isLastQuestionInRound && isFinalRound) {
      submitRound(false);
      return;
    }

    window.setTimeout(() => {
      setFeedbackState(null);

      if (isLastQuestionInRound) {
        submitRound(false);
        return;
      }

      setQuestionIndex((current) => current + 1);
    }, 700);
  };

  return (
    <div className="page-typography player-dashboard-typography min-h-screen bg-app text-app">
      <Navbar />

      <main className="w-full pb-14 pt-4 sm:pt-6 lg:pb-16 lg:pt-8">
        <section className={`${pageContainerClass} space-y-5 sm:space-y-6`}>
          <header className="rounded-[2rem] border border-app bg-app-surface p-4 shadow-app sm:p-5 lg:p-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:gap-4">
              <div className="rounded-2xl bg-app px-4 py-3 xl:col-span-2">
                <p className="text-base font-semibold uppercase tracking-[0.16em] text-app-muted sm:text-lg">Brand</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight text-app sm:text-4xl">{challengeBlueprint.brandName}</h1>
                <p className="mt-2 text-lg text-app-muted sm:text-xl">{challengeBlueprint.brandCategory}</p>
              </div>

              <div className="rounded-2xl bg-app px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold uppercase tracking-[0.16em] text-app-muted sm:text-lg">Round</p>
                    <p className="mt-1 text-2xl font-semibold text-app sm:text-3xl">{activeRound.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold uppercase tracking-[0.16em] text-app-muted sm:text-lg">Timer</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-app sm:text-3xl">{formatTimer(timeLeft)}</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <section className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
            <article className="rounded-[2rem] border border-app bg-app-surface p-5 shadow-app sm:p-6 lg:col-span-8 lg:p-7">
              <p className="text-base font-semibold uppercase tracking-[0.16em] text-app-muted sm:text-lg">Question</p>
              <h2
                className={`mt-2 font-semibold tracking-tight text-app ${
                  activeQuestion.id === "r1-logo" ? "text-[2.45rem] sm:text-[2.95rem] lg:text-[2.7rem]" : "text-3xl sm:text-4xl lg:text-[3.25rem]"
                }`}
              >
                {activeQuestion.prompt}
              </h2>

              <div
                className={`mt-5 grid gap-3 ${
                  activeQuestion.optionType === "logo" || activeQuestion.optionType === "color" ? "grid-cols-2" : "grid-cols-1"
                }`}
              >
                {activeQuestion.options.map((option) => {
                  const isSelected = activeAnswer === option.id;
                  const isCorrectOption = option.id === activeQuestion.correctOptionId;
                  const isChosenWrongOption =
                    feedbackState?.selectedOptionId === option.id && feedbackState.isCorrect === false;
                  const showCorrectState = feedbackState && isCorrectOption;
                  const showWrongState = Boolean(isChosenWrongOption);
                  const feedbackClasses = showCorrectState
                    ? "border-green-500 bg-green-500/12 shadow-app"
                    : showWrongState
                      ? "border-red-500 bg-red-500/12 shadow-app"
                      : isSelected
                        ? "border-primary bg-primary/10 shadow-app"
                        : "border-app bg-app hover:-translate-y-0.5 hover:bg-app-soft";
                  const optionHasColorValue = hasColorValue(option);
                  const optionHasLogoMark = hasLogoMark(option);
                  const optionDetail = "detail" in option ? option.detail : undefined;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelectAnswer(option.id)}
                      disabled={Boolean(feedbackState)}
                      className={`min-h-16 rounded-2xl border px-4 py-4 text-left transition-all duration-200 disabled:cursor-default ${feedbackClasses}`}
                    >
                      {optionHasColorValue ? (
                        <div className="flex min-h-28 items-center justify-center">
                          <span
                            aria-hidden="true"
                            className="h-16 w-16 shrink-0 rounded-2xl border border-app shadow-app sm:h-20 sm:w-20"
                            style={{ backgroundColor: option.colorValue }}
                          />
                        </div>
                      ) : null}

                      {optionHasLogoMark ? (
                        <div className="flex min-h-28 items-center justify-center">
                          <div className="flex aspect-square w-full max-w-[12rem] items-center justify-center rounded-[1.75rem] border border-app bg-app-surface p-4 shadow-app">
                            <span
                              aria-hidden="true"
                              className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-semibold text-white shadow-app dark:text-[#2f1736] sm:h-20 sm:w-20 sm:text-2xl"
                              style={{
                                background:
                                  "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 92%, white), color-mix(in srgb, var(--color-secondary) 88%, white))",
                              }}
                            >
                              {option.logoMark}
                            </span>
                          </div>
                          <div className="sr-only">
                            <p className="text-lg font-semibold text-app sm:text-xl">{option.label}</p>
                            {optionDetail ? <p className="text-lg text-app-muted sm:text-xl">{optionDetail}</p> : null}
                          </div>
                        </div>
                      ) : null}

                      {!optionHasColorValue && !optionHasLogoMark ? (
                        <p className="text-lg font-semibold leading-8 text-app sm:text-xl">{option.label}</p>
                      ) : null}

                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/player/dashboard"
                  className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-app bg-app-surface px-5 py-3 text-lg font-semibold text-app-muted transition-colors duration-200 hover:bg-app sm:text-xl"
                >
                  Exit Challenge
                </Link>
              </div>
            </article>

            <aside className="space-y-5 lg:col-span-4">
              <section className="rounded-[2rem] border border-app bg-app-surface p-5 shadow-app sm:p-6">
                <p className="text-base font-semibold uppercase tracking-[0.16em] text-app-muted sm:text-lg">Round Rules</p>
                <div className="mt-3 space-y-2 text-lg text-app-muted sm:text-xl">
                  <p>1. Each round lasts exactly 15 seconds.</p>
                  <p>2. The next question loads automatically after each answer.</p>
                  <p>3. The round auto-submits when timer hits zero.</p>
                </div>
              </section>
            </aside>
          </section>
        </section>
      </main>

      <Footer />
    </div>
  );
}
