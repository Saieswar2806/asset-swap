import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeftRight,
  Sparkles,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
  AlertCircle,
  Building2,
  RefreshCw,
  PlusCircle
} from "lucide-react";
import { api } from "../api.js";
import { useUser } from "../context/UserContext.js";
import { MatchCard } from "../components/MatchCard.js";
import type { Match, Listing } from "../types.js";

export const SwapPage: React.FC = () => {
  const { currentUser } = useUser();
  const [activeTab, setActiveTab] = useState<"matches" | "proposals" | "accepted" | "declined">("matches");

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
              {activeProposals.map((prop) => (
                <div key={prop.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                        Pending Consensus Voting
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-1.5">
                        {prop.partyCount === 2 ? "Direct 2-Party Asset Exchange" : "3-Party Circular Exchange"}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-mono">Ref: {prop.ref || prop.id.replace("match-", "EXP-")}</span>
                    </div>

                    {(() => {
                      const myParticipant = prop.participants?.find((p: any) => p.ownerId === currentUser?.id);
                      const myResponse = myParticipant ? prop.responses?.[myParticipant.listingId] : null;

                      if (myParticipant && myResponse === "pending") {
                        return (
                          <div className="flex items-center gap-2">
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
                        );
                      }
                      return (
                        <Link
                          to={`/matches/${prop.id}`}
                          className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          View Details
                        </Link>
                      );
                    })()}
                  </div>

                  {/* Summary of participants */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2 text-xs">
                    <span className="font-bold text-slate-700 block text-[11px]">Participating Property Owners:</span>
                    {prop.participants?.map((p: any) => (
                      <div key={p.ownerId + p.givesAssetId} className="flex items-center justify-between py-1 border-b border-slate-200/60 last:border-0">
                        <span className="font-semibold text-slate-900">{p.ownerName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">{p.givesPropertyType?.replace("_", " ")}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            (p.response || prop.responses?.[p.listingId]) === "accepted"
                              ? "bg-emerald-100 text-emerald-800"
                              : (p.response || prop.responses?.[p.listingId]) === "declined"
                              ? "bg-red-100 text-red-800"
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {(p.response || prop.responses?.[p.listingId]) === "accepted"
                              ? "Accepted"
                              : (p.response || prop.responses?.[p.listingId]) === "declined"
                              ? "Declined"
                              : "Awaiting Response"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "accepted" ? (
        /* 3. Accepted Swaps */
        <div className="space-y-4">
          {acceptedProposals.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
              <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-900">No completed swaps yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Swaps that achieve 100% unanimous owner consensus transition to accepted state.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {acceptedProposals.map((prop) => (
                <div key={prop.id} className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {prop.formalStatus || "Awaiting Admin Coordination"}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Ref: {prop.ref || prop.id.replace("match-", "EXP-")}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {prop.partyCount === 2 ? "Direct 2-Party Asset Exchange" : "3-Way Circular Exchange"}
                  </h4>
                  <p className="text-xs text-slate-600">
                    Accepted by all participants. The Asset Swap team is coordinating site visits and next steps directly with participating owners.
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
