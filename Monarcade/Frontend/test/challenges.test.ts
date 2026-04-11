import { describe, expect, it } from "vitest";

import { activeChallenges, comingSoonChallenges } from "@/lib/challenges";

describe("frontend challenge catalog", () => {
  it("exposes the expected active challenge set", () => {
    expect(activeChallenges).toHaveLength(6);
    expect(activeChallenges.map((challenge) => challenge.status)).toEqual([
      "live",
      "live",
      "live",
      "live",
      "live",
      "live",
    ]);
  });

  it("exposes the expected coming soon challenge set", () => {
    expect(comingSoonChallenges).toHaveLength(4);
    expect(comingSoonChallenges.map((challenge) => challenge.status)).toEqual([
      "pending",
      "pending",
      "pending",
      "pending",
    ]);
  });
});
