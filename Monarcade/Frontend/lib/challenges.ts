export type ChallengeStatus = "live" | "pending";

export type Challenge = {
  id: string;
  brandName: string;
  brandInitials: string;
  brandLogoPath?: string;
  status: ChallengeStatus;
  prize: string;
  time: string;
  buttonLabel: string;
};

export const activeChallenges: Challenge[] = [
  {
    id: "jollof-express",
    brandName: "Jollof Express",
    brandInitials: "JE",
    status: "live",
    prize: "1 MON",
    time: "4m 32s",
    buttonLabel: "Play Now",
  },
  {
    id: "tech-hub",
    brandName: "Tech Hub",
    brandInitials: "TH",
    status: "live",
    prize: "2 MON",
    time: "5m",
    buttonLabel: "Play Now",
  },
  {
    id: "fresh-mart",
    brandName: "Fresh Mart",
    brandInitials: "FM",
    status: "live",
    prize: "1.5 MON",
    time: "2m 15s",
    buttonLabel: "Play Now",
  },
  {
    id: "digital-bank",
    brandName: "Digital Bank",
    brandInitials: "DB",
    status: "live",
    prize: "2.5 MON",
    time: "3m",
    buttonLabel: "Play Now",
  },
  {
    id: "fitness-studio",
    brandName: "Fitness Studio",
    brandInitials: "FS",
    status: "live",
    prize: "1 MON",
    time: "1m 9s",
    buttonLabel: "Play Now",
  },
  {
    id: "bites",
    brandName: "Bites",
    brandInitials: "B",
    status: "live",
    prize: "3 MON",
    time: "4m",
    buttonLabel: "Play Now",
  },
];

export const allChallenges: Challenge[] = [
  ...activeChallenges,
  {
    id: "urban-grill",
    brandName: "Urban Grill",
    brandInitials: "UG",
    status: "live",
    prize: "2.8 MON",
    time: "6m 10s",
    buttonLabel: "Play Now",
  },
  {
    id: "nova-mobile",
    brandName: "Nova Mobile",
    brandInitials: "NM",
    status: "live",
    prize: "1.8 MON",
    time: "3m 48s",
    buttonLabel: "Play Now",
  },
  {
    id: "swift-pay",
    brandName: "Swift Pay",
    brandInitials: "SP",
    status: "live",
    prize: "2.1 MON",
    time: "3m",
    buttonLabel: "Play Now",
  },
];

export const comingSoonChallenges: Challenge[] = [
  {
    id: "rock-styles",
    brandName: "Monfuel",
    brandInitials: "RS",
    brandLogoPath: "/challenges/monfuel.svg",
    status: "pending",
    prize: "1.5 MON",
    time: "2m",
    buttonLabel: "Starting soon",
  },
  {
    id: "pulse-wear",
    brandName: "Orbit",
    brandInitials: "PW",
    brandLogoPath: "/challenges/orbit.svg",
    status: "pending",
    prize: "2.2 MON",
    time: "5m",
    buttonLabel: "Starting soon",
  },
  {
    id: "nova-bites",
    brandName: "Nova Bites",
    brandInitials: "NB",
    brandLogoPath: "/challenges/nova-bites.svg",
    status: "pending",
    prize: "1.9 MON",
    time: "4m",
    buttonLabel: "Starting soon",
  },
  {
    id: "city-wave",
    brandName: "City Wave",
    brandInitials: "CW",
    brandLogoPath: "/challenges/city-wave.svg",
    status: "pending",
    prize: "2.6 MON",
    time: "6m",
    buttonLabel: "Starting soon",
  },
];
