import type { Listing, Match, PropertyType, AreaUnit, VerificationStatus, Boot, ExchangeLeg, UserRole, AccountStatus, User } from "../types.js";

export type { Listing, Match, PropertyType, AreaUnit, VerificationStatus, Boot, ExchangeLeg, UserRole, AccountStatus, User };

export interface DashboardStats {
  totalListings: number;
  awaitingReview: number;
  brokerReviewed: number;
  rejectedListings: number;
  availableMatchesCount: number;
  activeProposals: number;
  completedTrades: number;
  typeDistribution: Array<{ type: PropertyType; count: number; avgValue: number }>;
  districtDistribution: Array<{ district: string; count: number }>;
  recentListings: Listing[];
  recentMatches: Match[];
  exchangeActivity: Array<{ month: string; proposals: number; completed: number; volumeCr: number }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
  twoPartyCount?: number;
  threePartyCount?: number;
}
