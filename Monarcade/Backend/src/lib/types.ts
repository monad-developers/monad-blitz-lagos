export type ChallengeStatus = "pending" | "active" | "ended";

export type BrandProfile = {
  userId: string;
  brandAddress: `0x${string}`;
  companyName: string;
  tagline: string;
  logoPath: string;
  brandFact?: string;
  brandColor?: string;
  category: string;
  website?: string;
  createdAt: number;
  updatedAt: number;
};

export type ChallengeMetadata = {
  challengeId: number;
  name: string;
  logoPath: string;
  tagline: string;
  brandFact?: string;
  brandColor?: string;
  category: string;
  brandAddress: `0x${string}`;
  prizePool: string;
  duration: number;
  metadataHash: `0x${string}`;
  winnerCount: number;
  started: boolean;
  startTime?: number;
  endTime?: number;
  createdAt: number;
};

export type RoundOnePayload = {
  imageUrls: string[];
};

export type RoundChoicePayload = {
  choices: string[];
  variant: "fact_match" | "real_or_fake" | "tagline_match" | "color_match" | "category_match";
};

export type SessionRoundAnswers = {
  round1CorrectIndex: number;
  round2CorrectIndex: number;
  round3CorrectIndex: number;
  round4CorrectIndex: number;
  round5CorrectIndex: number;
};

export type GameSession = {
  sessionId: string;
  challengeId: number;
  playerAddress: `0x${string}`;
  submitted: boolean;
  expiresAt: number;
  answers: SessionRoundAnswers;
  rounds: {
    r1: RoundOnePayload;
    r2: RoundChoicePayload;
    r3: RoundChoicePayload;
    r4: RoundChoicePayload;
    r5: RoundChoicePayload;
  };
};
