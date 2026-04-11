export type BrandCampaignStatus = "pending" | "live" | "ended" | "settled";

export type BrandProfileSummary = {
  companyName: string;
  tagline: string;
  logoPath?: string;
  category?: string;
  brandColor?: string;
  brandFact?: string;
  website?: string;
};

export type BrandCampaign = {
  challengeId: number;
  name: string;
  tagline?: string;
  logoPath?: string;
  category?: string;
  brandColor?: string;
  prizePool: string;
  duration?: number;
  winnerCount?: number;
  started: boolean;
  distributed?: boolean;
  startTime?: number;
  endTime?: number;
  scoreCount?: number;
  metadataHash?: string;
  leaderboard?: Array<{
    rank: number;
    address: string;
    score: number;
    txHash?: string;
  }>;
  refunded?: boolean;
  status: BrandCampaignStatus;
};

export type BrandDashboardSummary = {
  totalCampaigns: number;
  pendingCampaigns: number;
  liveCampaigns: number;
  completedCampaigns: number;
  totalPrizePoolMon: number;
  totalParticipants: number;
  bestScore: number;
  walletBalance: string;
};

export type BrandDashboardData = {
  walletAddress: string;
  walletPreview: string;
  explorerBaseUrl: string;
  profile: BrandProfileSummary | null;
  summary: BrandDashboardSummary;
  campaigns: BrandCampaign[];
};
