import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sparkles, Filter, RefreshCw, ArrowLeftRight, CheckCircle2, SlidersHorizontal, AlertCircle } from "lucide-react";
import { api } from "../api.js";
import { useUser } from "../context/UserContext.js";
import type { Match } from "../types.js";
import { MatchCard } from "../components/MatchCard.js";

export const MatchesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useUser();

  const [matches, setMatches] = useState<Match[]>([]);
  const [twoPartyCount, setTwoPartyCount] = useState<number>(0);
  const [threePartyCount, setThreePartyCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [proposingId, setProposingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<"all" | "2-party" | "3-party">("all");
  const [radiusKm, setRadiusKm] = useState<number>(60);
  const [forMyPropertiesOnly, setForMyPropertiesOnly] = useState<boolean>(false);

  const listingIdParam = searchParams.get("listingId");

  const runDiscovery = async () => {
    setLoading(true);
    setNotification(null);
    try {
      const params: Record<string, unknown> = { radiusKm };
      if (listingIdParam) {
        params.listingId = listingIdParam;
      } else if (forMyPropertiesOnly && currentUser) {
        params.ownerId = currentUser.id;
      }

      const res = await api.getMatches(params);
      setMatches(res.matches);
      setTwoPartyCount(res.twoPartyCount);
      setThreePartyCount(res.threePartyCount);
    } catch (err: unknown) {
      console.error("Match discovery error:", err);
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to run matching engine."
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDiscovery();
  }, [listingIdParam, forMyPropertiesOnly, radiusKm]);

  const handlePropose = async (matchId: string) => {
    setProposingId(matchId);
    setNotification(null);
    try {
      const res = await api.proposeMatch(matchId);
      setNotification({ type: "success", text: res.message });
      // Refresh matches to reflect locked state
      runDiscovery();
    } catch (err: unknown) {
      setNotification({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to propose match."
      });
    } finally {
      setProposingId(null);
    }
  };

  const filteredMatches = matches.filter((m) => {
    if (filterType === "2-party") return m.partyCount === 2;
    if (filterType === "3-party") return m.partyCount === 3;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Page Title & Main Discovery Button */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Graph-Based Multi-Party Matching Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Intelligent Exchange Discovery
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm max-w-2xl leading-relaxed">
            The platform's directed cycle detector discovers direct 2-party and 3-party circular trade loops among verified, unlocked assets.
            Cash is calculated automatically for mutual value differences.
          </p>
        </div>

        <button
          onClick={runDiscovery}
          disabled={loading}
          className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 self-start md:self-auto shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Scanning Graph Cycles..." : "Find Exchange Opportunities"}
        </button>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
          notification.type === "success"
            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
            : "bg-red-50 text-red-800 border border-red-200"
        }`}>
          {notification.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Filter Controls Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-700 flex items-center gap-1.5 mr-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Topology:
          </span>
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              filterType === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Exchanges ({matches.length})
          </button>
          <button
            onClick={() => setFilterType("2-party")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              filterType === "2-party"
                ? "bg-blue-600 text-white"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            2-Party Direct ({twoPartyCount})
          </button>
          <button
            onClick={() => setFilterType("3-party")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              filterType === "3-party"
                ? "bg-teal-600 text-white"
                : "bg-teal-50 text-teal-700 hover:bg-teal-100"
            }`}
          >
            3-Party Trade Loops ({threePartyCount})
          </button>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Radius Slider */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-600 font-medium">Radius:</span>
            <input
              type="range"
              min={20}
              max={100}
              step={10}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="w-24 accent-blue-600 cursor-pointer"
            />
            <span className="font-bold text-slate-800 min-w-[40px]">{radiusKm} km</span>
          </div>

          {/* My Properties Toggle */}
          <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
            <input
              type="checkbox"
              checked={forMyPropertiesOnly}
              onChange={(e) => setForMyPropertiesOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span>Matches for My Properties only</span>
          </label>

          {listingIdParam && (
            <button
              onClick={() => setSearchParams({})}
              className="text-xs text-red-600 hover:underline font-semibold"
            >
              Clear filter #{listingIdParam}
            </button>
          )}
        </div>
      </div>

      {/* Matches Grid */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">
            Evaluating directed graph compatibility vectors across verified assets...
          </p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-16 text-center space-y-3">
          <ArrowLeftRight className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No matching exchanges found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try expanding the geographical radius, or register additional properties to open up new circular trade loops.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              onPropose={handlePropose}
              proposing={proposingId === match.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};
