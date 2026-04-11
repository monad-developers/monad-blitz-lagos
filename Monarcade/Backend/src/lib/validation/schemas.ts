import { z } from "zod";

export const uploadSchema = z.object({
  file: z.instanceof(File),
});

export const prepareChallengeSchema = z.object({
  name: z.string().min(1).max(80),
  logoPath: z.string().url(),
  tagline: z.string().min(1).max(80),
});

export const registerChallengeSchema = z.object({
  challengeId: z.coerce.number().int().min(1),
  name: z.string().min(1).max(80),
  logoPath: z.string().url(),
  tagline: z.string().min(1).max(80),
  brandFact: z.string().max(160).optional().or(z.literal("")),
  brandColor: z.string().max(20).optional().or(z.literal("")),
  category: z.string().min(1).max(40),
  brandAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  prizePool: z.string().min(1),
  duration: z.coerce.number().int().min(30).max(7 * 24 * 60 * 60),
  metadataHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  winnerCount: z.coerce.number().int().min(1).max(10),
});

export const startChallengeSchema = z.object({
  challengeId: z.coerce.number().int().min(1),
});

export const createGaslessChallengeSchema = z.object({
  metadataHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  duration: z.coerce.number().int().min(30).max(7 * 24 * 60 * 60),
  winnerCount: z.coerce.number().int().min(1).max(10),
  prizePool: z.string().min(1),
  profile: z
    .object({
      companyName: z.string().min(2).max(80),
      tagline: z.string().min(2).max(80),
      logoPath: z.string().url(),
      brandFact: z.string().max(160).optional().or(z.literal("")),
      brandColor: z.string().max(20).optional().or(z.literal("")),
      category: z.string().min(2).max(40),
      website: z.string().url().optional().or(z.literal("")),
    })
    .optional(),
});

export const brandProfileSchema = z.object({
  companyName: z.string().min(2).max(80),
  tagline: z.string().min(2).max(80),
  logoPath: z.string().url(),
  brandFact: z.string().max(160).optional().or(z.literal("")),
  brandColor: z.string().max(20).optional().or(z.literal("")),
  category: z.string().min(2).max(40),
  website: z.string().url().optional().or(z.literal("")),
  brandAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  challengeDefaults: z
    .object({
      prizePool: z.string().min(1),
      duration: z.coerce.number().int().min(30).max(7 * 24 * 60 * 60),
      winnerCount: z.coerce.number().int().min(1).max(10),
    })
    .optional(),
});

export const startSessionSchema = z.object({
  challengeId: z.coerce.number().int().min(1),
  playerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

export const submitSessionSchema = z.object({
  sessionId: z.string().uuid(),
  r1: z.object({
    tappedIndex: z.number().int().min(0).max(8),
    timeMs: z.number().int().min(150).max(5000),
  }),
  r2: z.object({
    choiceIndex: z.number().int().min(0).max(3),
    timeMs: z.number().int().min(0).max(10000),
  }),
  r3: z.object({
    choiceIndex: z.number().int().min(0).max(3),
    timeMs: z.number().int().min(0).max(15000),
  }),
  r4: z.object({
    choiceIndex: z.number().int().min(0).max(3),
    timeMs: z.number().int().min(0).max(15000),
  }),
  r5: z.object({
    choiceIndex: z.number().int().min(0).max(3),
    timeMs: z.number().int().min(0).max(10000),
  }),
});
