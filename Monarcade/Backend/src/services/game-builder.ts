import { GAME_CONFIG } from "@/lib/constants";
import { SEED_BRANDS } from "@/lib/seed-brands";
import type { ChallengeMetadata, RoundChoicePayload, RoundOnePayload } from "@/lib/types";
import { listChallenges } from "@/store/challenges-store";

const shuffle = <T>(items: T[]) => {
  const clone = [...items];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
};

const pickDistinct = <T>(items: T[], count: number) => {
  return shuffle(items).slice(0, count);
};

const buildRound1 = (challenge: ChallengeMetadata): { payload: RoundOnePayload; correctIndex: number } => {
  const allChallenges = listChallenges();
  const distractorLogos = allChallenges
    .filter((item) => item.challengeId !== challenge.challengeId)
    .map((item) => item.logoPath)
    .filter((logo, index, arr) => arr.indexOf(logo) === index);

  const seedLogos = SEED_BRANDS
    .filter((s) => s.logoPath !== challenge.logoPath)
    .map((s) => s.logoPath);

  const allDistractorLogos = [...distractorLogos, ...seedLogos]
    .filter((logo, index, arr) => arr.indexOf(logo) === index);

  const chosenDistractors = allDistractorLogos.length >= 8
    ? pickDistinct(allDistractorLogos, 8)
    : [...allDistractorLogos, ...allDistractorLogos, ...allDistractorLogos].slice(0, 8);

  const options = shuffle([challenge.logoPath, ...chosenDistractors]);
  const correctIndex = options.findIndex((url) => url === challenge.logoPath);

  return {
    payload: { imageUrls: options },
    correctIndex,
  };
};

const buildRound2 = (challenge: ChallengeMetadata): { payload: RoundChoicePayload; correctIndex: number } => {
  const allChallenges = listChallenges();

  const sameCategory = allChallenges
    .filter(
      (item) => item.challengeId !== challenge.challengeId && item.category === challenge.category,
    )
    .map((item) => item.tagline)
    .filter((line, index, arr) => line && arr.indexOf(line) === index);

  const otherCategory = allChallenges
    .filter(
      (item) => item.challengeId !== challenge.challengeId && item.category !== challenge.category,
    )
    .map((item) => item.tagline)
    .filter((line, index, arr) => line && arr.indexOf(line) === index);

  const seedTaglines = SEED_BRANDS
    .filter((s) => s.tagline !== challenge.tagline)
    .map((s) => s.tagline);

  const distractors = [...sameCategory, ...otherCategory, ...seedTaglines]
    .filter((line) => line !== challenge.tagline)
    .filter((line, index, arr) => arr.indexOf(line) === index)
    .slice(0, 3);

  while (distractors.length < 3) {
    distractors.push(`Decoy tagline ${distractors.length + 1}`);
  }

  const choices = shuffle([challenge.tagline, ...distractors]);
  const correctIndex = choices.findIndex((choice) => choice === challenge.tagline);

  return {
    payload: {
      choices,
      variant: "tagline_match",
    },
    correctIndex,
  };
};

const buildRound3Fact = (challenge: ChallengeMetadata): { payload: RoundChoicePayload; correctIndex: number } => {
  const allFacts = listChallenges()
    .filter((item) => item.challengeId !== challenge.challengeId && item.brandFact)
    .map((item) => item.brandFact as string)
    .filter((fact, index, arr) => arr.indexOf(fact) === index);

  const seedFacts = SEED_BRANDS
    .filter((s) => s.brandFact !== challenge.brandFact)
    .map((s) => s.brandFact);

  const distractors = [...allFacts, ...seedFacts]
    .filter((fact, index, arr) => arr.indexOf(fact) === index)
    .slice(0, 3);

  while (distractors.length < 3) {
    distractors.push(`Brand fact option ${distractors.length + 1}`);
  }

  const choices = shuffle([challenge.brandFact as string, ...distractors]);
  const correctIndex = choices.findIndex((choice) => choice === challenge.brandFact);

  return {
    payload: {
      choices,
      variant: "fact_match",
    },
    correctIndex,
  };
};

