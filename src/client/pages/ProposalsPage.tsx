import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeftRight,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Building2,
  Calendar,
  ShieldCheck,
  Check,
  Info
} from "lucide-react";
import { api } from "../api.js";
import { useUser } from "../context/UserContext.js";
import { formatCurrency } from "../components/PropertyCard.js";
import { BackButton } from "../components/BackButton.js";

interface ProposalParticipant {
  listingId: string;
  ownerId?: string;
  ownerName: string;
  isCurrentUser?: boolean;
  givesAssetId: string;
  givesPropertyType: string;
  givesValue: number;
  receivesAssetId: string;
  receivesPropertyType: string;
  receivesValue: number;
  amount: number;
  action: "pay" | "receive" | "none";
  cashDifference: number;
  explanation: string;
  response: "pending" | "accepted" | "declined";
  respondedAt: string | null;
  ownedProperty?: any;
}

interface ProposalItem {
  id: string;
  ref?: string;
  matchType: string;
  partyCount: number;
  cycle: string[];
  listingIds: string[];
  totalAbsoluteBoot: number;
  locationScoreKm: number;
  matchScore: number;
  status: "proposed" | "accepted" | "declined" | "expired";
  formalStatus?: string;
  nextStep?: string;
  myDecision?: "pending" | "accepted" | "declined";
  acceptedCount?: number;
  pendingCount?: number;
  coordination?: any;
  explanation: string;
  reasons: string[];
  exchangeLegs: any[];
  createdAt: string;
  updatedAt: string;
  participants: ProposalParticipant[];
}

