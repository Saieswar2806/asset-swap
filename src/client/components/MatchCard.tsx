import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeftRight,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  Lock,
  CheckCircle2,
  MapPin,
  Tag
} from "lucide-react";
import type { Match } from "../types.js";
import { formatCurrency } from "./PropertyCard.js";
import { ProposalConfirmModal } from "./ProposalConfirmModal.js";

interface MatchCardProps {
  match: Match;
  onPropose?: (matchId: string) => Promise<void> | void;
  proposing?: boolean;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match, onPropose, proposing = false }) => {
  const [showModal, setShowModal] = useState(false);
  const isDirect = match.partyCount === 2;

  const handleConfirmProposal = async (matchId: string) => {
    if (onPropose) {
      await onPropose(matchId);
    }
    setShowModal(false);
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  isDirect
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-teal-50 border-teal-200 text-teal-700"
                }`}
              >
                {isDirect ? "2-Party Direct Swap" : "3-Party Circular Exchange"}
              </span>
              <span className="text-xs font-mono font-medium text-slate-400">
                #{match.id}
              </span>
              {match.status && (
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                    match.status === "proposed"
                      ? "bg-amber-100 text-amber-800"
                      : match.status === "accepted"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {match.status}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700">
                {match.matchScore}/100 Match Quality
              </span>
            </div>
          </div>

          <p className="text-xs font-semibold text-slate-800 leading-relaxed">
            {match.explanation}
          </p>

          {/* Matching Reasons Pill Badges */}
          {match.reasons && match.reasons.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {match.reasons.map((reason, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-medium rounded-md border border-slate-200"
                >
                  ✓ {reason}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Participating Asset Transfer Legs */}
        <div className="p-5 space-y-4 flex-1">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2.5">
              EXCHANGE LEGS & PROPERTY TRANSFERS ({match.partyCount} PARTIES):
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {match.exchangeLegs.map((leg, index) => (
                <div
                  key={index}
                  className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{leg.fromOwnerName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">Asset #{leg.fromListingId}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-blue-800 bg-white p-2 rounded-lg border border-slate-200 font-medium">
                    <span className="capitalize font-bold">{leg.transferredPropertyType?.replace(/_/g, " ")}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="text-slate-600 text-[11px]">Given to {leg.toOwnerName}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <span>Broker Valuation:</span>
                    <strong className="text-slate-800">{formatCurrency(leg.assetValue)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cash Boot Breakdown */}
          <div className="space-y-2 bg-amber-50/50 border border-amber-200/70 rounded-xl p-3.5">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              CASH ADJUSTMENTS (VALUATION DIFFERENCES):
            </span>
            <div className="grid grid-cols-1 gap-1 text-xs">
              {match.boots.map((boot) => (
                <div
                  key={boot.listingId}
                  className="flex justify-between items-center py-1 border-b border-amber-100 last:border-0"
                >
                  <span className="text-slate-700 font-medium">{boot.ownerName}:</span>
                  <span
                    className={`font-bold ${
                      boot.action === "pays"
                        ? "text-amber-800"
                        : boot.action === "receives"
                        ? "text-emerald-800"
                        : "text-slate-500"
                    }`}
                  >
                    {boot.action === "pays"
                      ? `+ Pays ${formatCurrency(boot.cashDifference)}`
                      : boot.action === "receives"
                      ? `- Receives ${formatCurrency(boot.cashDifference)}`
                      : "₹0 Pure Swap"}
                  </span>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-slate-500 italic text-right border-t border-amber-100 pt-1">
              Mutual balance: ₹0 (Boot is fully conserved)
            </div>
          </div>
        </div>

        {/* Card Action Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <Link
            to={`/matches/${match.id}`}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
          >
            View Flow Details <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {onPropose && (
            <button
              onClick={() => setShowModal(true)}
              disabled={proposing || match.status === "accepted" || match.status === "proposed"}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-xs transition-all flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              {match.status === "accepted"
                ? "Accepted"
                : match.status === "proposed"
                ? "Active Proposal"
                : "Review & Propose Swap"}
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <ProposalConfirmModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        match={match}
        onConfirm={handleConfirmProposal}
        isSubmitting={proposing}
      />
    </>
  );
};
