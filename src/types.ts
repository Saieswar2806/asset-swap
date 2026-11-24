export type PropertyType =
  | "apartment"
  | "independent_house"
  | "plot_site"
  | "agricultural_land"
  | "farmhouse"
  | "commercial";

export interface Listing {
  id: string;
  ownerName: string;
  propertyType: PropertyType;
  district: string;
  locality: string;
  latitude?: number;
  longitude?: number;
  area: number;
  areaUnit: "sq_ft" | "guntas" | "acres";
  ownerDeclaredValue: number;
  reviewedValue?: number;
  status: "draft" | "submitted" | "under_review" | "reviewed" | "rejected";
  locked: boolean;
  wants: {
    propertyTypes: PropertyType[];
    preferredLocations: string[];
    maxCashToPay?: number;
    maxCashToReceive?: number;
  };
}

export interface Boot {
  listingId: string;
  ownerName: string;
  amount: number; // positive = pays; negative = receives
}

export interface Match {
  id: string;
  listingIds: string[];
  cycle: string[];
  partyCount: number;
  boots: Boot[];
  totalAbsoluteBoot: number;
  locationScoreKm: number;
  status: "proposed" | "accepted" | "declined" | "expired";
  responses: Record<string, "pending" | "accepted" | "declined">;
  createdAt: string;
}
