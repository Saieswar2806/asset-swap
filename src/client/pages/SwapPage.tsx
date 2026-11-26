import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeftRight,
  Sparkles,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  Calendar,
  ShieldCheck
} from "lucide-react";
import { api } from "../api.js";
import { useUser } from "../context/UserContext.js";
import { MatchCard } from "../components/MatchCard.js";
import { formatCurrency } from "../components/PropertyCard.js";
import { getExchangeCoordStatusLabel } from "../utils/statusLabels.js";
import type { Match, Listing } from "../types.js";

export const SwapPage: React.FC = () => {
  const { currentUser } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab =
    tabParam === "proposals" || tabParam === "accepted" || tabParam === "declined"
      ? tabParam
      : "matches";
  const [activeTab, setActiveTabState] = useState<"matches" | "proposals" | "accepted" | "declined">(initialTab);

  const setActiveTab = (tab: "matches" | "proposals" | "accepted" | "declined") => {
    setActiveTabState(tab);
    setSearchParams(tab === "matches" ? {} : { tab }, { replace: true });
  };

  useEffect(() => {
    if (tabParam === "matches" || tabParam === "proposals" || tabParam === "accepted" || tabParam === "declined") {
      setActiveTabState(tabParam);
    }
  }, [tabParam]);

  const [matches, setMatches] = useState<Match[]>([]);
  const [twoPartyCount, setTwoPartyCount] = useState<number>(0);
  const [threePartyCount, setThreePartyCount] = useState<number>(0);
  const [proposals, setProposals] = useState<any[]>([]);
  const [ownerListings, setOwnerListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);


  const loadData = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [matchRes, propRes, listRes] = await Promise.all([
        api.getMatches({ ownerId: currentUser?.id, radiusKm: 60 }).catch(() => ({ matches: [], twoPartyCount: 0, threePartyCount: 0 })),
        api.getProposals({ ownerId: currentUser?.id }).catch(() => []),
        api.getOwnerListings().catch(() => [])
      ]);

      setMatches(matchRes.matches);
      setTwoPartyCount(matchRes.twoPartyCount);
      setThreePartyCount(matchRes.threePartyCount);
      setProposals(propRes);
      setOwnerListings(listRes);
    } catch (err: any) {
      setFeedback({ message: err?.message || "Failed to load swap data.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser?.id]);

  const handlePropose = async (matchId: string) => {
    try {
      const res = await api.proposeMatch(matchId);
      setFeedback({ message: res.message || "Swap proposal successfully submitted for owner voting.", type: "success" });
      loadData();
      setActiveTab("proposals");
    } catch (err: any) {
      setFeedback({ message: err?.message || "Failed to submit proposal.", type: "error" });
    }
  };

  const handleVoteSubmit = async (matchId: string, listingId: string, decision: "accepted" | "declined") => {
    try {
      const res = await api.respondToMatch(matchId, listingId, decision);
      setFeedback({
        message: `Your vote (${decision.toUpperCase()}) was recorded. Current proposal status: ${res.matchStatus}`,
        type: "success"
      });
      loadData();
    } catch (err: any) {
      setFeedback({ message: err?.message || "Failed to record vote.", type: "error" });
    }
  };

  const activeProposals = proposals.filter((p) => p.status === "proposed");
  const acceptedProposals = proposals.filter((p) => p.status === "accepted");
  const declinedProposals = proposals.filter((p) => p.status === "declined");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold mb-2">
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Mutual Asset Swaps</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Property Swap Hub</h1>
          <p className="text-xs text-slate-500 mt-1">
            Exchange real estate directly through 2-party and 3-party graph cycles. Cash is strictly utilized for equitable Cash Boot balancing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/register?intent=swap"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register Property to Swap</span>
          </Link>
          <button
            onClick={loadData}
            className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh Swaps"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
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
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            ×
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("matches")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "matches"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Explore Matches ({matches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("proposals")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "proposals"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending Proposals ({activeProposals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("accepted")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "accepted"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Accepted Swaps ({acceptedProposals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("declined")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "declined"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Declined ({declinedProposals.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-500 font-semibold">Scanning graph matching engine...</span>
          </div>
        </div>
      ) : activeTab === "matches" ? (
        /* 1. Explore Matches */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Found <strong>{matches.length}</strong> compatible exchange opportunities (<strong>{twoPartyCount}</strong> Direct 2-Party, <strong>{threePartyCount}</strong> 3-Way Loops).
            </span>
          </div>

          {matches.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
              <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-900">No active swap matches found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No circular exchange cycles currently match your property specifications and desired exchange requirements. Try registering more desired property types or locations.
              </p>
              <Link
                to="/register?intent=swap"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Register Another Property</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onPropose={handlePropose}
                />
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "proposals" ? (
        /* 2. Pending Proposals */
        <div className="space-y-4">
          {activeProposals.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-900">No active proposals pending response</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                When you or another owner initiates a swap proposal, it will appear here for consensus voting.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {activeProposals.map((prop) => {
                const myParticipant = prop.participants?.find((p: any) => p.isCurrentUser || p.ownerId === currentUser?.id);
                const myResponse = myParticipant ? (myParticipant.response || prop.myDecision || "pending") : null;
                return (
                <div key={prop.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        {prop.formalStatus || "Awaiting Responses"}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-1.5">
                        {prop.partyCount === 2 ? "Direct 2-Party Asset Exchange" : `${prop.partyCount}-Party Circular Exchange`}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-mono">Ref: {prop.ref || prop.id.replace("match-", "EXP-")}</span>
                    </div>

                    {myParticipant && myResponse === "pending" ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleVoteSubmit(prop.id, myParticipant.listingId, "accepted")}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => handleVoteSubmit(prop.id, myParticipant.listingId, "declined")}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors shadow-xs flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </div>
                    ) : (
                      <Link
                        to={`/matches/${prop.id}`}
                        className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
                      >
                        View Details
                      </Link>
                    )}
                  </div>

                  {prop.nextStep && (
                    <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900 font-medium">
                      {prop.nextStep}
                    </div>
                  )}

                  {/* Summary of participants */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2 text-xs">
                    <span className="font-bold text-slate-700 block text-[11px]">Participating Owners & Properties:</span>
                    {prop.participants?.map((p: any) => {
                      const decision = p.response || "pending";
                      return (
                      <div key={p.listingId || p.givesAssetId} className="flex items-center justify-between py-1.5 border-b border-slate-200/60 last:border-0 gap-2">
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 block truncate">
                            {p.isCurrentUser ? `${p.ownerName} (You)` : (p.ownerName || "Verified Participant")}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate">
                            {p.ownedProperty?.title || p.givesPropertyType?.replace(/_/g, " ")} {p.ownedProperty ? `• ${p.ownedProperty.locality}` : ""} ({formatCurrency(p.givesValue)})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            decision === "accepted"
                              ? "bg-emerald-100 text-emerald-800"
                              : decision === "declined"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {decision === "accepted"
                              ? "Accepted"
                              : decision === "declined"
                              ? "Declined"
                              : "Awaiting Response"}
                          </span>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === "accepted" ? (
        /* 3. Accepted Swaps */
        <div className="space-y-4">
          {acceptedProposals.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
              <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-900">No accepted swaps yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Swaps that achieve 100% unanimous owner consensus transition to accepted state for Asset Swap team coordination.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {acceptedProposals.map((prop) => (
                <div key={prop.id} className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          All Owners Accepted
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          {getExchangeCoordStatusLabel(prop.coordination?.coordinationStage || prop.coordination?.status)}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {prop.partyCount === 2 ? "Direct 2-Party Asset Exchange" : `${prop.partyCount}-Way Circular Exchange`}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono">Ref: {prop.ref || prop.id.replace("match-", "EXP-")}</span>
                    </div>
                    <Link
                      to={`/matches/${prop.id}`}
                      className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 shrink-0"
                    >
                      View Details
                    </Link>
                  </div>

                  {prop.coordination?.siteVisitDate && (
                    <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>
                        <strong>Meeting Scheduled:</strong>{" "}
                        {new Date(prop.coordination.siteVisitDate).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        {prop.coordination.siteVisitLocation ? ` • ${prop.coordination.siteVisitLocation}` : ""}
                      </span>
                    </div>
                  )}

                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5 text-xs">
                    {prop.participants?.map((p: any) => (
                      <div key={p.listingId} className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-800">
                          {p.isCurrentUser ? `${p.ownerName} (You)` : p.ownerName} • {p.ownedProperty?.title || p.givesPropertyType?.replace(/_/g, " ")}
                        </span>
                        <span className="text-emerald-700 font-bold">Accepted</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Participant contact details remain private. The Asset Swap team coordinates verification meetings and legal documentation directly.</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* 4. Declined */
        <div className="space-y-4">
          {declinedProposals.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
              <XCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-900">No declined swaps</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {declinedProposals.map((prop) => (
                <div key={prop.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2 opacity-80">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                      Exchange Declined
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Ref: {prop.ref || prop.id.replace("match-", "EXP-")}</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Proposal declined. Participating properties remain available for other exchange opportunities.
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