export const ProposalsPage: React.FC = () => {
  const { currentUser } = useUser();
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionFeedback, setActionFeedback] = useState<{ id: string; message: string; type: "success" | "error" } | null>(null);

  const fetchProposals = async () => {
    setIsLoading(true);
    try {
      const data = await api.getProposals({ status: statusFilter === "all" ? undefined : statusFilter });
      setProposals(data);
    } catch (err: any) {
      console.error("Failed to fetch proposals:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, [statusFilter]);

  const handleRespond = async (matchId: string, listingId: string, decision: "accepted" | "declined") => {
    try {
      const res = await api.respondToMatch(matchId, listingId, decision);
      let feedbackMsg = res.message;
      if (res.matchStatus === "accepted") {
        feedbackMsg = "Exchange proposal unanimously accepted! It has now advanced to Admin Coordination.";
      } else if (res.matchStatus === "declined") {
        feedbackMsg = "Proposal declined. All participant property reservations have been released.";
      } else if (decision === "accepted") {
        feedbackMsg = "Your acceptance has been recorded. Awaiting independent responses from remaining participants.";
      }
      setActionFeedback({ id: matchId, message: feedbackMsg, type: "success" });
      await fetchProposals();
    } catch (err: any) {
      setActionFeedback({ id: matchId, message: err.message, type: "error" });
    }
  };

  const getProposalStatusBadge = (item: ProposalItem) => {
    const hasPendingUserResponse = item.participants.some(
      (p) => p.isCurrentUser && p.response === "pending"
    );
    const hasAcceptedUserResponse = item.participants.some(
      (p) => p.isCurrentUser && p.response === "accepted"
    );

    if (item.status === "proposed") {
      if (hasPendingUserResponse) {
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>Your Response Pending</span>
          </span>
        );
      }
      if (hasAcceptedUserResponse) {
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Accepted by You (Awaiting Other Participant)</span>
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
          <Clock className="w-3.5 h-3.5" />
          <span>Awaiting Responses</span>
        </span>
      );
    }

    if (item.status === "accepted") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Exchange Accepted</span>
        </span>
      );
    }

    if (item.status === "declined") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-200">
          <XCircle className="w-3.5 h-3.5 text-red-600" />
          <span>Exchange Declined</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
        <Clock className="w-3.5 h-3.5" />
        <span>Proposal Expired</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header & Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <BackButton defaultPath="/owner/dashboard" label="Back to Dashboard" className="mb-2" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Exchange Proposals</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review active multi-party exchange proposals, record your independent consent, and track exchange milestones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/exchange-progress"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors shadow-2xs"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Exchange Progress</span>
          </Link>
          <button
            onClick={fetchProposals}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: "all", label: "All Proposals" },
          { id: "proposed", label: "Active Proposals" },
          { id: "accepted", label: "Accepted Exchanges" },
          { id: "declined", label: "Declined" },
          { id: "expired", label: "Expired" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === tab.id
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feedback Message */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold border flex items-center justify-between ${
            actionFeedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <span>{actionFeedback.message}</span>
          <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Proposals List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
          <p className="text-xs font-semibold text-slate-600">Loading exchange proposals...</p>
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl p-8 shadow-xs space-y-3">
          <ArrowLeftRight className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Proposals Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You currently have no proposals under the selected filter. Explore verified swap matches and initiate an exchange proposal.
          </p>
          <div className="pt-2">
            <Link
              to="/swap"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Explore Swap Opportunities</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {proposals.map((item) => {
            const hasPendingUserResponse = item.participants.some(
              (p) => p.isCurrentUser && p.response === "pending"
            );
            const myParticipant = item.participants.find((p) => p.isCurrentUser);
            const displayRef = item.ref || item.id.replace("match-", "EXP-");

            return (
              <div
                key={item.id}
                className={`bg-white border rounded-2xl overflow-hidden shadow-xs transition-all ${
                  item.status === "proposed" && hasPendingUserResponse
                    ? "border-amber-300 ring-2 ring-amber-100"
                    : item.status === "accepted"
                    ? "border-emerald-200"
                    : "border-slate-200"
                }`}
              >
                {/* Proposal Header */}
                <div className="bg-slate-50 border-b border-slate-200 p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getProposalStatusBadge(item)}
                      <span className="font-mono text-xs font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded">
                        Ref: {displayRef}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200/80 text-slate-700">
                        {item.partyCount === 2 ? "Direct 2-Party Exchange" : "3-Party Circular Exchange"}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-medium pt-0.5">
                      {item.nextStep ? (
                        <span><strong className="text-slate-700">Next Step:</strong> {item.nextStep}</span>
                      ) : (
                        <span>Exchange Proposal between verified property owners</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">
                      Initiated: {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <Link
                      to={`/matches/${item.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                    >
                      <span>Exchange Topology</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Proposal Body */}
                <div className="p-4 sm:p-6 space-y-4">
                  {/* Action Banner for Current User */}
                  {hasPendingUserResponse && item.status === "proposed" && (
                    <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs text-amber-900 space-y-0.5">
                        <div className="font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                          <span>Action Required: Your Independent Decision</span>
                        </div>
                        <p className="text-amber-800 text-[11px]">
                          Please review the exchange terms, property values, and cash adjustment. Both parties must independently consent to proceed to coordination.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            if (myParticipant) handleRespond(item.id, myParticipant.listingId, "accepted");
                          }}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Accept Proposal
                        </button>
                        <button
                          onClick={() => {
                            if (myParticipant) handleRespond(item.id, myParticipant.listingId, "declined");
                          }}
                          className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Decline
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Summary Explanation */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 font-medium">
                    <span className="font-bold text-slate-900">Exchange Description: </span>
                    {item.explanation}
                  </div>

                  {/* Participants Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-100/70 px-4 py-2.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider grid grid-cols-12 gap-2">
                      <div className="col-span-4 sm:col-span-3">Participant & Property</div>
                      <div className="col-span-3 sm:col-span-3">Giving vs Receiving</div>
                      <div className="col-span-3 sm:col-span-3">Cash Adjustment (Boot)</div>
                      <div className="col-span-2 sm:col-span-3 text-right">Consent Status</div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {item.participants.map((p) => {
                        const isMe = !!p.isCurrentUser;

                        return (
                          <div
                            key={p.listingId}
                            className={`px-4 py-3 text-xs grid grid-cols-12 gap-2 items-center ${
                              isMe ? "bg-blue-50/40 font-medium" : "bg-white"
                            }`}
                          >
                            <div className="col-span-4 sm:col-span-3">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                {isMe ? (
                                  <>
                                    <span>{p.ownerName}</span>
                                    <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded">
                                      You
                                    </span>
                                  </>
                                ) : (
                                  <span>{p.ownerName}</span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                Property {p.listingId} ({p.givesPropertyType.replace(/_/g, " ")})
                              </div>
                            </div>

                            <div className="col-span-3 sm:col-span-3 space-y-0.5">
                              <div className="text-slate-600">
                                Gives: <span className="font-bold text-slate-800">{formatCurrency(p.givesValue)}</span>
                              </div>
                              <div className="text-slate-600">
                                Receives: <span className="font-bold text-slate-800">{formatCurrency(p.receivesValue)}</span>
                              </div>
                            </div>

                            <div className="col-span-3 sm:col-span-3">
                              {p.action === "pay" ? (
                                <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                                  Pays {formatCurrency(p.amount)}
                                </span>
                              ) : p.action === "receive" ? (
                                <span className="inline-flex items-center gap-1 font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-[11px]">
                                  Receives {formatCurrency(p.amount)}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                                  ₹0 Pure Swap
                                </span>
                              )}
                            </div>

                            <div className="col-span-2 sm:col-span-3 flex items-center justify-end gap-2">
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border ${
                                  p.response === "accepted"
                                    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                    : p.response === "declined"
                                    ? "text-red-700 bg-red-50 border-red-200"
                                    : "text-amber-700 bg-amber-50 border-amber-200"
                                }`}
                              >
                                {p.response === "accepted" && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                {p.response === "declined" && <XCircle className="w-3 h-3 text-red-600" />}
                                {p.response === "pending" && <Clock className="w-3 h-3 text-amber-600" />}
                                <span>{p.response === "pending" ? "Decision Pending" : p.response === "accepted" ? "Accepted" : "Declined"}</span>
                              </span>

                              {/* Interactive Accept / Decline for current user if pending */}
                              {item.status === "proposed" && p.response === "pending" && isMe && (
                                <div className="flex items-center gap-1 ml-2">
                                  <button
                                    onClick={() => handleRespond(item.id, p.listingId, "accepted")}
                                    className="px-2 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-2xs"
                                    title="Accept proposal"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleRespond(item.id, p.listingId, "declined")}
                                    className="px-2 py-1 text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 rounded shadow-2xs"
                                    title="Decline proposal"
                                  >
                                    Decline
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Status Banner */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      <span>
                        {item.status === "proposed"
                          ? "Properties are reserved while owner consent is pending. Both parties must accept independently."
                          : item.status === "accepted"
                          ? "All participating property owners have accepted. Platform coordination and site visit scheduling are underway."
                          : "Proposal concluded. Participating properties are released for other exchange matches."}
                      </span>
                    </div>

                    {item.status === "accepted" && (
                      <Link
                        to="/exchange-progress"
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 shrink-0"
                      >
                        <span>View Coordination Milestones</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
