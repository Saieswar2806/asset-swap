import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Clock,
  CheckCircle2,
  XCircle,
  FileCheck2,
  User,
  ShieldCheck,
  Building2,
  MapPin,
  Maximize2,
  DollarSign,
  AlertCircle,
  RefreshCw,
  Award,
  Building
} from "lucide-react";
import { DashboardLayout, type NavItem } from "../components/DashboardLayout.js";
import { api } from "../api.js";
import { useUser } from "../context/UserContext.js";
import { formatCurrency } from "../components/PropertyCard.js";
import { PropertyImageGallery } from "../components/PropertyImageGallery.js";
import type { Listing } from "../types.js";

export const BrokerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isBroker, isAuthenticated, loading: authLoading } = useUser();
  const [activeTab, setActiveTab] = useState<string>("overview");

  const [stats, setStats] = useState<any>(null);
  const [queue, setQueue] = useState<Listing[]>([]);
  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Review modal
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [reviewedValuation, setReviewedValuation] = useState<string>("");
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !isBroker) {
        navigate("/login");
      }
    }
  }, [authLoading, isAuthenticated, isBroker, navigate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [s, q, r] = await Promise.all([
        api.getBrokerStats().catch(() => null),
        api.getBrokerQueue().catch(() => []),
        api.getBrokerMyReviews().catch(() => [])
      ]);
      setStats(s);
      setQueue(q);
      setMyReviews(r);
    } catch (err: any) {
      console.error("Failed to load broker data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isBroker) {
      loadData();
    }
  }, [isBroker]);

  const handleOpenReviewModal = (listing: Listing, defaultAction: "approve" | "reject" = "approve") => {
    setSelectedListing(listing);
    setActionType(defaultAction);
    setReviewedValuation(String(listing.ownerDeclaredValue));
    setReviewNotes("Sub-registrar guidance value and market comparables verified.");
    setRejectionReason("Valuation mismatch with prevailing sub-registrar rates.");
  };

  const handleSubmitReview = async () => {
    if (!selectedListing) return;
    setSubmittingReview(true);
    try {
      const res = await api.brokerReviewListing(selectedListing.id, {
        action: actionType,
        reviewedValue: actionType === "approve" ? Number(reviewedValuation) : undefined,
        internalNotes: reviewNotes,
        rejectionReason: actionType === "reject" ? rejectionReason : undefined
      });
      setFeedback({ message: res.message, type: "success" });
      setSelectedListing(null);
      await loadData();
    } catch (err: any) {
      setFeedback({ message: err.message, type: "error" });
    } finally {
      setSubmittingReview(false);
    }
  };

  const navItems: NavItem[] = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "queue", label: "Review Queue", icon: Clock, badge: queue.length > 0 ? queue.length : undefined },
    { id: "reviews", label: "My Reviews", icon: FileCheck2 },
    { id: "profile", label: "Profile", icon: User }
  ];

  return (
    <DashboardLayout
      role="broker"
      title="Broker Valuation Portal"
      subtitle={`Welcome, ${currentUser?.name || "Broker"} • Certified Real Estate Valuation Specialist`}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      navItems={navItems}
    >
      <div className="space-y-6">
        {feedback && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Review Queue</span>
                <span className="text-2xl font-bold text-amber-600 mt-1 block">
                  {stats?.queueCount ?? queue.length}
                </span>
                <span className="text-[10px] text-amber-700 mt-1 block">Awaiting broker inspection</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Assessed by Me</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">
                  {stats?.reviewedByMe ?? myReviews.length}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">Total completed assessments</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Approved by Me</span>
                <span className="text-2xl font-bold text-emerald-600 mt-1 block">
                  {stats?.approvedByMe ?? 0}
                </span>
                <span className="text-[10px] text-emerald-700 mt-1 block">Eligible for asset exchange</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Rejected by Me</span>
                <span className="text-2xl font-bold text-red-600 mt-1 block">
                  {stats?.rejectedByMe ?? 0}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">Documentation/valuation issues</span>
              </div>
            </div>

            {/* Quick Access to Queue */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900">Properties Requiring Your Valuation Assessment</h3>
                </div>
                <button
                  onClick={() => setActiveTab("queue")}
                  className="text-xs font-bold text-teal-600 hover:text-teal-800"
                >
                  View Full Queue ({queue.length})
                </button>
              </div>

              {queue.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  All submitted properties have been reviewed. No pending items in queue.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {queue.slice(0, 4).map((l) => (
                    <div key={l.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                          <span className="font-mono">#{l.id}</span>
                          <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Awaiting Valuation
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{l.metadata?.title as string || l.locality}</h4>
                        <div className="text-xs text-slate-500 mt-1">
                          {l.locality}, {l.district} • {l.area} {l.areaUnit}
                        </div>
                        <div className="text-xs font-semibold text-slate-700 mt-2">
                          Owner Declared: <strong className="text-slate-900">{formatCurrency(l.ownerDeclaredValue)}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                        <button
                          onClick={() => handleOpenReviewModal(l, "approve")}
                          className="flex-1 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors"
                        >
                          Assess & Approve
                        </button>
                        <button
                          onClick={() => handleOpenReviewModal(l, "reject")}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-lg text-xs font-bold transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* QUEUE TAB */}
        {activeTab === "queue" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <h2 className="text-base font-bold text-slate-900">Broker Review Queue</h2>
                <p className="text-xs text-slate-500">
                  Inspect submitted property records and manually enter assessed market valuations.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200">
                {queue.length} Pending
              </span>
            </div>

            {queue.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-400">
                Queue is empty. All listings have been reviewed.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {queue.map((l) => (
                  <div key={l.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                        <span className="font-mono font-bold">#{l.id}</span>
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold">
                          Under Review
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{l.metadata?.title as string || l.locality}</h3>
                      <div className="text-xs text-slate-500 mt-1">
                        {l.locality}, {l.district} • {l.area} {l.areaUnit}
                      </div>

                      <div className="mt-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                        <div className="flex justify-between text-slate-500">
                          <span>Owner:</span>
                          <span className="font-bold text-slate-800">{l.ownerName}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Declared Value:</span>
                          <span className="font-bold text-slate-800">{formatCurrency(l.ownerDeclaredValue)}</span>
                        </div>
                        {Boolean(l.metadata?.khataType) && (
                          <div className="flex justify-between text-slate-500">
                            <span>Khata Type:</span>
                            <span className="font-medium text-slate-700">{String(l.metadata?.khataType)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      <button
                        onClick={() => handleOpenReviewModal(l, "approve")}
                        className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                      >
                        Enter Reviewed Valuation
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MY REVIEWS TAB */}
        {activeTab === "reviews" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">My Completed Valuation Reviews</h2>
              <p className="text-xs text-slate-500">Historical log of properties evaluated under your broker license.</p>
            </div>

            {myReviews.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                You have not completed any reviews yet. Properties you evaluate will appear here.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                {myReviews.map((r) => (
                  <div key={r.reviewId} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{r.title}</span>
                        <span className="font-mono text-[10px] text-slate-400">#{r.listingId}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            r.action === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {r.action}
                        </span>
                      </div>
                      <div className="text-slate-500 mt-1">
                        Owner: {r.ownerName} • Declared: {formatCurrency(r.ownerDeclaredValue)} • Reviewed: <strong className="text-slate-800">{formatCurrency(r.reviewedValue)}</strong>
                      </div>
                      {r.internalNotes && (
                        <div className="text-[11px] text-slate-400 italic mt-0.5">Notes: {r.internalNotes}</div>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono sm:text-right">
                      {new Date(r.reviewDate).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs max-w-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Broker Professional Profile</h3>
            <div className="text-xs space-y-2.5 text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div><strong className="text-slate-800">Broker Name:</strong> {currentUser?.name}</div>
              <div><strong className="text-slate-800">Email:</strong> {currentUser?.email}</div>
              <div><strong className="text-slate-800">Agency / Firm:</strong> {currentUser?.agency || "Karnataka Valuation Partners"}</div>
              <div><strong className="text-slate-800">License Number:</strong> <span className="font-mono font-bold text-slate-900">{currentUser?.licenseNumber || "KAR-REV-2018-0912"}</span></div>
              <div><strong className="text-slate-800">Jurisdiction:</strong> {currentUser?.jurisdiction || "Bengaluru, Ramanagara, Mysuru"}</div>
              <div><strong className="text-slate-800">Experience:</strong> {currentUser?.experienceYears || 10} Years</div>
              <div><strong className="text-slate-800">Status:</strong> <span className="text-emerald-700 font-bold">Active & Verified</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Review & Valuation Assessment Modal */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Broker Valuation Assessment</h3>
                <span className="text-xs text-slate-500 font-mono">Asset #{selectedListing.id}</span>
              </div>
              <button onClick={() => setSelectedListing(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {/* Property Image Gallery */}
            <PropertyImageGallery
              images={selectedListing.images || (selectedListing.metadata?.images as string[]) || (selectedListing.imageUrl ? [selectedListing.imageUrl] : [])}
              propertyType={selectedListing.propertyType}
              title={selectedListing.title || selectedListing.locality}
              aspectRatio="wide"
            />

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900">{selectedListing.metadata?.title as string || selectedListing.locality}</div>
              <div className="text-slate-500">{selectedListing.locality}, {selectedListing.district} • {selectedListing.area} {selectedListing.areaUnit}</div>
              <div className="text-slate-700">Owner Declared Value: <strong>{formatCurrency(selectedListing.ownerDeclaredValue)}</strong></div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActionType("approve")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                  actionType === "approve"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                Approve with Valuation
              </button>
              <button
                type="button"
                onClick={() => setActionType("reject")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                  actionType === "reject"
                    ? "bg-red-600 text-white border-red-600 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                Reject Listing
              </button>
            </div>

            {actionType === "approve" ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Broker-Assessed Property Valuation (₹ INR)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={reviewedValuation}
                    onChange={(e) => setReviewedValuation(e.target.value)}
                    placeholder="e.g. 20000000"
                    className="w-full text-sm font-bold text-slate-900 p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Formally entered value: <strong className="text-slate-800">{formatCurrency(Number(reviewedValuation) || 0)}</strong>
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Broker Review Notes
                  </label>
                  <textarea
                    rows={2}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mandatory Rejection Reason
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain discrepancy or missing documentation..."
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedListing(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingReview}
                onClick={handleSubmitReview}
                className={`px-5 py-2 text-white rounded-xl text-xs font-bold transition-colors ${
                  actionType === "approve" ? "bg-teal-600 hover:bg-teal-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {submittingReview ? "Saving..." : actionType === "approve" ? "Confirm & Approve" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
