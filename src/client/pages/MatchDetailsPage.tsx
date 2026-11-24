import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  Building2,
  ArrowLeftRight,
  MapPin,
  Check,
  X,
  AlertCircle
} from "lucide-react";
import { api } from "../api.js";
import type { Match, Listing } from "../types.js";
import { FlowVisualizer } from "../components/FlowVisualizer.js";
import { formatCurrency } from "../components/PropertyCard.js";

interface DetailedParticipant {
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
  action: "pays" | "receives" | "settled";
  cashDifference: number;
  explanation: string;
  ownedProperty?: Listing;
  receivedProperty?: Listing;
}

export const MatchDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [match, setMatch] = useState<(Match & { participants: DetailedParticipant[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadMatch = () => {
    if (!id) return;
    setLoading(true);
    api.getMatchById(id)
      .then((data) => {
        setMatch(data as unknown as Match & { participants: DetailedParticipant[] });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMatch();
  }, [id]);

  const handlePropose = async () => {
    if (!match) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await api.proposeMatch(match.id);
      setFeedback({ type: "success", text: res.message });
      loadMatch();
    } catch (err: unknown) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Failed to propose match." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRespond = async (listingId: string, decision: "accepted" | "declined") => {
    if (!match) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await api.respondToMatch(match.id, listingId, decision);
      setFeedback({ type: "success", text: res.message });
      loadMatch();
    } catch (err: unknown) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Failed to record response." });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-600">Loading exchange details & graph topology...</p>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h3 className="text-base font-bold text-red-900">Exchange Opportunity Not Found</h3>
        <p className="text-xs text-red-700">{error || "The requested match could not be retrieved."}</p>
        <Link to="/matches" className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600">
          <ArrowLeft className="w-4 h-4" /> Return to Matches
        </Link>
      </div>
    );
  }

  const isDirect = match.partyCount === 2;

  const statusConfig: Record<string, { bg: string; text: string; icon: React.FC<{ className?: string }> }> = {
    proposed: { bg: "bg-blue-100 text-blue-800 border-blue-300", text: "Active Proposal (Awaiting Responses)", icon: Clock },
    accepted: { bg: "bg-emerald-100 text-emerald-800 border-emerald-300", text: "Unanimously Accepted", icon: CheckCircle2 },
    declined: { bg: "bg-red-100 text-red-800 border-red-300", text: "Proposal Declined (Locks Released)", icon: XCircle },
    expired: { bg: "bg-slate-100 text-slate-700 border-slate-300", text: "Expired", icon: Clock }
  };

  const currentStatus = statusConfig[match.status] || statusConfig.proposed;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="space-y-8 pb-16">
      {/* Back Link */}
      <div>
        <Link
          to="/matches"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Exchange Directory
        </Link>
      </div>

      {/* Main Exchange Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                isDirect ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-teal-50 border-teal-200 text-teal-700"
              }`}>
                {isDirect ? "2-Party Direct Bilateral Swap" : "3-Party Circular Trade Loop"}
              </span>
              <span className="text-xs font-mono font-medium text-slate-400">
                #{match.id}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {match.explanation}
            </h1>
          </div>

          {/* Match Score Badge */}
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl self-start sm:self-center shrink-0">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <div>
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">Match Compatibility</span>
              <span className="text-base font-extrabold text-emerald-900">{match.matchScore}/100</span>
            </div>
          </div>
        </div>

        {/* Workflow State Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Transaction Escrow Status:</span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${currentStatus.bg}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {currentStatus.text}
            </span>
          </div>

          {match.status === "proposed" && (
            <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 flex items-center gap-1">
              <Lock className="w-3 h-3" /> All participant properties locked in escrow
            </span>
          )}
        </div>
      </div>

      {/* Interactive React Flow Graph Visualizer */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-blue-600" />
          Interactive Graph Visualization
        </h2>
        <FlowVisualizer match={match} />
      </div>

      {/* Transaction Workflow Simulation Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Transaction Consensus & Lock Workflow
            </h3>
            <p className="text-xs text-slate-500">
              Simulate individual participant responses. Unanimous acceptance confirms the transaction; any decline unlocks all properties.
            </p>
          </div>

          {match.status !== "proposed" && match.status !== "accepted" && (
            <button
              onClick={handlePropose}
              disabled={actionLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              Initiate Exchange Proposal
            </button>
          )}
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Participants Response Table */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {match.boots.map((boot) => {
            const decision = match.responses?.[boot.listingId] || "pending";
            return (
              <div
                key={boot.listingId}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-mono text-[10px] text-slate-400 font-bold">#{boot.listingId}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      decision === "accepted"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : decision === "declined"
                        ? "bg-red-100 text-red-800 border-red-300"
                        : "bg-amber-100 text-amber-800 border-amber-300"
                    }`}>
                      {decision.toUpperCase()}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{boot.ownerName}</h4>
                  <p className="text-xs text-slate-600 capitalize">
                    Giving: {boot.givesPropertyType.replace(/_/g, " ")} ({formatCurrency(boot.givesValue)})
                  </p>
                  <p className="text-xs text-blue-700 font-semibold mt-1">
                    Cash Boot: {boot.action === "pays" ? `+ Pays ${formatCurrency(boot.cashDifference)}` : boot.action === "receives" ? `- Receives ${formatCurrency(boot.cashDifference)}` : "₹0 Settled"}
                  </p>
                </div>

                {match.status === "proposed" && decision === "pending" && (
                  <div className="flex gap-2 pt-2 border-t border-slate-200/60">
                    <button
                      onClick={() => handleRespond(boot.listingId, "accepted")}
                      disabled={actionLoading}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-2xs transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" /> Accept
                    </button>
                    <button
                      onClick={() => handleRespond(boot.listingId, "declined")}
                      disabled={actionLoading}
                      className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 shadow-2xs transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Decline
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Side-by-Side Participant Transfers */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-slate-700" />
          Individual Participant Exchange Ledger
        </h2>

        <div className="space-y-6">
          {match.participants?.map((p, idx) => {
            const owned = p.ownedProperty;
            const received = p.receivedProperty;
            return (
              <div key={p.listingId} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <h3 className="font-bold text-base text-slate-900">{p.ownerName}</h3>
                    <span className="text-xs font-mono text-slate-400">({p.listingId})</span>
                  </div>

                  <div className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                    p.action === "pays"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : p.action === "receives"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-slate-50 text-slate-700 border-slate-200"
                  }`}>
                    {p.action === "pays"
                      ? `Participant PAYS cash boot: ${formatCurrency(p.cashDifference)}`
                      : p.action === "receives"
                      ? `Participant RECEIVES cash boot: ${formatCurrency(p.cashDifference)}`
                      : "Zero Cash Boot: Exact 1:1 Valuation Match"}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Property Currently Owned */}
                  <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs">
                    <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">
                      1. Property Currently Owned (Given Away):
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">{owned?.metadata?.title as string || p.givesPropertyType}</h4>
                    <p className="text-slate-600">
                      Location: <strong>{owned?.locality}, {owned?.district}</strong>
                    </p>
                    <p className="text-slate-600">
                      Area: <strong>{owned?.area} {owned?.areaUnit}</strong>
                    </p>
                    <p className="text-slate-900 font-bold">
                      Reviewed Valuation: <span className="text-blue-900">{formatCurrency(p.givesValue)}</span>
                    </p>
                  </div>

                  {/* Property Received */}
                  <div className="p-4 bg-blue-50/50 border border-blue-200/80 rounded-xl space-y-2 text-xs">
                    <span className="font-bold text-blue-700 uppercase tracking-wider block text-[10px]">
                      2. Property Received In Exchange:
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm">{received?.metadata?.title as string || p.receivesPropertyType}</h4>
                    <p className="text-slate-600">
                      From: <strong>{received?.ownerName}</strong> ({received?.locality}, {received?.district})
                    </p>
                    <p className="text-slate-600">
                      Area: <strong>{received?.area} {received?.areaUnit}</strong>
                    </p>
                    <p className="text-slate-900 font-bold">
                      Reviewed Valuation: <span className="text-emerald-800">{formatCurrency(p.receivesValue)}</span>
                    </p>
                  </div>
                </div>

                {/* Cash Boot Formula Explanation */}
                <div className="bg-slate-100/70 p-3 rounded-xl text-xs text-slate-600 font-medium">
                  <strong>Cash Boot Formula:</strong> Value Received ({formatCurrency(p.receivesValue)}) − Value Given ({formatCurrency(p.givesValue)}) = {p.amount >= 0 ? `+${formatCurrency(p.amount)} (Owes Cash)` : `-${formatCurrency(Math.abs(p.amount))} (Receives Cash)`}.
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