const buildRound3RealOrFake = (challenge: ChallengeMetadata): { payload: RoundChoicePayload; correctIndex: number } => {
  const realLogos = listChallenges()
    .filter((item) => item.challengeId !== challenge.challengeId)
    .map((item) => item.logoPath);

  const seedLogosR3 = SEED_BRANDS
    .filter((s) => s.logoPath !== challenge.logoPath)
    .map((s) => s.logoPath);

  const candidateLogos = [...realLogos, ...seedLogosR3]
    .filter((logo, index, arr) => arr.indexOf(logo) === index)
    .slice(0, 3);

  while (candidateLogos.length < 3) {
    candidateLogos.push(`${challenge.logoPath}?fake=${candidateLogos.length + 1}`);
  }

  const choices = shuffle([challenge.logoPath, ...candidateLogos]);
  const correctIndex = choices.findIndex((choice) => choice === challenge.logoPath);

  return {
    payload: {
      choices,
      variant: "real_or_fake",
    },
    correctIndex,
  };
};

const buildRoundColor = (challenge: ChallengeMetadata): { payload: RoundChoicePayload; correctIndex: number } => {
  const brandColor = challenge.brandColor || "#853953";

  const allColors = listChallenges()
    .filter((item) => item.challengeId !== challenge.challengeId && item.brandColor)
    .map((item) => item.brandColor as string)
    .filter((color, index, arr) => color !== brandColor && arr.indexOf(color) === index);

  const seedColors = SEED_BRANDS
    .map((s) => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"));

  const distractors = [...allColors, ...seedColors]
    .filter((c) => c.toLowerCase() !== brandColor.toLowerCase())
    .filter((c, i, arr) => arr.indexOf(c) === i)
    .slice(0, 3);

  while (distractors.length < 3) {
    distractors.push("#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"));
  }

  const choices = shuffle([brandColor, ...distractors]);
  const correctIndex = choices.findIndex((c) => c.toLowerCase() === brandColor.toLowerCase());

  return {
    payload: { choices, variant: "color_match" },
    correctIndex,
  };
};

const CATEGORY_OPTIONS = ["Gaming", "Consumer", "Food", "Fintech", "Entertainment", "Lifestyle", "Sports", "Education", "Tech", "Fashion", "Services"];

const buildRoundCategory = (challenge: ChallengeMetadata): { payload: RoundChoicePayload; correctIndex: number } => {
  const correctCategory = challenge.category || "Other";

  const distractors = shuffle(
    CATEGORY_OPTIONS.filter((cat) => cat.toLowerCase() !== correctCategory.toLowerCase()),
  ).slice(0, 3);

  const choices = shuffle([correctCategory, ...distractors]);
  const correctIndex = choices.findIndex((c) => c.toLowerCase() === correctCategory.toLowerCase());

  return {
    payload: { choices, variant: "category_match" },
    correctIndex,
  };
};

export const buildGameRounds = (challenge: ChallengeMetadata) => {
  const round1 = buildRound1(challenge);
  const round2 = buildRoundColor(challenge);
  const round3 = buildRound2(challenge); // tagline match
  const round4 = challenge.brandFact ? buildRound3Fact(challenge) : buildRound3RealOrFake(challenge);
  const round5 = buildRoundCategory(challenge);

  return {
    ttlMs: GAME_CONFIG.SESSION_TTL_MS,
    rounds: {
      r1: round1.payload,
      r2: round2.payload,
      r3: round3.payload,
      r4: round4.payload,
      r5: round5.payload,
    },
    answers: {
      round1CorrectIndex: round1.correctIndex,
      round2CorrectIndex: round2.correctIndex,
      round3CorrectIndex: round3.correctIndex,
      round4CorrectIndex: round4.correctIndex,
      round5CorrectIndex: round5.correctIndex,
    },
  };
};
