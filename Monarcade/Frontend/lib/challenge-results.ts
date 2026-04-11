type CompletionReason = "timeout" | "manual";

export type RewardPayoutStatus = "processing" | "scheduled" | "paid" | "not-qualified";

export type ChallengeResultData = {
  challengeName: string;
  brandName: string;
  finalScore: number;
  didWin: boolean;
  rewardMon: number;
  payoutStatus: RewardPayoutStatus;
  completionReason: CompletionReason;
  totalCorrectAnswers: number;
  totalQuestions: number;
  round1Correct: number;
  round1Total: number;
  round2Correct: number;
  round2Total: number;
  performanceNote: string;
};

type ResultQuery = {
  correct?: string;
  total?: string;
  reason?: string;
  round1Correct?: string;
  round1Total?: string;
  round2Correct?: string;
  round2Total?: string;
  outcome?: string;
};

const clampNumber = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const parseInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const extractBrandName = (challengeName: string) => challengeName.replace(/\s*challenge\s*$/i, "").trim() || challengeName;

export const mockWinningResult: ChallengeResultData = {
  challengeName: "Bites Challenge",
  brandName: "Bites",
  finalScore: 80,
  didWin: true,
  rewardMon: 1.5,
  payoutStatus: "processing",
  completionReason: "manual",
  totalCorrectAnswers: 4,
  totalQuestions: 5,
  round1Correct: 2,
  round1Total: 3,
  round2Correct: 2,
  round2Total: 2,
  performanceNote: "Strong finish in round two. Great brand recall under pressure.",
};

export const mockNonWinningResult: ChallengeResultData = {
  challengeName: "Bites Challenge",
  brandName: "Bites",
  finalScore: 40,
  didWin: false,
  rewardMon: 0,
  payoutStatus: "not-qualified",
  completionReason: "timeout",
  totalCorrectAnswers: 2,
  totalQuestions: 5,
  round1Correct: 1,
  round1Total: 3,
  round2Correct: 1,
  round2Total: 2,
  performanceNote: "Good effort.",
};

const resolvePerformanceNote = (score: number, didWin: boolean) => {
  if (didWin) {
    if (score >= 90) {
      return "Elite run.";
    }
    return "Strong finish.";
  }

  if (score >= 60) {
    return "Close call.";
  }

  return "Nice try.";
};

export const buildChallengeResultData = (challengeName: string, query: ResultQuery): ChallengeResultData => {
  const brandName = extractBrandName(challengeName);
  const baseTemplate = query.outcome === "lose" ? mockNonWinningResult : mockWinningResult;

  const totalQuestions = clampNumber(parseInteger(query.total, baseTemplate.totalQuestions), 1, 20);
  const totalCorrectAnswers = clampNumber(parseInteger(query.correct, baseTemplate.totalCorrectAnswers), 0, totalQuestions);

  const round1TotalFallback = Math.max(1, Math.ceil(totalQuestions * 0.6));
  const round1Total = clampNumber(parseInteger(query.round1Total, baseTemplate.round1Total ?? round1TotalFallback), 1, totalQuestions);
  const round2Total = clampNumber(
    parseInteger(query.round2Total, baseTemplate.round2Total ?? Math.max(1, totalQuestions - round1Total)),
    1,
    totalQuestions,
  );

  const round1Correct = clampNumber(parseInteger(query.round1Correct, baseTemplate.round1Correct), 0, round1Total);
  const round2Correct = clampNumber(parseInteger(query.round2Correct, baseTemplate.round2Correct), 0, round2Total);

  const finalScore = Math.round((totalCorrectAnswers / totalQuestions) * 100);
  const didWin = query.outcome ? query.outcome === "win" : finalScore >= 70;

  const payoutStatus: RewardPayoutStatus = didWin ? baseTemplate.payoutStatus : "not-qualified";
  const rewardMon = didWin ? baseTemplate.rewardMon : 0;

  return {
    challengeName,
    brandName,
    finalScore,
    didWin,
    rewardMon,
    payoutStatus,
    completionReason: query.reason === "timeout" ? "timeout" : "manual",
    totalCorrectAnswers,
    totalQuestions,
    round1Correct,
    round1Total,
    round2Correct,
    round2Total,
    performanceNote: resolvePerformanceNote(finalScore, didWin),
  };
};
