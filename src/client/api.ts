import type { ApiResponse, DashboardStats, Listing, Match, User } from "./types.js";

const BASE_URL = "/api";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    },
    ...options
  });

  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.error || `HTTP error! status: ${res.status}`);
  }
  return data;
}

export const api = {
  // Users
  getUsers: async (): Promise<User[]> => {
    const res = await fetchJson<ApiResponse<User[]>>("/users");
    return res.data || [];
  },

  // Dashboard stats
  getDashboardStats: async (): Promise<DashboardStats> => {
    const res = await fetchJson<ApiResponse<DashboardStats>>("/dashboard/stats");
    return res.data!;
  },

  // Listings
  getListings: async (params?: { ownerId?: string; status?: string; propertyType?: string; district?: string; search?: string }): Promise<Listing[]> => {
    const query = new URLSearchParams();
    if (params?.ownerId) query.set("ownerId", params.ownerId);
    if (params?.status) query.set("status", params.status);
    if (params?.propertyType) query.set("propertyType", params.propertyType);
    if (params?.district) query.set("district", params.district);
    if (params?.search) query.set("search", params.search);

    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await fetchJson<ApiResponse<Listing[]>>(`/listings${qs}`);
    return res.data || [];
  },

  getListingById: async (id: string): Promise<Listing> => {
    const res = await fetchJson<ApiResponse<Listing>>(`/listings/${id}`);
    return res.data!;
  },

  createListing: async (listingData: Record<string, unknown>): Promise<Listing> => {
    const res = await fetchJson<ApiResponse<Listing>>("/listings", {
      method: "POST",
      body: JSON.stringify(listingData)
    });
    return res.data!;
  },

  updateListing: async (id: string, listingData: Record<string, unknown>): Promise<Listing> => {
    const res = await fetchJson<ApiResponse<Listing>>(`/listings/${id}`, {
      method: "PUT",
      body: JSON.stringify(listingData)
    });
    return res.data!;
  },

  // Admin Review
  getAdminReviewListings: async (status?: string): Promise<Listing[]> => {
    const qs = status ? `?status=${status}` : "";
    const res = await fetchJson<ApiResponse<Listing[]>>(`/admin/listings${qs}`);
    return res.data || [];
  },

  reviewListing: async (id: string, payload: { action: "approve" | "reject"; reviewedValue?: number; internalNotes?: string; rejectionReason?: string; reviewerId?: string; reviewerName?: string }): Promise<{ message: string; data: Listing }> => {
    const res = await fetchJson<ApiResponse<Listing> & { message: string }>(`/admin/listings/${id}/review`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return { message: res.message || "Review updated", data: res.data! };
  },

  // Matches
  getMatches: async (params?: { ownerId?: string; listingId?: string; radiusKm?: number }): Promise<{ matches: Match[]; twoPartyCount: number; threePartyCount: number }> => {
    const query = new URLSearchParams();
    if (params?.ownerId) query.set("ownerId", params.ownerId);
    if (params?.listingId) query.set("listingId", params.listingId);
    if (params?.radiusKm) query.set("radiusKm", String(params.radiusKm));

    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await fetchJson<ApiResponse<Match[]>>(`/matches${qs}`);
    return {
      matches: res.data || [],
      twoPartyCount: res.twoPartyCount || 0,
      threePartyCount: res.threePartyCount || 0
    };
  },

  getMatchById: async (id: string): Promise<Match & { participants: unknown[] }> => {
    const res = await fetchJson<ApiResponse<Match & { participants: unknown[] }>>(`/matches/${id}`);
    return res.data!;
  },

  // Workflow
  proposeMatch: async (matchId: string): Promise<{ message: string; matchId: string }> => {
    return await fetchJson<{ success: boolean; message: string; matchId: string }>("/workflow/propose", {
      method: "POST",
      body: JSON.stringify({ matchId })
    });
  },

  respondToMatch: async (matchId: string, listingId: string, decision: "accepted" | "declined"): Promise<{ message: string; matchStatus: string }> => {
    return await fetchJson<{ success: boolean; message: string; matchStatus: string }>("/workflow/respond", {
      method: "POST",
      body: JSON.stringify({ matchId, listingId, decision })
    });
  },

  expireMatch: async (matchId: string): Promise<{ message: string; matchStatus: string }> => {
    return await fetchJson<{ success: boolean; message: string; matchStatus: string }>("/workflow/expire", {
      method: "POST",
      body: JSON.stringify({ matchId })
    });
  }
};
