import type {
  ChallengeCategory,
  ChallengeEntry,
  RewardEntry,
  ActivityEntry,
} from "@/lib/player-dashboard";

export type PlayerDashboardData = {
  challengeCategories: Array<{ key: ChallengeCategory; label: string }>;
  challengesByCategory: Record<ChallengeCategory, ChallengeEntry[]>;
  rewardsHistory: RewardEntry[];
  recentActivity: ActivityEntry[];
  playerProfile: {
    fullName: string;
    displayName: string;
    username: string;
    email: string;
    joinedDate: string;
    level: string;
    ranking: string;
    badge: string;
    walletPreview: string;
    walletAddress: string;
  };
  playerSummary: {
    walletBalance: string;
    walletHelper: string;
    totalRewardsEarned: string;
    challengesPlayed: number;
    challengesWon: number;
    availableRewards: string;
    liveParticipation: number;
  };
};
