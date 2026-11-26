import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  CheckCircle2,
  Calendar,
  MapPin,
  Building2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileCheck2,
  RefreshCw,
  Info
} from "lucide-react";
import { api } from "../api.js";
import { useUser } from "../context/UserContext.js";
import { formatCurrency } from "../components/PropertyCard.js";
import { BackButton } from "../components/BackButton.js";

export const ExchangeProgressPage: React.FC = () => {
  const { currentUser } = useUser();
  const [exchanges, setExchanges] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getOwnerAcceptedExchanges();
      setExchanges(data);
    } catch (err: any) {
      setError(err.message || "Failed to load exchange progress.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getCoordinationBadge = (status: string) => {
    switch (status) {
      case "awaiting_coordination":
        return {
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          label: "Awaiting Administrative Assignment",
          desc: "All owners have consented. An administrator is reviewing documentation before site scheduling."
        };
      case "coordination_in_progress":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          label: "Coordination in Progress",
          desc: "Administrative coordinator is actively liaising with parties regarding inspection timing."
        };
      case "site_visit_pending":
        return {
          bg: "bg-purple-50 text-purple-700 border-purple-200",
          label: "Site Inspection Pending",
          desc: "Inspection schedule is currently being coordinated between all participants."
        };
      case "site_visit_scheduled":
        return {
          bg: "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold",
          label: "Site Inspection Scheduled",
          desc: "A verified site inspection has been formally scheduled."
        };
      case "legal_review_in_progress":
        return {
          bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
          label: "Title & Due Diligence Review",
          desc: "Property title documents and revenue khata records are under preliminary verification."
        };
      case "completed":
        return {
          bg: "bg-emerald-100 text-emerald-900 border-emerald-300",
          label: "Coordination Completed",
          desc: "Platform facilitation stage complete. Parties proceed to external deed execution."
        };
      case "closed":
        return {
          bg: "bg-slate-100 text-slate-700 border-slate-300",
          label: "Concluded",
          desc: "This exchange coordination file has been formally concluded."
        };
      default:
        return {
          bg: "bg-slate-100 text-slate-700 border-slate-200",
          label: "Under Review",
          desc: "Exchange proposal is progressing through platform administrative stages."
        };
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Back Button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <BackButton defaultPath="/owner/dashboard" label="Back to Dashboard" className="mb-2" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Exchange Coordination Progress</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track operational milestones, administrative facilitation, and scheduled site visits for your accepted property exchanges.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Important Legal Boundary Disclaimer */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 space-y-1">
          <p className="font-bold">Administrative Facilitation Notice</p>
          <p className="text-blue-800 leading-relaxed">
            Consensus acceptance confirms the mutual intent of all participating property owners to pursue the exchange under the agreed terms. 
            AssetSwap assists with administrative coordination, site visit logistics, and preliminary document assembly. 
            Final legal conveyancing, title deeds, and registration remain statutory processes executed via official government sub-registrar registries.
          </p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 text-center bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-600">Retrieving exchange coordination records...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center text-xs text-red-700">
          <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
          {error}
        </div>
      ) : exchanges.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs space-y-3">
          <Clock className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Active Accepted Exchanges</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Once you and all participating owners accept an exchange proposal, it will appear here under active administrative coordination.
          </p>
          <div className="pt-2">
            <Link
              to="/proposals"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>View Swap Proposals</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {exchanges.map((item) => {
            const badge = getCoordinationBadge(item.coordinationStatus);

            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition-colors"
              >
                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded">
                        {item.ref}
                      </span>
                      <span className="text-xs font-semibold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded">
                        {item.partyCount === 2 ? "Direct Bilateral Exchange" : "3-Way Circular Exchange"}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{item.explanation}</h3>
                  </div>

                  <div className="flex flex-col sm:items-end">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border ${badge.bg}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{badge.label}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">
                      Consensus Accepted: {new Date(item.acceptedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Visual Coordination Stepper */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                    <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                      Exchange Facilitation Milestones
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                      {/* Step 1 */}
                      <div className="p-3 bg-white rounded-lg border border-emerald-200">
                        <div className="flex items-center gap-1.5 text-emerald-700 font-bold mb-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>1. Owner Consent</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Unanimous acceptance achieved by all property owners.</p>
                      </div>

                      {/* Step 2 */}
                      <div className={`p-3 rounded-lg border ${
                        item.coordinationStatus !== "awaiting_coordination" ? "bg-white border-emerald-200" : "bg-blue-50 border-blue-200"
                      }`}>
                        <div className="flex items-center gap-1.5 font-bold mb-1 text-slate-800">
                          <CheckCircle2 className={`w-4 h-4 ${item.coordinationStatus !== "awaiting_coordination" ? "text-emerald-600" : "text-blue-600"}`} />
                          <span>2. Admin Coordination</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Platform administrator verifies details and schedules inspection.</p>
                      </div>

                      {/* Step 3 */}
                      <div className={`p-3 rounded-lg border ${
                        item.coordinationStatus === "site_visit_scheduled" ? "bg-purple-50 border-purple-200 font-bold" : "bg-white border-slate-200"
                      }`}>
                        <div className="flex items-center gap-1.5 font-bold mb-1 text-slate-800">
                          <Calendar className={`w-4 h-4 ${item.coordinationStatus === "site_visit_scheduled" ? "text-purple-600" : "text-slate-400"}`} />
                          <span>3. Site Inspection</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Physical property verification and valuation review.</p>
                      </div>

                      {/* Step 4 */}
                      <div className="p-3 bg-white rounded-lg border border-slate-200">
                        <div className="flex items-center gap-1.5 font-bold mb-1 text-slate-400">
                          <ShieldCheck className="w-4 h-4" />
                          <span>4. Statutory Deed</span>
                        </div>
                        <p className="text-[11px] text-slate-500">Sub-registrar title registration (external legal process).</p>
                      </div>
                    </div>
                  </div>

                  {/* Scheduled Site Visit Card if present */}
                  {item.siteVisitDate && (
                    <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-purple-900">
                            Physical Site Inspection Scheduled
                          </div>
                          <div className="text-xs text-purple-800 mt-0.5 font-medium">
                            Date: {new Date(item.siteVisitDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </div>
                          {item.siteVisitLocation && (
                            <div className="text-xs text-purple-700 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{item.siteVisitLocation}</span>
                            </div>
                          )}
                          {item.siteVisitNotes && (
                            <div className="text-[11px] text-purple-600 mt-1 italic">
                              Coordinator Note: "{item.siteVisitNotes}"
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-purple-700 text-white rounded-lg text-xs font-bold shrink-0 self-start sm:self-center">
                        Inspection Confirmed
                      </span>
                    </div>
                  )}

                  {/* Participating Properties */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Participating Exchange Assets & Terms
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {item.participants.map((p: any) => (
                        <div
                          key={p.listingId}
                          className={`p-4 rounded-xl border ${
                            p.isCurrentUser ? "bg-blue-50/30 border-blue-200 ring-1 ring-blue-100" : "bg-white border-slate-200"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                {p.ownerName}
                                {p.isCurrentUser && (
                                  <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded text-[10px] font-bold">You</span>
                                )}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                Asset {p.listingId} ({p.givesPropertyType.replace(/_/g, " ")})
                              </span>
                            </div>

                            <span className="text-xs font-bold text-slate-800">
                              Valuation: {formatCurrency(p.givesValue)}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-slate-500">Cash Boot Adjustment:</span>
                            {p.action === "pays" || p.action === "pay" ? (
                              <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                                Pays {formatCurrency(p.amount)}
                              </span>
                            ) : p.action === "receives" || p.action === "receive" ? (
                              <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-[11px]">
                                Receives {formatCurrency(p.amount)}
                              </span>
                            ) : (
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                                ₹0 Balanced Swap
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
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
