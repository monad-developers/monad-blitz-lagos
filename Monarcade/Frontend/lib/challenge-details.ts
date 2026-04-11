import { API_BASE_URL } from "@/lib/monad";

export type ChallengeRound = {
  title: string;
  description: string;
  duration: string;
};

export type ChallengeStatus = "active" | "pending" | "ended";

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
  redirectPath: string;
  rounds: ChallengeRound[];
  status: ChallengeStatus;
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
  chain?: {
    started?: boolean;
    endTime?: string;
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
    // Use the numeric challengeId from API (works even if URL param was a hash)
    const resolvedId = String(challenge.challengeId);
    const brandName = challenge.metadata.name;
    const tagline = challenge.metadata.tagline;
    const category = challenge.metadata.category || "Brand Challenge";
    const prizePool = challenge.metadata.prizePool || "0";

    const started = challenge.chain?.started ?? false;
    const endTime = Number(challenge.chain?.endTime ?? 0);
    const nowSec = Math.floor(Date.now() / 1000);
    const status: ChallengeStatus = !started
      ? "pending"
      : endTime > 0 && endTime <= nowSec
        ? "ended"
        : "active";

    return {
      id: resolvedId,
      brandTitle: brandName,
      logoText: getLogoText(brandName),
      logoPath: challenge.metadata.logoPath,
      tagline,
      heroLabel: category,
      instructions: [
        "Focus during the 5-second brand intro — memorize the logo, color, tagline, fact, and category.",
        "Every round is speed-weighted. A correct answer in 1 second earns far more than the same answer in 10 seconds.",
        "Round 1 is your biggest edge. The speed window is tight (5 seconds) so instant recognition wins.",
        "Trust your first instinct. Second-guessing costs time, and time costs points.",
        "You only get one attempt per challenge. Make it count.",
      ],
      facts: [],
      reward: {
        headline: `Win from ${prizePool} MON`,
        details: "Top performers split the prize pool based on final ranking after the challenge ends.",
        payoutWindow: "Rewards are distributed after the challenge ends and all scores are verified on-chain.",
      },
      status,
      redirectPath: `/challenge/${resolvedId}/play`,
      rounds: [
        {
          title: "Logo Spot",
          description: "Find the real brand logo in a 3x3 grid. Speed is critical — faster = more points. 5 seconds.",
          duration: "5 seconds",
        },
        {
          title: "Brand Color",
          description: "Pick the brand's signature color from 4 swatches. Speed-weighted. 10 seconds.",
          duration: "10 seconds",
        },
        {
          title: "Tagline Match",
          description: "Pick the brand's real tagline from 4 options. Faster correct answers earn more. 15 seconds.",
          duration: "15 seconds",
        },
        {
          title: "Brand Fact",
          description: "Identify the true brand fact or spot the real logo among lookalikes. 15 seconds.",
          duration: "15 seconds",
        },
        {
          title: "Category Match",
          description: "What category does this brand belong to? Pick from 4 options. 10 seconds.",
          duration: "10 seconds",
        },
      ],
    };
  } catch {
    return null;
  }
};
