import React, { useEffect, useState } from "react";
import {
  X,
  ShieldCheck,
  Building,
  Mail,
  Phone,
  Calendar,
  Clock,
  Award,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Activity,
  History,
  Check,
  AlertTriangle
} from "lucide-react";
import { api } from "../api.js";
import type { User } from "../types.js";

interface BrokerDetailModalProps {
  brokerId: string | null;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

export const BrokerDetailModal: React.FC<BrokerDetailModalProps> = ({
  brokerId,
  onClose,
  onStatusUpdated
}) => {
  const [broker, setBroker] = useState<(User & { auditLogs?: any[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Reject sub-form state
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState(
    "Professional credentials / RERA license verification inconclusive with state registry."
  );

  const fetchBrokerDetails = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminBrokerById(id);
      setBroker(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load broker application details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (brokerId) {
      fetchBrokerDetails(brokerId);
    } else {
      setBroker(null);
    }
  }, [brokerId]);

  if (!brokerId) return null;

  const handleApprove = async () => {
    if (!broker || actionLoading) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const msg = await api.reviewBrokerApplication(broker.id, "approve");
      setFeedback({ message: msg, type: "success" });
      await fetchBrokerDetails(broker.id);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: unknown) {
      setFeedback({
        message: err instanceof Error ? err.message : "Approval request failed.",
        type: "error"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!broker || actionLoading) return;
    if (!rejectionReason.trim()) {
      setFeedback({ message: "Please provide a reason for rejecting this application.", type: "error" });
      return;
    }
    setActionLoading(true);
    setFeedback(null);
    try {
      const msg = await api.reviewBrokerApplication(broker.id, "reject", rejectionReason.trim());
      setFeedback({ message: msg, type: "success" });
      setIsRejecting(false);
      await fetchBrokerDetails(broker.id);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: unknown) {
      setFeedback({
        message: err instanceof Error ? err.message : "Rejection request failed.",
        type: "error"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Not provided";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Not provided";
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "Not provided";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-400/30 text-teal-300 flex items-center justify-center font-bold text-lg shrink-0">
              {broker?.name ? broker.name.charAt(0).toUpperCase() : <ShieldCheck className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold bg-teal-950/60 px-2 py-0.5 rounded border border-teal-800/60">
                  Broker #{broker?.id || brokerId}
                </span>
                {broker && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                      broker.status === "active"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                        : broker.status === "pending"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                        : "bg-red-500/20 text-red-300 border border-red-400/30"
                    }`}
                  >
                    {broker.status === "active" ? "Approved & Active" : broker.status}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-white mt-1">
                {broker?.name || "Loading Broker Application..."}
              </h2>
              <p className="text-xs text-slate-300">
                {broker?.agency || "Agency / Firm Not provided"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback message banner */}
        {feedback && (
          <div
            className={`px-5 py-3 border-b flex items-center justify-between text-xs font-semibold ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-600 text-xs ml-3"
            >
              ✕
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Fetching verified application record...</p>
            </div>
          ) : error || !broker ? (
            <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center space-y-2 text-xs text-red-800">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
              <p className="font-bold">{error || "Broker application record not found."}</p>
              <button
                onClick={() => fetchBrokerDetails(brokerId)}
                className="mt-2 px-3 py-1 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {/* Section 1: Contact & Personal Details */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  1. Identity & Contact Information
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Full Name</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">{broker.name || "Not provided"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Email Address</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block font-mono">{broker.email || "Not provided"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Phone Number</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block font-mono">
                      {broker.phone ? broker.phone : <span className="text-slate-400 italic">Not provided</span>}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Account Role</span>
                    <span className="font-semibold text-teal-800 capitalize mt-0.5 block">
                      Licensed Broker ({broker.role})
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Professional License & Jurisdiction */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  2. Professional Licensing & Operating Territory
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Real Estate Agency / Firm</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {broker.agency ? broker.agency : <span className="text-slate-400 italic">Not provided</span>}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">RERA / Registration License No.</span>
                    <span className="font-mono font-bold text-slate-900 mt-0.5 block">
                      {broker.licenseNumber ? broker.licenseNumber : <span className="text-slate-400 italic">Not provided</span>}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Authorized Jurisdiction</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">
                      {broker.jurisdiction ? broker.jurisdiction : <span className="text-slate-400 italic">Not provided</span>}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Industry Experience</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {broker.experienceYears !== undefined && broker.experienceYears !== null
                        ? `${broker.experienceYears} Years Verified Practice`
                        : <span className="text-slate-400 italic">Not provided</span>}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Submission Metadata & Status */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  3. Application Lifecycle & Audit Status
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Application Submitted</span>
                    <span className="text-slate-700 mt-0.5 block">{formatDate(broker.createdAt)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Last Status Update</span>
                    <span className="text-slate-700 mt-0.5 block">{formatDate(broker.updatedAt)}</span>
                  </div>
                </div>

                {broker.rejectionReason && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-red-900 flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-red-600" />
                      Recorded Rejection Rationale:
                    </span>
                    <p className="text-red-800 leading-relaxed pl-5 font-medium">{broker.rejectionReason}</p>
                  </div>
                )}
              </div>

              {/* Section 4: Audit Log Activity Trail */}
              {broker.auditLogs && broker.auditLogs.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-slate-400" />
                    Audit Log History ({broker.auditLogs.length} events)
                  </span>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {broker.auditLogs.map((log: any) => (
                      <div
                        key={log.id}
                        className="p-2.5 bg-slate-50/70 border border-slate-200/60 rounded-lg text-[11px] flex items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-bold text-slate-800 capitalize">
                            {log.action.replace(/_/g, " ")}
                          </span>
                          <span className="text-slate-500 ml-2">by {log.performedBy}</span>
                        </div>
                        <span className="text-slate-400 font-mono text-[10px] shrink-0">
                          {formatDate(log.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 5: Inline Rejection Form */}
              {isRejecting && (
                <div className="p-4 bg-red-50/80 border border-red-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 text-red-900 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    Confirm Broker Application Rejection
                  </div>
                  <p className="text-xs text-red-700 leading-relaxed">
                    Please provide an official audit reason explaining why this broker application is being rejected. This explanation will be logged and returned to the applicant.
                  </p>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-red-800 mb-1">
                      Rejection Reason (Required)
                    </label>
                    <textarea
                      rows={3}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="e.g. RERA license could not be validated with state authority registry..."
                      className="w-full text-xs p-2.5 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsRejecting(false)}
                      disabled={actionLoading}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmReject}
                      disabled={actionLoading || !rejectionReason.trim()}
                      className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs disabled:opacity-50"
                    >
                      {actionLoading ? "Processing Rejection..." : "Confirm Rejection"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {broker?.status === "active" && (
              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Active Valuation Privileges Granted
              </span>
            )}
            {broker?.status === "pending" && (
              <span className="flex items-center gap-1 text-amber-700 font-semibold">
                <Clock className="w-4 h-4 text-amber-600" />
                Pending Administrator Verification
              </span>
            )}
            {broker?.status === "rejected" && (
              <span className="flex items-center gap-1 text-red-700 font-semibold">
                <XCircle className="w-4 h-4 text-red-600" />
                Application Rejected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={actionLoading}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-white transition-colors"
            >
              Close
            </button>

            {broker && broker.status === "pending" && !isRejecting && (
              <>
                <button
                  onClick={() => setIsRejecting(true)}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-xl text-xs font-bold transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {actionLoading ? "Approving..." : "Approve & Grant Privileges"}
                </button>
              </>
            )}

            {broker && broker.status === "rejected" && !isRejecting && (
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {actionLoading ? "Approving..." : "Re-evaluate & Approve"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
