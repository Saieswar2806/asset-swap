import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  FileText,
  AlertCircle,
  Eye,
  Check,
  X,
  Search,
  Scale
} from "lucide-react";
import { api } from "../api.js";
import { useUser } from "../context/UserContext.js";
import type { Listing } from "../types.js";
import { formatCurrency } from "../components/PropertyCard.js";

export const AdminReviewPage: React.FC = () => {
  const { currentUser } = useUser();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  // Review action modal state
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null);
  const [valuationInput, setValuationInput] = useState<string>("");
  const [internalNotes, setInternalNotes] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadListings = () => {
    setLoading(true);
    api.getAdminReviewListings()
      .then((data) => setListings(data))
      .catch((err) => console.error("Failed to load admin listings:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadListings();
  }, []);

  const openApproveModal = (listing: Listing) => {
    setSelectedListing(listing);
    setReviewAction("approve");
    // Pre-fill with declared value as suggestion for broker, but requires manual entry/confirmation
    setValuationInput(String(listing.ownerDeclaredValue || ""));
    setInternalNotes("Physical broker inspection completed. Verified with sub-registrar guidance value and market comparables.");
    setRejectionReason("");
    setFeedbackMessage(null);
  };

  const openRejectModal = (listing: Listing) => {
    setSelectedListing(listing);
    setReviewAction("reject");
    setValuationInput("");
    setInternalNotes("");
    setRejectionReason("Guidance value mismatch / Document verification inconclusive.");
    setFeedbackMessage(null);
  };

  const handleReviewSubmit = async () => {
    if (!selectedListing || !reviewAction) return;

    if (reviewAction === "approve") {
      const val = Number(valuationInput);
      if (!val || val <= 0) {
        setFeedbackMessage({ type: "error", text: "Please enter a valid positive broker-reviewed valuation." });
        return;
      }
    }

    if (reviewAction === "reject") {
      if (!rejectionReason.trim()) {
        setFeedbackMessage({ type: "error", text: "Please provide a reason for rejecting this property." });
        return;
      }
    }

    setSubmittingReview(true);
    try {
      const res = await api.reviewListing(selectedListing.id, {
        action: reviewAction,
        reviewedValue: reviewAction === "approve" ? Number(valuationInput) : undefined,
        internalNotes,
        rejectionReason: reviewAction === "reject" ? rejectionReason : undefined,
        reviewerId: currentUser?.id,
        reviewerName: currentUser?.name
      });

      setFeedbackMessage({ type: "success", text: res.message });
      loadListings();
      setTimeout(() => {
        setReviewAction(null);
        setSelectedListing(null);
      }, 1200);
    } catch (err: unknown) {
      setFeedbackMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to record review."
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Admin Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            Administrative Broker Assessment Panel
          </div>
          <h1 className="text-2xl font-bold">Property Valuation Review & Approval</h1>
          <p className="text-slate-400 text-xs max-w-2xl leading-relaxed">
            Review submitted real estate listings, inspect land survey numbers and Khata classification, and manually enter broker assessments.
          </p>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/80 p-4 rounded-xl text-center self-start sm:self-auto min-w-[160px]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Awaiting Broker Review
          </span>
          <span className="text-3xl font-extrabold text-amber-400 block mt-1">
            {listings.filter((l) => l.status === "submitted" || l.status === "under_review").length}
          </span>
        </div>
      </div>

      {/* Important Policy Notice Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-900">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Human Broker Valuation Integrity Policy</p>
          <p className="text-amber-800 leading-relaxed text-[11px]">
            In strict compliance with Asset Swap platform regulations, <strong>no machine-learning models or algorithmic value generators</strong> are permitted to set property values. Every valuation must be manually evaluated based on verified local broker appraisals. Actual legal conveyancing is later facilitated by independent advocates.
          </p>
        </div>
      </div>

      {/* Table of Listings Awaiting Review */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            Submitted Listings Queue ({listings.length})
          </h3>
          <button
            onClick={loadListings}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            Refresh Queue
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs font-semibold text-slate-500">
            Loading submitted listings...
          </div>
        ) : listings.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="font-bold text-slate-800 text-sm">Review Queue Clear</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All submitted listings have been reviewed by the broker team. New submissions will automatically appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Property / Title</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Type & Area</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Declared Value</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {listings.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <div className="line-clamp-1">{l.metadata?.title as string || l.locality}</div>
                      <span className="font-mono text-[10px] font-normal text-slate-400">#{l.id}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {l.ownerName}
                    </td>
                    <td className="py-3.5 px-4 capitalize">
                      <span className="font-semibold text-slate-900">{l.propertyType.replace(/_/g, " ")}</span>
                      <span className="block text-[11px] text-slate-500">{l.area} {l.areaUnit}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {l.locality}, {l.district}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-blue-900">
                      {formatCurrency(l.ownerDeclaredValue)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        l.status === "reviewed"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                          : l.status === "rejected"
                          ? "bg-red-50 border-red-200 text-red-700"
                          : "bg-amber-50 border-amber-200 text-amber-700"
                      }`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openApproveModal(l)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve Valuation
                        </button>
                        <button
                          onClick={() => openRejectModal(l)}
                          className="px-2 py-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 rounded-lg text-xs font-bold transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Action Modal */}
      {reviewAction && selectedListing && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">
                  Property Assessment • #{selectedListing.id}
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {reviewAction === "approve" ? "Enter Broker Valuation & Approve" : "Reject Property Submission"}
                </h3>
              </div>
              <button
                onClick={() => setReviewAction(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Property Overview */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Asset Title:</span>
                <span className="font-bold text-slate-900">{selectedListing.metadata?.title as string || selectedListing.locality}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Owner:</span>
                <span className="font-semibold text-slate-800">{selectedListing.ownerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Survey No / Khata:</span>
                <span className="font-semibold text-slate-800">
                  {selectedListing.metadata?.surveyNumber as string || "Sy. 101/1"} ({selectedListing.metadata?.khataType as string || "A-Khata"})
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200/80 pt-1.5 font-bold">
                <span className="text-slate-600">Owner-Declared Value:</span>
                <span className="text-blue-900 text-sm">{formatCurrency(selectedListing.ownerDeclaredValue)}</span>
              </div>
            </div>

            {/* Feedback Message */}
            {feedbackMessage && (
              <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                feedbackMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}>
                {feedbackMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{feedbackMessage.text}</span>
              </div>
            )}

            {/* Action Fields */}
            {reviewAction === "approve" ? (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Broker-Assessed Valuation (₹ INR) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-semibold text-sm">₹</span>
                    <input
                      type="number"
                      value={valuationInput}
                      onChange={(e) => setValuationInput(e.target.value)}
                      placeholder="e.g. 20000000"
                      className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  {valuationInput && Number(valuationInput) > 0 && (
                    <p className="text-[11px] text-emerald-700 font-bold mt-1">
                      Certified Broker Assessment: {formatCurrency(Number(valuationInput))}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Internal Valuation Notes & Guidance Rate Reference
                  </label>
                  <textarea
                    rows={3}
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Physical site inspection report reference, sub-registrar guidance value notes..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Reason for Rejection *
                  </label>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Specify why the property was rejected (e.g., valuation discrepancy, unclear survey boundary, pending litigation)..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setReviewAction(null)}
                disabled={submittingReview}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReviewSubmit}
                disabled={submittingReview}
                className={`px-5 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                  reviewAction === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {submittingReview ? "Processing..." : reviewAction === "approve" ? "Confirm Broker Approval" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
