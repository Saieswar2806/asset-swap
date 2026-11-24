import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftRight, CheckCircle2, XCircle, Clock, AlertTriangle, ShieldAlert, Sparkles, UserCheck, ArrowRight, RefreshCw, Lock } from "lucide-react";
import { api } from "../api.js";
import { useUser } from "../context/UserContext.js";
import { formatCurrency } from "../components/PropertyCard.js";

interface ProposalParticipant {
  listingId: string;
  ownerId: string;
  ownerName: string;
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
  matchType: string;
  partyCount: number;
  cycle: string[];
  listingIds: string[];
  totalAbsoluteBoot: number;
  locationScoreKm: number;
  matchScore: number;
  status: "proposed" | "accepted" | "declined" | "expired";
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
      setActionFeedback({ id: matchId, message: res.message, type: "success" });
      await fetchProposals();
    } catch (err: any) {
      setActionFeedback({ id: matchId, message: err.message, type: "error" });
    }
  };

  const handleExpire = async (matchId: string) => {
    try {
      const res = await api.expireMatch(matchId);
      setActionFeedback({ id: matchId, message: res.message, type: "success" });
      await fetchProposals();
    } catch (err: any) {
      setActionFeedback({ id: matchId, message: err.message, type: "error" });
    }
  };

  const statusBadge = (status: ProposalItem["status"]) => {
    switch (status) {
      case "proposed":
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200"><Clock className="w-3.5 h-3.5" /> Proposed (Voting Active)</span>;
      case "accepted":
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5" /> Consensus Accepted</span>;
      case "declined":
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200"><XCircle className="w-3.5 h-3.5" /> Declined</span>;
      case "expired":
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300"><AlertTriangle className="w-3.5 h-3.5" /> Expired</span>;
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Swap Proposals</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Module 5: Consensus Lifecycle
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Active and archived exchange proposals. All participating properties are strictly locked in escrow until unanimous consent or decline.
          </p>
        </div>

        <button
          onClick={fetchProposals}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: "all", label: "All Proposals" },
          { id: "proposed", label: "Active Proposals (Voting)" },
          { id: "accepted", label: "Accepted Swaps" },
          { id: "declined", label: "Declined" },
          { id: "expired", label: "Expired" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === tab.id
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Proposals List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-xl shadow-sm">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-600">Loading swap proposals from database...</p>
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <ArrowLeftRight className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No proposals found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-5">
            No proposals match the selected status filter. Explore available matches and initiate a proposal to begin the exchange consensus workflow.
          </p>
          <Link
            to="/matches"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Explore Matches
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((item) => {
            const hasPendingUserResponse = item.participants.some(
              (p) => p.ownerId === currentUser?.id && p.response === "pending"
            );

            return (
              <div
                key={item.id}
                className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all ${
                  item.status === "proposed" ? "border-blue-200 ring-1 ring-blue-100" : "border-slate-200"
                }`}
              >
                {/* Proposal Header */}
                <div className="bg-slate-50 border-b border-slate-200 p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {statusBadge(item.status)}
                    <span className="font-mono text-xs font-bold text-slate-600">#{item.id}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      {item.partyCount === 2 ? "Direct 2-Party Swap" : "Circular 3-Way Exchange"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      Updated: {new Date(item.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <Link
                      to={`/matches/${item.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
                    >
                      <span>Visual Flow</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Proposal Body */}
                <div className="p-4 sm:p-6 space-y-4">
                  {/* Feedback Banner */}
                  {actionFeedback && actionFeedback.id === item.id && (
                    <div
                      className={`p-3 rounded-lg text-xs font-medium ${
                        actionFeedback.type === "success"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-red-50 text-red-800 border border-red-200"
                      }`}
                    >
                      {actionFeedback.message}
                    </div>
                  )}

                  {/* Summary / Explanation */}
                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/80 p-3 rounded-lg border border-slate-100">
                    <span className="font-bold text-slate-800">Exchange Cycle: </span>
                    {item.explanation}
                  </p>

                  {/* Participants Table / List */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-100/70 px-4 py-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider grid grid-cols-12 gap-2">
                      <div className="col-span-4 sm:col-span-3">Participant & Property</div>
                      <div className="col-span-3 sm:col-span-3">Giving vs Receiving</div>
                      <div className="col-span-3 sm:col-span-3">Cash Boot (Adjustment)</div>
                      <div className="col-span-2 sm:col-span-3 text-right">Consensus Status</div>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {item.participants.map((p) => {
                        const isCurrentPersona = p.ownerId === currentUser?.id;
                        return (
                          <div
                            key={p.listingId}
                            className={`px-4 py-3 text-xs grid grid-cols-12 gap-2 items-center ${
                              isCurrentPersona ? "bg-blue-50/40" : "bg-white"
                            }`}
                          >
                            <div className="col-span-4 sm:col-span-3">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                {p.ownerName}
                                {isCurrentPersona && (
                                  <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                Asset #{p.listingId} ({p.givesPropertyType.replace(/_/g, " ")})
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
                              {p.response === "accepted" ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Accepted
                                </span>
                              ) : p.response === "declined" ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                  <XCircle className="w-3.5 h-3.5" />
                                  Declined
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  <Clock className="w-3.5 h-3.5" />
                                  Pending
                                </span>
                              )}

                              {/* Interactive Accept / Decline for this participant */}
                              {item.status === "proposed" && p.response === "pending" && (
                                <div className="flex items-center gap-1 ml-2">
                                  <button
                                    onClick={() => handleRespond(item.id, p.listingId, "accepted")}
                                    className="p-1 px-2 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-xs"
                                    title="Accept proposal for this property"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() => handleRespond(item.id, p.listingId, "declined")}
                                    className="p-1 px-2 text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 rounded shadow-xs"
                                    title="Decline proposal and release locks"
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

                  {/* Escrow Lock Banner / Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        {item.status === "proposed"
                          ? "All participating listings are locked from competing matches."
                          : item.status === "accepted"
                          ? "Unanimous consensus accepted. Properties remain reserved for legal conveyancing."
                          : "Proposal closed. All asset locks have been released back to the open pool."}
                      </span>
                    </div>

                    {item.status === "proposed" && (
                      <button
                        onClick={() => handleExpire(item.id)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline self-start"
                      >
                        Simulate Expiry Timeout
                      </button>
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
