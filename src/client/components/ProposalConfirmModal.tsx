import React from "react";
import {
  ArrowLeftRight,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Lock,
  Building2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  X
} from "lucide-react";
import type { Match } from "../types.js";
import { formatCurrency } from "./PropertyCard.js";

interface ProposalConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match | null;
  onConfirm: (matchId: string) => Promise<void>;
  isSubmitting?: boolean;
}

export const ProposalConfirmModal: React.FC<ProposalConfirmModalProps> = ({
  isOpen,
  onClose,
  match,
  onConfirm,
  isSubmitting = false
}) => {
  if (!isOpen || !match) return null;

  const isDirect = match.partyCount === 2;

  const handleConfirm = async () => {
    await onConfirm(match.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  isDirect
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-teal-50 border-teal-200 text-teal-700"
                }`}
              >
                {isDirect ? "2-Party Direct Exchange" : "3-Party Circular Trade Loop"}
              </span>
              <span className="font-mono text-xs font-bold text-slate-400">
                #{match.id}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Review & Confirm Swap Proposal
            </h2>
            <p className="text-xs text-slate-500">
              Carefully verify participant properties, exchange directions, and cash adjustments before initiating escrow.
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Match Quality & Engine Explanation */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Engine Match Score: {match.matchScore}/100
            </span>
            <span className="text-slate-500">
              Avg Distance: ~{Math.round(match.locationScoreKm)} km
            </span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {match.explanation}
          </p>
        </div>

        {/* Transfer Directions (Who Gives What To Whom) */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
            Asset Transfer Direction & Valuation
          </h3>

          <div className="space-y-2">
            {match.exchangeLegs.map((leg, index) => (
              <div
                key={index}
                className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center shrink-0 text-[11px]">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">
                      {leg.fromOwnerName}{" "}
                      <span className="text-slate-400 font-normal">transfers to</span>{" "}
                      {leg.toOwnerName}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Asset #{leg.fromListingId} •{" "}
                      <span className="capitalize">{leg.transferredPropertyType?.replace(/_/g, " ")}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-slate-100 sm:pl-4">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                    Broker-Reviewed Value
                  </span>
                  <span className="font-bold text-slate-900 text-xs">
                    {formatCurrency(leg.assetValue)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cash Adjustments Breakdown */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-amber-600" />
            Cash Boot Adjustments (Mutual Valuation Differences)
          </h3>

          <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 divide-y divide-amber-200/50">
            {match.boots.map((boot) => (
              <div
                key={boot.listingId}
                className="py-2 first:pt-0 last:pb-0 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900">{boot.ownerName}</span>
                  <span className="text-slate-500 text-[11px] block">{boot.explanation}</span>
                </div>
                <div className="text-right">
                  <span
                    className={`font-bold text-xs ${
                      boot.action === "pays"
                        ? "text-amber-800"
                        : boot.action === "receives"
                        ? "text-emerald-800"
                        : "text-slate-600"
                    }`}
                  >
                    {boot.action === "pays"
                      ? `+ Pays ${formatCurrency(boot.cashDifference)}`
                      : boot.action === "receives"
                      ? `- Receives ${formatCurrency(boot.cashDifference)}`
                      : "₹0 Pure Swap"}
                  </span>
                </div>
              </div>
            ))}
            <div className="pt-2 flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span>Total Cycle Balance</span>
              <span className="text-emerald-700">₹0 Net (Fully Balanced)</span>
            </div>
          </div>
        </div>

        {/* Escrow Lock Notice */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3">
          <Lock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 space-y-1">
            <span className="font-bold block">Escrow Asset Protection Policy</span>
            <p className="text-[11px] leading-relaxed text-blue-800">
              Confirming this proposal immediately locks all {match.partyCount} participating properties in escrow. Each property owner will review the details and independently vote to accept or decline. If any owner declines, all property locks are automatically released.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Lock className="w-3.5 h-3.5" />
            {isSubmitting ? "Locking in Escrow & Proposing..." : "Confirm & Propose Exchange"}
          </button>
        </div>
      </div>
    </div>
  );
};
