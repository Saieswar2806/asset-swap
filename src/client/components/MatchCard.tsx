import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeftRight, CheckCircle2, MapPin, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import type { Match } from "../types.js";
import { formatCurrency } from "./PropertyCard.js";

interface MatchCardProps {
  match: Match;
  onPropose?: (matchId: string) => void;
  proposing?: boolean;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, onPropose, proposing = false }) => {
  const isDirect = match.partyCount === 2;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
              isDirect
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "bg-teal-50 border-teal-200 text-teal-700"
            }`}>
              {isDirect ? "2-Party Direct Swap" : "3-Party Trade Loop"}
            </span>
            <span className="text-xs font-mono font-medium text-slate-400">
              #{match.id}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700">
              {match.matchScore}/100 Match Quality
            </span>
          </div>
        </div>

        <p className="text-xs font-semibold text-slate-800 line-clamp-2">
          {match.explanation}
        </p>
      </div>

      {/* Participants & Transfer Legs */}
      <div className="p-5 space-y-4 flex-1">
        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
          EXCHANGE CYCLE TOPOLOGY ({match.partyCount} PARTIES):
        </span>

        {/* Cycle Flow Chain */}
        <div className="flex items-center flex-wrap gap-2 text-xs font-semibold text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
          {match.cycle.slice(0, match.partyCount).map((id, index) => {
            const leg = match.exchangeLegs[index];
            return (
              <React.Fragment key={`${id}-${index}`}>
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded shadow-2xs">
                  <span className="font-bold text-blue-900">{leg?.fromOwnerName || id}</span>
                  <span className="text-[10px] text-slate-500 capitalize">({leg?.transferredPropertyType?.replace(/_/g, " ")})</span>
                </div>
                {index < match.partyCount - 1 ? (
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Cash Boot Breakdown */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
            CASH BOOT SETTLEMENT:
          </span>
          <div className="grid grid-cols-1 gap-1 text-xs">
            {match.boots.map((boot) => (
              <div key={boot.listingId} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0">
                <span className="text-slate-700 font-medium">{boot.ownerName}:</span>
                <span className={`font-semibold ${
                  boot.action === "pays"
                    ? "text-amber-700"
                    : boot.action === "receives"
                    ? "text-emerald-700"
                    : "text-slate-500"
                }`}>
                  {boot.action === "pays" ? `+ Pays ${formatCurrency(boot.cashDifference)}` : boot.action === "receives" ? `- Receives ${formatCurrency(boot.cashDifference)}` : "₹0 (Exact Match)"}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-600 italic text-right">
            Net cycle balance strictly ₹0
          </p>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
        <Link
          to={`/matches/${match.id}`}
          className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1"
        >
          View Exchange Loop & Flow <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        {onPropose && (
          <button
            onClick={() => onPropose(match.id)}
            disabled={proposing || match.status === "accepted"}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-sm transition-all"
          >
            {proposing ? "Proposing..." : match.status === "accepted" ? "Accepted" : "Propose Exchange"}
          </button>
        )}
      </div>
    </div>
  );
};
