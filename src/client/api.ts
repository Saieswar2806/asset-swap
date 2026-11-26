import type { ApiResponse, DashboardStats, Listing, Match, User } from "./types.js";

const BASE_URL = "/api";

export interface AuthResult {
  user: User;
  token: string;
}

/**
 * Extracts authentication user and token from either top-level or nested response structures.
 * Throws a meaningful error if the response is malformed or missing the user object.
 */
export function extractAuthResult(res: any): AuthResult {
  if (!res || typeof res !== "object") {
    throw new Error("Authentication failed: Empty or malformed response from server.");
  }

  const user = res.user || res.data?.user;
  const token = res.token || res.data?.token || "";

  if (!user || typeof user !== "object" || !user.id || !user.role) {
    throw new Error("Authentication failed: Response missing valid user profile.");
  }

  return { user, token };
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("asset_swap_token") : null;
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${url}`, {
      credentials: "include",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...(options?.headers as Record<string, string>)
      }
    });
  } catch (networkErr: any) {
    throw new Error(`Network error: ${networkErr?.message || "Failed to communicate with server."}`);
  }

  let data: any;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || `HTTP error! status: ${res.status}` };
  }

  if (!res.ok || data.success === false) {
    const errorMsg = data.error || data.message || `HTTP error! status: ${res.status}`;
    const err = new Error(errorMsg);
    (err as any).status = res.status;
    (err as any).data = data;
    throw err;
  }
  return data as T;
}

export const api = {
  // ==========================================
  // Authentication & Session
  // ==========================================
  login: async (email: string, password: string): Promise<AuthResult> => {
    const res = await fetchJson<any>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    const result = extractAuthResult(res);
    if (result.token) {
      localStorage.setItem("asset_swap_token", result.token);
    }
    return result;
  },

  register: async (payload: { name: string; email: string; phone?: string; password: string; confirmPassword?: string }): Promise<AuthResult> => {
    const res = await fetchJson<any>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const result = extractAuthResult(res);
    if (result.token) {
      localStorage.setItem("asset_swap_token", result.token);
    }
    return result;
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
  }): Promise<{ message: string; brokerId: string; user?: User }> => {
    const res = await fetchJson<any>("/auth/broker-apply", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const brokerId = res.brokerId || res.data?.brokerId || "";
    const message = res.message || res.data?.message || "Broker application submitted.";
    const user = res.user || res.data?.user;
    return { message, brokerId, user };
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const res = await fetchJson<any>("/auth/me");
      const user = res.user || res.data?.user || (res.data?.id ? res.data : null);
      if (user && typeof user === "object" && user.id && user.role) {
        return user;
      }
      return null;
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
    const user = res.user || res.data?.user || res.data;
    if (!user || typeof user !== "object" || !user.id || !user.role) {
      throw new Error("Profile update failed: Invalid user data returned from server.");
    }
    return user;
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

  getAdminBrokerById: async (id: string): Promise<User & { auditLogs?: any[] }> => {
    const res = await fetchJson<ApiResponse<User & { auditLogs?: any[] }>>(`/admin/brokers/${id}`);
    return res.data!;
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
  },

  // ==========================================
  // Buy Functionality
  // ==========================================
  getBuyListings: async (params?: {
    search?: string;
    propertyType?: string;
    district?: string;
    minPrice?: number;
    maxPrice?: number;
    minArea?: number;
    bedrooms?: number;
  }): Promise<Listing[]> => {
    const query = new URLSearchParams();
    if (params?.search) query.set("search", params.search);
    if (params?.propertyType) query.set("propertyType", params.propertyType);
    if (params?.district) query.set("district", params.district);
    if (params?.minPrice) query.set("minPrice", String(params.minPrice));
    if (params?.maxPrice) query.set("maxPrice", String(params.maxPrice));
    if (params?.minArea) query.set("minArea", String(params.minArea));
    if (params?.bedrooms) query.set("bedrooms", String(params.bedrooms));
    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await fetchJson<ApiResponse<Listing[]>>(`/buy/listings${qs}`);
    return res.data || [];
  },

  getBuyListingById: async (id: string): Promise<Listing> => {
    const res = await fetchJson<ApiResponse<Listing>>(`/buy/listings/${id}`);
    return res.data!;
  },

  submitBuyerInquiry: async (payload: {
    listingId: string;
    message: string;
    offerAmount?: number;
    buyerPhone?: string;
  }): Promise<{ message: string; data: any }> => {
    const res = await fetchJson<ApiResponse<any>>("/buy/inquiries", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return { message: res.message || "Inquiry sent", data: res.data };
  },

  getMyBuyInquiries: async (): Promise<any[]> => {
    const res = await fetchJson<ApiResponse<any[]>>("/buy/my-inquiries");
    return res.data || [];
  },

  // ==========================================
  // Sell Functionality
  // ==========================================
  getSellListings: async (): Promise<Array<Listing & { inquiryCount: number }>> => {
    const res = await fetchJson<ApiResponse<Array<Listing & { inquiryCount: number }>>>("/sell/listings");
    return res.data || [];
  },

  enableSaleListing: async (payload: {
    listingId: string;
    askingPrice: number;
    saleDescription?: string;
    intent?: "sell" | "both";
  }): Promise<{ message: string; data: any }> => {
    const res = await fetchJson<ApiResponse<any>>("/sell/enable", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return { message: res.message || "Sale listing enabled", data: res.data };
  },

  updateSaleListing: async (id: string, payload: {
    askingPrice?: number;
    saleDescription?: string;
    intent?: "swap" | "sell" | "both";
  }): Promise<{ message: string }> => {
    const res = await fetchJson<ApiResponse<any>>(`/sell/listings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    return { message: res.message || "Sale terms updated" };
  },

  getSellInquiries: async (): Promise<any[]> => {
    const res = await fetchJson<ApiResponse<any[]>>("/sell/inquiries");
    return res.data || [];
  },

  updateInquiryStatus: async (id: string, status: "pending" | "contacted" | "closed"): Promise<{ message: string; data: any }> => {
    const res = await fetchJson<ApiResponse<any>>(`/sell/inquiries/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    return { message: res.message || "Status updated", data: res.data };
  },

  markListingSold: async (id: string): Promise<{ message: string }> => {
    const res = await fetchJson<ApiResponse<any>>(`/sell/listings/${id}/sold`, {
      method: "PATCH"
    });
    return { message: res.message || "Property marked as sold" };
  },

  deactivateSaleListing: async (id: string): Promise<{ message: string }> => {
    const res = await fetchJson<ApiResponse<any>>(`/sell/listings/${id}/deactivate`, {
      method: "PATCH"
    });
    return { message: res.message || "Property sale listing deactivated" };
  },

  // ==========================================
  // Admin Accepted Exchanges Coordination & Notifications
  // ==========================================
  getAdminAcceptedExchanges: async (params?: { status?: string; search?: string }): Promise<any[]> => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== "all") query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    const qs = query.toString();
    const res = await fetchJson<ApiResponse<any[]>>(`/admin/exchanges${qs ? `?${qs}` : ""}`);
    return res.data || [];
  },

  updateExchangeCoordinationStatus: async (id: string, status: string, notes?: string): Promise<{ message: string }> => {
    const res = await fetchJson<ApiResponse<any>>(`/admin/exchanges/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, notes })
    });
    return { message: res.message || "Coordination status updated" };
  },

  scheduleSiteVisit: async (id: string, payload: { siteVisitDate: string; siteVisitLocation?: string; siteVisitNotes?: string }): Promise<{ message: string }> => {
    const res = await fetchJson<ApiResponse<any>>(`/admin/exchanges/${id}/site-visit`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
    return { message: res.message || "Site visit scheduled successfully" };
  },

  addExchangeCoordinationNote: async (id: string, note: string): Promise<{ message: string }> => {
    const res = await fetchJson<ApiResponse<any>>(`/admin/exchanges/${id}/notes`, {
      method: "POST",
      body: JSON.stringify({ note })
    });
    return { message: res.message || "Note added successfully" };
  },

  getAdminNotifications: async (): Promise<{ data: any[]; unreadCount: number }> => {
    const res = await fetchJson<any>("/admin/notifications");
    return { data: res.data || [], unreadCount: res.unreadCount || 0 };
  },

  markAdminNotificationRead: async (id: string): Promise<{ message: string }> => {
    const res = await fetchJson<ApiResponse<any>>(`/admin/notifications/${id}/read`, {
      method: "PATCH"
    });
    return { message: res.message || "Notification marked as read" };
  },

  markAllAdminNotificationsRead: async (): Promise<{ message: string }> => {
    const res = await fetchJson<ApiResponse<any>>("/admin/notifications/read-all", {
      method: "PATCH"
    });
    return { message: res.message || "All notifications marked as read" };
  },

  // ==========================================
  // Owner Exchanges Coordination & Notifications
  // ==========================================
  getOwnerAcceptedExchanges: async (): Promise<any[]> => {
    const res = await fetchJson<ApiResponse<any[]>>("/owner/exchanges");
    return res.data || [];
  },

  getOwnerNotifications: async (): Promise<{ data: any[]; unreadCount: number }> => {
    const res = await fetchJson<any>("/owner/notifications");
    return { data: res.data || [], unreadCount: res.unreadCount || 0 };
  },

  markOwnerNotificationRead: async (id: string): Promise<{ message: string }> => {
    const res = await fetchJson<ApiResponse<any>>(`/owner/notifications/${id}/read`, {
      method: "PATCH"
    });
    return { message: res.message || "Notification marked as read" };
  }
};
