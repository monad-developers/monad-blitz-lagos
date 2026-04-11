import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { keccak256, stringToHex } from "viem";

import { jsonRequest, authHeaders } from "./helpers";
import { clearChallenges } from "@/store/challenges-store";
import { clearSessions } from "@/store/sessions-store";

const contractState = {
  challenges: new Map<number, any>(),
  playersByChallenge: new Map<number, `0x${string}`[]>(),
  playerScores: new Map<number, Map<`0x${string}`, bigint>>(),
};

vi.mock("@/services/pinata", () => ({
  uploadToPinata: vi.fn(async () => "https://gateway.pinata.cloud/ipfs/test-cid"),
}));

vi.mock("@/lib/contract/service", () => ({
  readChallenge: vi.fn(async (challengeId: bigint) => {
    return (
      contractState.challenges.get(Number(challengeId)) ?? {
        brand: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        metadataHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        prizePool: BigInt(0),
        deadline: BigInt(0),
        startTime: BigInt(0),
        endTime: BigInt(0),
        winnerCount: BigInt(3),
        scoreCount: BigInt(0),
        started: false,
        distributed: false,
        exists: false,
      }
    );
  }),
  isChallengeActive: vi.fn(async (challengeId: bigint) => {
    const challenge = contractState.challenges.get(Number(challengeId));
    return Boolean(challenge?.started && Number(challenge.endTime) > Math.floor(Date.now() / 1000));
  }),
  readPlayers: vi.fn(async (challengeId: bigint) => {
    return contractState.playersByChallenge.get(Number(challengeId)) ?? [];
  }),
  readPlayerScore: vi.fn(async (challengeId: bigint, player: `0x${string}`) => {
    const scores = contractState.playerScores.get(Number(challengeId));
    const score = scores?.get(player) ?? BigInt(0);
    return { score, played: score > BigInt(0) };
  }),
  readLeaderboardFromEvents: vi.fn(async (challengeId: bigint) => {
    const scores = contractState.playerScores.get(Number(challengeId)) ?? new Map();
    return [...scores.entries()]
      .map(([address, score]) => ({ address, score: Number(score), txHash: undefined as `0x${string}` | undefined }))
      .sort((a, b) => b.score - a.score);
  }),
  readHasPlayed: vi.fn(async (challengeId: bigint, player: `0x${string}`) => {
    const scores = contractState.playerScores.get(Number(challengeId));
    return Boolean(scores?.has(player));
  }),
  submitScoreOnChain: vi.fn(async (challengeId: bigint, player: `0x${string}`, score: bigint) => {
    const challengeNumber = Number(challengeId);
    const challenge = contractState.challenges.get(challengeNumber);
    if (challenge) {
      challenge.scoreCount = BigInt(Number(challenge.scoreCount) + 1);
      contractState.challenges.set(challengeNumber, challenge);
    }

    const scores = contractState.playerScores.get(challengeNumber) ?? new Map();
    scores.set(player, score);
    contractState.playerScores.set(challengeNumber, scores);

    const players = contractState.playersByChallenge.get(challengeNumber) ?? [];
    if (!players.includes(player)) {
      players.push(player);
      contractState.playersByChallenge.set(challengeNumber, players);
    }

    return {
      txHash: "0xsubmit",
      blockNumber: BigInt(1),
      event: { challengeId, player, score, totalPlayers: BigInt(players.length) },
    };
  }),
  distributeRewardsOnChain: vi.fn(async () => ({
    txHash: "0xdistribute",
    blockNumber: BigInt(2),
    event: { challengeId: BigInt(1), winners: [], amounts: [] },
  })),
  refundBrandOnChain: vi.fn(async () => ({
    txHash: "0xrefund",
    blockNumber: BigInt(3),
  })),
}));

const seedChallenge = (challengeId: number, overrides: Partial<any> = {}) => {
  contractState.challenges.set(challengeId, {
    brand: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    metadataHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    prizePool: BigInt(1000000000000000000),
    deadline: BigInt(Math.floor(Date.now() / 1000) + 180),
    startTime: BigInt(Math.floor(Date.now() / 1000) - 10),
    endTime: BigInt(Math.floor(Date.now() / 1000) + 180),
    winnerCount: BigInt(3),
    scoreCount: BigInt(0),
    started: true,
    distributed: false,
    exists: true,
    ...overrides,
  });
};

const buildMetadataHash = (name: string, logoPath: string, tagline: string) => {
  return keccak256(stringToHex(`${name}${logoPath}${tagline}`));
};

beforeEach(() => {
  contractState.challenges.clear();
  contractState.playersByChallenge.clear();
  contractState.playerScores.clear();
  clearChallenges();
  clearSessions();
});

