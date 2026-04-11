/**
 * Seed brands used as realistic distractors when fewer than 3 real brands exist.
 * Logo paths reference static SVGs served from the Frontend's /public/challenges/ directory.
 * These are never stored in the challenge store — they're only used by the game builder.
 */

export type SeedBrand = {
  name: string;
  tagline: string;
  logoPath: string;
  brandFact: string;
  category: string;
};

export const SEED_BRANDS: SeedBrand[] = [
  {
    name: "Monfuel",
    tagline: "Fuel your next move on Monad",
    logoPath: "/challenges/monfuel.svg",
    brandFact: "Monfuel powers over 10,000 transactions per second on testnet.",
    category: "tech",
  },
  {
    name: "Orbit",
    tagline: "Explore the decentralized frontier",
    logoPath: "/challenges/orbit.svg",
    brandFact: "Orbit launched as a community-driven space for Web3 builders in Lagos.",
    category: "tech",
  },
  {
    name: "Nova Bites",
    tagline: "Crave the crunch, remember the flavor",
    logoPath: "/challenges/nova-bites.svg",
    brandFact: "Nova Bites started as a campus pop-up snack brand before scaling online.",
    category: "food",
  },
  {
    name: "City Wave",
    tagline: "Ride the urban pulse",
    logoPath: "/challenges/city-wave.svg",
    brandFact: "City Wave organizes monthly cultural events across five African cities.",
    category: "services",
  },
  {
    name: "Velora",
    tagline: "Fashion that commands attention",
    logoPath: "/challenges/orbit.svg",
    brandFact: "Velora debuted with a sold-out capsule collection at Lagos Fashion Week.",
    category: "fashion",
  },
];
