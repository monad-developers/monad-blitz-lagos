import { env } from "../../config/env"
import { createLogger } from "../../lib/logger"
import { gameService, type CreateGameFromIndexer } from "../games/game.service"
import { readGiveaway } from "../../chain"

const log = createLogger("SubgraphPoller")

const GIVEAWAYS_QUERY = `
  query GetRecentGiveaways($first: Int!, $skip: Int!) {
    giveawayCreateds(
      first: $first
      skip: $skip
      orderBy: timestamp_
      orderDirection: desc
    ) {
      id
      idParam
      host
      token
      amount
      metadata
      transactionHash_
      timestamp_
    }
  }
`

interface SubgraphGiveaway {
  id: string
  idParam: string
  host: string
  token: string
  amount: string
  metadata: string // hex-encoded JSON
  transactionHash_: string
  timestamp_: string
}

function decodeHexMetadata(hex: string): Record<string, any> {
  try {
    const clean = hex.startsWith("0x") ? hex.slice(2) : hex
    const json = Buffer.from(clean, "hex").toString("utf-8")
    return JSON.parse(json)
  } catch {
    return {}
  }
}

/** Fetch recent giveaways from the Goldsky subgraph */
async function fetchGiveaways(first = 50, skip = 0): Promise<SubgraphGiveaway[]> {
  const res = await fetch(env.subgraphUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: GIVEAWAYS_QUERY,
      variables: { first, skip },
    }),
  })

  if (!res.ok) {
    throw new Error(`Subgraph request failed: ${res.status}`)
  }

  const body = await res.json() as any
  if (body.errors) {
    throw new Error(`Subgraph errors: ${JSON.stringify(body.errors)}`)
  }

  return body.data.giveawayCreateds
}

/**
 * Poll the subgraph for new giveaways, cross-reference the DB
 * to find untracked ones, read on-chain data for startTime/numWinners,
 * and create "upcoming" games.
 */
export async function pollForNewGiveaways(): Promise<number> {
  const giveaways = await fetchGiveaways(50, 0)
  const knownIds = await gameService.getAllGiveawayIds()

  const newGiveaways = giveaways.filter((g) => !knownIds.has(g.idParam))
  if (newGiveaways.length === 0) return 0

  log.info(`Found ${newGiveaways.length} new giveaway(s) from subgraph`)

  let created = 0
  for (const g of newGiveaways) {
    try {
      // Read on-chain struct for startTime and winners count
      const onChain = await readGiveaway(g.idParam as `0x${string}`)
      // onChain = [host, token, prize, startTime, winners, status, metadata]
      const startTime = Number(onChain[3])
      const numWinners = Number(onChain[4])

      const metadata = decodeHexMetadata(g.metadata)

      const input: CreateGameFromIndexer = {
        giveawayId: g.idParam,
        hostAddress: g.host,
        token: g.token,
        totalRewards: g.amount,
        numWinners,
        startTime,
        metadata,
      }

      await gameService.createFromIndexer(input)
      created++
    } catch (err) {
      log.error(`Failed to create game for giveaway ${g.idParam}`, err)
    }
  }

  return created
}