describe("Monad backend routes", () => {
  it("uploads a logo, prepares metadata, registers a challenge, and fetches it", async () => {
    const { POST: upload } = await import("@/app/api/upload/route");
    const uploadRequest = new NextRequest("http://localhost/api/upload", {
      method: "POST",
      headers: authHeaders(),
      body: (() => {
        const form = new FormData();
        form.append("file", new File(["logo"], "logo.png", { type: "image/png" }));
        return form;
      })(),
    });
    const uploadResponse = await upload(uploadRequest as never);
    expect(uploadResponse.status).toBe(201);
    const uploadJson = await uploadResponse.json();
    expect(uploadJson.logoPath).toContain("ipfs/test-cid");

    const { POST: prepare } = await import("@/app/api/challenge/prepare/route");
    const prepareResponse = await prepare(
      jsonRequest("http://localhost/api/challenge/prepare", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: "Lagos Fresh Juice",
          logoPath: uploadJson.logoPath,
          tagline: "Fresh from the farm, straight to you",
        }),
      }) as never,
    );
    expect(prepareResponse.status).toBe(200);
    const prepareJson = await prepareResponse.json();

    const expectedHash = buildMetadataHash(
      "Lagos Fresh Juice",
      uploadJson.logoPath,
      "Fresh from the farm, straight to you",
    );
    expect(prepareJson.metadataHash).toBe(expectedHash);

    const { POST: register } = await import("@/app/api/challenge/register/route");
    const registerResponse = await register(
      jsonRequest("http://localhost/api/challenge/register", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          challengeId: 1,
          name: "Lagos Fresh Juice",
          logoPath: uploadJson.logoPath,
          tagline: "Fresh from the farm, straight to you",
          brandFact: "Founded in Lagos in 2019",
          brandColor: "#FF5733",
          category: "Food",
          brandAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          prizePool: "1",
          duration: 180,
          metadataHash: expectedHash,
          winnerCount: 3,
        }),
      }) as never,
    );
    expect(registerResponse.status).toBe(201);

    seedChallenge(1, {
      metadataHash: expectedHash,
      started: false,
      startTime: BigInt(0),
      endTime: BigInt(0),
      prizePool: BigInt(1000000000000000000),
    });

    const { GET: getChallenge } = await import("@/app/api/challenge/[id]/route");
    const challengeResponse = await getChallenge(new NextRequest("http://localhost/api/challenge/1") as never, {
      params: Promise.resolve({ id: "1" }),
    } as never);
    expect(challengeResponse.status).toBe(200);
    const challengeJson = await challengeResponse.json();
    expect(challengeJson.challengeId).toBe(1);
    expect(challengeJson.metadata.name).toBe("Lagos Fresh Juice");
  });

  it("starts a challenge, creates a session, submits a score, and returns leaderboard data", async () => {
    const { POST: register } = await import("@/app/api/challenge/register/route");
    const { POST: startChallengeRoute } = await import("@/app/api/challenge/start/route");
    const { POST: startSession } = await import("@/app/api/session/start/route");
    const { POST: submitSession } = await import("@/app/api/session/submit/route");
    const { GET: leaderboard } = await import("@/app/api/leaderboard/[id]/route");

    const metadataHash = buildMetadataHash(
      "Naija Tech Hub",
      "https://gateway.pinata.cloud/ipfs/tech",
      "Building Africa's digital future",
    );

    await register(
      jsonRequest("http://localhost/api/challenge/register", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          challengeId: 2,
          name: "Naija Tech Hub",
          logoPath: "https://gateway.pinata.cloud/ipfs/tech",
          tagline: "Building Africa's digital future",
          brandFact: "Launched in 2022",
          brandColor: "#00AAFF",
          category: "Tech",
          brandAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          prizePool: "2",
          duration: 180,
          metadataHash,
          winnerCount: 3,
        }),
      }) as never,
    );

    seedChallenge(2, {
      metadataHash,
      started: true,
      startTime: BigInt(Math.floor(Date.now() / 1000) - 10),
      endTime: BigInt(Math.floor(Date.now() / 1000) + 180),
      prizePool: BigInt(2000000000000000000),
      winnerCount: BigInt(3),
    });

    const startResponse = await startChallengeRoute(
      jsonRequest("http://localhost/api/challenge/start", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ challengeId: 2 }),
      }) as never,
    );
    expect(startResponse.status).toBe(200);

    const sessionResponse = await startSession(
      jsonRequest("http://localhost/api/session/start", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          challengeId: 2,
          playerAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        }),
      }) as never,
    );
    expect(sessionResponse.status).toBe(201);
    const sessionJson = await sessionResponse.json();
    expect(sessionJson.rounds.r1.imageUrls).toHaveLength(9);
    expect(sessionJson.rounds.r2.choices).toHaveLength(4);
    expect(sessionJson.rounds.r3.choices).toHaveLength(4);

    const submitResponse = await submitSession(
      jsonRequest("http://localhost/api/session/submit", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          sessionId: sessionJson.sessionId,
          r1: { tappedIndex: sessionJson.rounds.r1.imageUrls.indexOf(sessionJson.brand.logoPath), timeMs: 800 },
          r2: { choiceIndex: sessionJson.rounds.r2.choices.indexOf("#00AAFF"), timeMs: 1200 },
          r3: { choiceIndex: sessionJson.rounds.r3.choices.indexOf(sessionJson.brand.tagline), timeMs: 900 },
          r4: { choiceIndex: sessionJson.rounds.r4.choices.indexOf(sessionJson.brand.brandFact), timeMs: 1400 },
          r5: { choiceIndex: sessionJson.rounds.r5.choices.indexOf("Tech"), timeMs: 1100 },
        }),
      }) as never,
    );
    expect(submitResponse.status).toBe(200);
    const submitJson = await submitResponse.json();
    expect(submitJson.score).toBeGreaterThan(0);
    expect(submitJson.txHash).toBe("0xsubmit");

    const leaderboardResponse = await leaderboard(new NextRequest("http://localhost/api/leaderboard/2") as never, {
      params: Promise.resolve({ id: "2" }),
    } as never);
    expect(leaderboardResponse.status).toBe(200);
    const leaderboardJson = await leaderboardResponse.json();
    expect(leaderboardJson.entries.length).toBeGreaterThan(0);
    expect(leaderboardJson.entries[0].address).toBe("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  });

  it("lists challenges, distributes rewards, and refunds when eligible", async () => {
    const { POST: register } = await import("@/app/api/challenge/register/route");
    const { GET: listChallenges } = await import("@/app/api/challenges/route");
    const { POST: distribute } = await import("@/app/api/distribute/[id]/route");
    const { POST: refund } = await import("@/app/api/challenge/refund/[id]/route");

    const metadataHash = buildMetadataHash(
      "Aso Rock Styles",
      "https://gateway.pinata.cloud/ipfs/styles",
      "Style that speaks",
    );

    await register(
      jsonRequest("http://localhost/api/challenge/register", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          challengeId: 3,
          name: "Aso Rock Styles",
          logoPath: "https://gateway.pinata.cloud/ipfs/styles",
          tagline: "Style that speaks",
          category: "Fashion",
          brandAddress: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          prizePool: "0.5",
          duration: 180,
          metadataHash,
          winnerCount: 3,
        }),
      }) as never,
    );

    seedChallenge(3, {
      metadataHash,
      started: true,
      endTime: BigInt(Math.floor(Date.now() / 1000) - 10),
      prizePool: BigInt(500000000000000000),
      winnerCount: BigInt(3),
    });

    contractState.playersByChallenge.set(3, [
      "0x1111111111111111111111111111111111111111",
      "0x2222222222222222222222222222222222222222",
      "0x3333333333333333333333333333333333333333",
    ]);
    contractState.playerScores.set(3, new Map([
      ["0x1111111111111111111111111111111111111111", BigInt(280)],
      ["0x2222222222222222222222222222222222222222", BigInt(245)],
      ["0x3333333333333333333333333333333333333333", BigInt(220)],
    ]));

    const listResponse = await listChallenges(new NextRequest("http://localhost/api/challenges?status=all&page=1&pageSize=10") as never);
    expect(listResponse.status).toBe(200);
    const listJson = await listResponse.json();
    expect(listJson.entries.length).toBe(1);

    const distributeResponse = await distribute(
      new NextRequest("http://localhost/api/distribute/3", {
        method: "POST",
        headers: { "x-distribute-secret": "abcdefghijklmnopqrstuvwxyz" },
      }) as never,
      {
        params: Promise.resolve({ id: "3" }),
      } as never,
    );
    expect(distributeResponse.status).toBe(200);
    const distributeJson = await distributeResponse.json();
    expect(distributeJson.winners.length).toBe(3);

    const refundResponse = await refund(
      jsonRequest("http://localhost/api/challenge/refund/3", {
        method: "POST",
        headers: authHeaders(),
      }) as never,
      {
        params: Promise.resolve({ id: "3" }),
      } as never,
    );
    expect(refundResponse.status).toBe(400);
  });

  it("returns json for method errors and empty bodies", async () => {
    const { GET: prepareGet } = await import("@/app/api/challenge/prepare/route");
    const { POST: preparePost } = await import("@/app/api/challenge/prepare/route");

    const methodResponse = await prepareGet();
    expect(methodResponse.status).toBe(405);
    const methodJson = await methodResponse.json();
    expect(methodJson.error.code).toBe("METHOD_NOT_ALLOWED");
    expect(methodJson.error.details.allowed).toEqual(["POST"]);

    const bodyResponse = await preparePost(
      jsonRequest("http://localhost/api/challenge/prepare", {
        method: "POST",
        headers: authHeaders(),
      }) as never,
    );
    expect(bodyResponse.status).toBe(400);
    const bodyJson = await bodyResponse.json();
    expect(bodyJson.error.code).toBe("VALIDATION_ERROR");
  });
});
