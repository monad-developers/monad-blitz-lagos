export type ChallengeCategory = "available" | "upcoming" | "closed" | "played" | "won";

export type ChallengeEntry = {
  id: string;
  title: string;
  brandName: string;
  brandInitials: string;
  brandLogoPath?: string;
  reward: string;
  statusLabel: string;
  challengeType: string;
  startTime?: string;
  endTime?: string;
  timeRemaining?: string;
  endedDate?: string;
  participated: boolean;
  won: boolean;
  score?: string;
  payoutStatus?: "Pending" | "Processing" | "Paid" | "Claimed";
  actionLabel: string;
};

export type RewardEntry = {
  id: string;
  challengeTitle: string;
  amount: string;
  payoutDate: string;
  status: "Pending" | "Processing" | "Paid" | "Claimed";
  source: string;
};

export type ActivityEntry = {
  id: string;
  detail: string;
  time: string;
  tone: "positive" | "neutral" | "upcoming";
};

// Challenge categories for UI
export const challengeCategories: Array<{ key: ChallengeCategory; label: string }> = [
  { key: "available", label: "Active" },
  { key: "upcoming", label: "Upcoming" },
  { key: "closed", label: "Closed" },
  { key: "played", label: "Played" },
  { key: "won", label: "Won" },
];

// Placeholder history data until backend provides real data
export const rewardsHistory: RewardEntry[] = [];

// Placeholder activity until backend provides real data
export const recentActivity: ActivityEntry[] = [
  {
    id: "act-1",
    detail: "Welcome to Monarcade!",
    time: "Just now",
    tone: "positive",
  },
  {
    id: "act-2",
    detail: "Your dashboard is ready",
    time: "Just now",
    tone: "positive",
  },
];
