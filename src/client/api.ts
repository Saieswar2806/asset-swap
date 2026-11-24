import type { ApiResponse, DashboardStats, Listing, Match, User } from "./types.js";

const BASE_URL = "/api";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("asset_swap_token") : null;
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch(`${BASE_URL}${url}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
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
  // ==========================================
  // Authentication & Session
  // ==========================================
  login: async (email: string, password: string): Promise<{ user: User; token: string }> => {
    const res = await fetchJson<ApiResponse<{ user: User; token: string }>>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    if (res.data?.token) {
      localStorage.setItem("asset_swap_token", res.data.token);
    }
    return res.data!;
  },

  register: async (payload: { name: string; email: string; phone?: string; password: string; confirmPassword?: string }): Promise<{ user: User; token: string }> => {
    const res = await fetchJson<ApiResponse<{ user: User; token: string }>>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    if (res.data?.token) {
      localStorage.setItem("asset_swap_token", res.data.token);
    }
    return res.data!;
  },

  applyBroker: async (payload: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    agency?: string;
    licenseNumber: string;
    jurisdiction?: string;
    experienceYears?: number;
  }): Promise<{ message: string; brokerId: string }> => {
    return await fetchJson<{ success: boolean; message: string; brokerId: string }>("/auth/broker-apply", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const res = await fetchJson<any>("/auth/me");
      return res.user || res.data || null;
    } catch {
      return null;
    }
  },

  logout: async (): Promise<void> => {
    try {
      await fetchJson("/auth/logout", { method: "POST" });
    } finally {
      localStorage.removeItem("asset_swap_token");
    }
  },

  updateProfile: async (payload: Record<string, unknown>): Promise<User> => {
    const res = await fetchJson<any>("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    return res.user || res.data!;
  },

  // ==========================================
  // Admin Operations
  // ==========================================
  getAdminMetrics: async (): Promise<any> => {
    const res = await fetchJson<ApiResponse<any>>("/admin/metrics");
    return res.data;
  },

  getAdminUsers: async (params?: { role?: string; status?: string; search?: string }): Promise<User[]> => {
    const query = new URLSearchParams();
    if (params?.role) query.set("role", params.role);
    if (params?.status) query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await fetchJson<ApiResponse<User[]>>(`/admin/users${qs}`);
    return res.data || [];
  },

  updateUserStatus: async (id: string, status: "active" | "suspended" | "rejected", rejectionReason?: string): Promise<string> => {
    const res = await fetchJson<{ success: boolean; message: string }>(`/admin/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, rejectionReason })
    });
    return res.message;
  },

  getAdminBrokers: async (params?: { status?: string }): Promise<User[]> => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await fetchJson<ApiResponse<User[]>>(`/admin/brokers${qs}`);
    return res.data || [];
  },

  reviewBrokerApplication: async (id: string, action: "approve" | "reject", rejectionReason?: string): Promise<string> => {
    const res = await fetchJson<{ success: boolean; message: string }>(`/admin/brokers/${id}/review`, {
      method: "POST",
      body: JSON.stringify({ action, rejectionReason })
    });
    return res.message;
  },

  // ==========================================
  // Broker Operations
  // ==========================================
  getBrokerStats: async (): Promise<{ queueCount: number; reviewedByMe: number; approvedByMe: number; rejectedByMe: number }> => {
    const res = await fetchJson<ApiResponse<{ queueCount: number; reviewedByMe: number; approvedByMe: number; rejectedByMe: number }>>("/broker/dashboard/stats");
    return res.data!;
  },

  getBrokerQueue: async (): Promise<Listing[]> => {
    const res = await fetchJson<ApiResponse<Listing[]>>("/broker/queue");
    return res.data || [];
  },

  getBrokerMyReviews: async (): Promise<any[]> => {
    const res = await fetchJson<ApiResponse<any[]>>("/broker/my-reviews");
    return res.data || [];
  },

  brokerReviewListing: async (id: string, payload: {
    action: "approve" | "reject";
    reviewedValue?: number;
    internalNotes?: string;
    rejectionReason?: string;
  }): Promise<{ message: string; data: Listing }> => {
    const res = await fetchJson<ApiResponse<Listing> & { message: string }>(`/broker/listings/${id}/review`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return { message: res.message || "Review updated", data: res.data! };
  },

  // ==========================================
  // Owner Operations
  // ==========================================
  getOwnerStats: async (): Promise<any> => {
    const res = await fetchJson<ApiResponse<any>>("/owner/dashboard/stats");
    return res.data!;
  },

  getOwnerListings: async (): Promise<Listing[]> => {
    const res = await fetchJson<ApiResponse<Listing[]>>("/owner/listings");
    return res.data || [];
  },

  createOwnerListing: async (listingData: Record<string, unknown>): Promise<Listing> => {
    const res = await fetchJson<ApiResponse<Listing>>("/owner/listings", {
      method: "POST",
      body: JSON.stringify(listingData)
    });
    return res.data!;
  },

  updateOwnerListing: async (id: string, listingData: Record<string, unknown>): Promise<Listing> => {
    const res = await fetchJson<ApiResponse<Listing>>(`/owner/listings/${id}`, {
      method: "PUT",
      body: JSON.stringify(listingData)
    });
    return res.data!;
  },

  deleteOwnerListing: async (id: string): Promise<string> => {
    const res = await fetchJson<{ success: boolean; message: string }>(`/owner/listings/${id}`, {
      method: "DELETE"
    });
    return res.message;
  },

  getOwnerMatches: async (params?: { radiusKm?: number }): Promise<Match[]> => {
    const query = new URLSearchParams();
    if (params?.radiusKm) query.set("radiusKm", String(params.radiusKm));
    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await fetchJson<ApiResponse<Match[]>>(`/owner/matches${qs}`);
    return res.data || [];
  },

  // ==========================================
  // General & Public Operations (Preserved)
  // ==========================================
  getDashboardStats: async (): Promise<DashboardStats> => {
    const res = await fetchJson<ApiResponse<DashboardStats>>("/dashboard/stats");
    return res.data!;
  },

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

  getMatchById: async (id: string): Promise<Match & { participants: any[] }> => {
    const res = await fetchJson<ApiResponse<Match & { participants: any[] }>>(`/matches/${id}`);
    return res.data!;
  },

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
  },

  getProposals: async (params?: { status?: string; ownerId?: string }): Promise<any[]> => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.ownerId) query.set("ownerId", params.ownerId);
    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await fetchJson<ApiResponse<any[]>>(`/proposals${qs}`);
    return res.data || [];
  },

  getActivityLogs: async (params?: { entityType?: string; limit?: number }): Promise<any[]> => {
    const query = new URLSearchParams();
    if (params?.entityType) query.set("entityType", params.entityType);
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await fetchJson<ApiResponse<any[]>>(`/activity${qs}`);
    return res.data || [];
  }
};
