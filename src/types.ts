export type AssetCategory =
  | "real_estate"
  | "vehicle"
  | "machinery"
  | "business";

export type UserRole = "admin" | "broker" | "owner";
export type AccountStatus = "active" | "pending" | "rejected" | "suspended";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  phone?: string;
  agency?: string;
  licenseNumber?: string;
  jurisdiction?: string;
  experienceYears?: number;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type PropertyType =
  | "apartment"
  | "independent_house"
  | "plot_site"
  | "agricultural_land"
  | "farmhouse"
  | "commercial";

export type AreaUnit = "sq_ft" | "guntas" | "acres";

export type VerificationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "reviewed"
  | "rejected";

export interface OwnerRequirement {
  assetCategories?: AssetCategory[];
  propertyTypes: PropertyType[];
  preferredLocations: string[];
  maxDistanceKm?: number;
  minArea?: number;
  minAreaUnit?: AreaUnit;
  maxCashToPay?: number;
  maxCashToReceive?: number;
}

export interface Listing {
  id: string;
  ownerId?: string;
  ownerName: string;
  category?: AssetCategory;
  propertyType: PropertyType;
  district: string;
  locality: string;
  latitude?: number;
  longitude?: number;
  area: number;
  areaUnit: AreaUnit;
  ownerDeclaredValue: number;
  reviewedValue?: number;
  status: VerificationStatus;
  locked: boolean;
  wants: OwnerRequirement;
  metadata?: Record<string, unknown>;
}

export interface Boot {
  listingId: string;
  ownerId: string;
  ownerName: string;
  givesAssetId: string;
  givesPropertyType: PropertyType;
  givesValue: number;
  receivesAssetId: string;
  receivesPropertyType: PropertyType;
  receivesValue: number;
  amount: number; // positive = owner pays; negative = owner receives; 0 = exact balance
  action: "pays" | "receives" | "settled";
  cashDifference: number; // absolute cash value
  explanation: string;
}

export interface ExchangeLeg {
  fromListingId: string;
  fromOwnerName: string;
  toListingId: string;
  toOwnerName: string;
  transferredAssetId: string;
  transferredPropertyType: PropertyType;
  assetValue: number;
  distanceKm: number;
}

export interface Match {
  id: string;
  listingIds: string[];
  cycle: string[];
  partyCount: number;
  exchangeLegs: ExchangeLeg[];
  boots: Boot[];
  totalAbsoluteBoot: number;
  locationScoreKm: number;
  matchScore: number; // 0 to 100 quality rating
  verificationStatus: "reviewed";
  status: "proposed" | "accepted" | "declined" | "expired";
  responses: Record<string, "pending" | "accepted" | "declined">;
  explanation: string;
  reasons: string[];
  createdAt: string;
}
