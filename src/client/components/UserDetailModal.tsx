import React, { useEffect, useState } from "react";
import {
  X,
  ArrowLeft,
  User as UserIcon,
  Mail,
  Phone,
  ShieldCheck,
  Building2,
  Calendar,
  Award,
  MapPin,
  ShoppingBag,
  ArrowLeftRight,
  Tag,
  AlertCircle,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { api } from "../api.js";
import { formatCurrency } from "./PropertyCard.js";
import { getPropertyStatusMeta, getPurchaseInterestStatusMeta } from "../utils/statusLabels.js";

interface UserDetailModalProps {
  userId: string | null;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
  userId,
  onClose,
  onStatusUpdated
}) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadUser = async (id: string) => {
    setLoading(true);
    setError(null);
    setUser(null); // Prevent displaying previous user's state
    try {
      const data = await api.getAdminUserById(id);
      setUser(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load user details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      loadUser(userId);
    } else {
      setUser(null);
    }
  }, [userId]);

  if (!userId) return null;

  const formatDate = (d?: string) => {
    if (!d) return "Not provided";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "Not provided";
    return dt.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const handleToggleStatus = async () => {
    if (!user || actionLoading) return;
    setActionLoading(true);
    try {
      const next = user.status === "active" ? "suspended" : "active";
      await api.updateUserStatus(user.id, next);
      await loadUser(user.id);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update account status.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Users</span>
            </button>
            <div>
              <h3 className="text-sm font-bold text-white">User Account Profile</h3>
              <span className="text-[11px] font-mono text-slate-400">ID: {userId}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500">Loading verified user record...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          ) : user ? (
            <>
              {/* Core Identity Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 font-bold text-lg flex items-center justify-center uppercase shrink-0">
                      {user.name ? user.name.slice(0, 2) : "US"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-slate-900">{user.name || "Not provided"}</h2>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          user.role === "admin"
                            ? "bg-purple-100 text-purple-800 border-purple-200"
                            : user.role === "broker"
                            ? "bg-teal-100 text-teal-800 border-teal-200"
                            : "bg-blue-100 text-blue-800 border-blue-200"
                        }`}>
                          {user.role}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          user.status === "active"
                            ? "bg-emerald-100 text-emerald-800"
                            : user.status === "pending"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {user.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{user.email || "Not provided"}</p>
                    </div>
                  </div>

                  {user.role !== "admin" && (
                    <button
                      type="button"
                      onClick={handleToggleStatus}
                      disabled={actionLoading}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 ${
                        user.status === "active"
                          ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                      }`}
                    >
                      {actionLoading ? "Updating..." : user.status === "active" ? "Suspend Account" : "Activate Account"}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Email Address</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {user.email || "Not provided"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Phone Number</span>
                    <span className="font-semibold text-slate-800 font-mono flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {user.phone || "Not provided"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Registration Date</span>
                    <span className="font-medium text-slate-700 flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDate(user.createdAt)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Last Updated</span>
                    <span className="font-medium text-slate-700 flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDate(user.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Broker Credentials Section (if broker) */}
              {user.role === "broker" && (
                <div className="bg-teal-50/50 border border-teal-200 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    Broker Credentials & Operating Profile
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Agency / Firm</span>
                      <span className="font-bold text-slate-900">{user.agency || "Not provided"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">RERA / License Number</span>
                      <span className="font-mono font-bold text-slate-900">{user.licenseNumber || "Not provided"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Operating Jurisdiction</span>
                      <span className="font-semibold text-slate-800">{user.jurisdiction || "Not provided"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Experience</span>
                      <span className="font-semibold text-slate-800">
                        {user.experienceYears !== null && user.experienceYears !== undefined ? `${user.experienceYears} Years` : "Not provided"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Properties Owned (and Sale Listings) */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  Registered Properties ({user.properties?.length || 0})
                </h4>
                {!user.properties || user.properties.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    No properties registered under this user account.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                    {user.properties.map((p: any) => {
                      const sm = getPropertyStatusMeta(p.status);
                      return (
                        <div key={p.id} className="p-3 bg-white flex items-center justify-between gap-3">
                          <div>
                            <div className="font-bold text-slate-900">{p.title || p.locality}</div>
                            <div className="text-[11px] text-slate-500">
                              #{p.id} • {p.locality}, {p.district} • Intent: <strong className="uppercase">{p.intent || "swap"}</strong>
                            </div>
                          </div>
                          <div className="text-right shrink-0 space-y-1">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${sm.pillClass}`}>
                              {sm.label}
                            </span>
                            <div className="text-[11px] font-semibold text-slate-700">
                              {formatCurrency(p.reviewedValue || p.ownerDeclaredValue)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Swap Proposals */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <ArrowLeftRight className="w-4 h-4 text-teal-600" />
                  Swap Proposals ({user.swapProposals?.length || 0})
                </h4>
                {!user.swapProposals || user.swapProposals.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    No active or historical swap proposals for this user.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                    {user.swapProposals.map((sp: any) => (
                      <div key={sp.id} className="p-3 bg-white flex items-center justify-between gap-3">
                        <div>
                          <div className="font-bold text-slate-900">Ref: {sp.ref} ({sp.partyCount}-Party)</div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">{sp.explanation}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold uppercase shrink-0">
                          {sp.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Purchase Interests */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-emerald-600" />
                  Buy & Sell Purchase Interests ({user.buyInterests?.length || 0})
                </h4>
                {!user.buyInterests || user.buyInterests.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    No purchase interests associated with this account.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
                    {user.buyInterests.map((bi: any) => {
                      const im = getPurchaseInterestStatusMeta(bi);
                      const isBuyer = bi.buyerId === user.id;
                      return (
                        <div key={bi.id} className="p-3 bg-white flex items-center justify-between gap-3">
                          <div>
                            <div className="font-bold text-slate-900">
                              {bi.listingTitle || bi.listingLocality || bi.listingId}{" "}
                              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                {isBuyer ? "As Buyer" : "As Seller"}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Offer: {bi.offerAmount ? formatCurrency(bi.offerAmount) : "Asking Price"} • {new Date(bi.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${im.badgeClass}`}>
                            {im.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
