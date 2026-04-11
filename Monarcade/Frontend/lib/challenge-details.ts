import { API_BASE_URL } from "@/lib/monad";

export type ChallengeRound = {
  title: string;
  description: string;
  duration: string;
};

export type ChallengeDetails = {
  id: string;
  brandTitle: string;
  logoText: string;
  logoPath?: string;
  tagline: string;
  heroLabel: string;
  instructions: string[];
  facts: string[];
  reward: {
    headline: string;
    details: string;
    payoutWindow: string;
  };
  prepSeconds: number;
  redirectPath: string;
  rounds: ChallengeRound[];
};

type ChallengeApiResponse = {
  challengeId: number;
  metadata: {
    name: string;
    logoPath: string;
    tagline: string;
    brandFact?: string;
    category?: string;
    prizePool?: string;
  };
};

const getLogoText = (name: string) =>
  name
    .split(" ")
    .map((word) => word.trim()[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2) || "BR";

export const getChallengeDetails = async (id: string): Promise<ChallengeDetails | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/challenge/${id}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const challenge = (await response.json()) as ChallengeApiResponse;
    const brandName = challenge.metadata.name;
    const tagline = challenge.metadata.tagline;
    const brandFact = challenge.metadata.brandFact;
    const category = challenge.metadata.category || "Brand Challenge";
    const prizePool = challenge.metadata.prizePool || "0";

    return {
      id,
      brandTitle: brandName,
      logoText: getLogoText(brandName),
      logoPath: challenge.metadata.logoPath,
      tagline,
      heroLabel: category,
      instructions: [
        "Study the brand logo, tagline, and fact prompt before the challenge begins.",
        "Round 1 tests recognition speed and recall under time pressure.",
        "Round 2 checks whether players remember the brand messaging and identity correctly.",
      ],
      facts: brandFact
        ? [brandFact]
        : ["This challenge uses a logo-verification round instead of a fact prompt."],
      reward: {
        headline: `Win from ${prizePool} MON`,
        details: "Top performers split the prize pool based on final ranking after challenge completion.",
        payoutWindow: "Rewards are distributed after verification and final challenge settlement.",
      },
      prepSeconds: 5,
      redirectPath: `/challenge/${id}/play`,
      rounds: [
        {
          title: "Round 1",
          description: "Players identify the official brand visuals and messaging under time pressure.",
          duration: "15 seconds",
        },
        {
          title: "Round 2",
          description: "Players confirm the real brand facts or the authentic logo against lookalikes.",
          duration: "15 seconds",
        },
      ],
    };
  } catch {
    return null;
  }
};
