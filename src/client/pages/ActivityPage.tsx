import React, { useState, useEffect } from "react";
import { Activity, ShieldCheck, ArrowLeftRight, Building2, CheckCircle2, XCircle, Clock, Lock, RefreshCw, FileText } from "lucide-react";
import { api } from "../api.js";

interface AuditLogItem {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  details: string | null;
  performedBy: string;
  timestamp: string;
}

export const ActivityPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getActivityLogs({
        entityType: entityFilter === "all" ? undefined : entityFilter,
        limit: 100
      });
      setLogs(data);
    } catch (err: any) {
      console.error("Failed to load activity logs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [entityFilter]);

  const getActionInfo = (action: string) => {
    switch (action) {
      case "admin_approve":
        return { label: "Broker Valuation Approved", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 };
      case "admin_reject":
        return { label: "Broker Review Rejected", color: "bg-red-50 text-red-700 border-red-200", icon: XCircle };
      case "propose_match":
        return { label: "Exchange Proposal Initiated", color: "bg-blue-50 text-blue-700 border-blue-200", icon: ArrowLeftRight };
      case "match_unanimously_accepted":
        return { label: "Consensus Agreement Reached", color: "bg-teal-50 text-teal-700 border-teal-200", icon: CheckCircle2 };
      case "match_declined":
        return { label: "Proposal Declined (Locks Released)", color: "bg-amber-50 text-amber-700 border-amber-200", icon: Lock };
      case "listing_registered":
        return { label: "New Property Registered", color: "bg-purple-50 text-purple-700 border-purple-200", icon: Building2 };
      default:
        return { label: action.replace(/_/g, " "), color: "bg-slate-50 text-slate-700 border-slate-200", icon: FileText };
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Activity & Audit Trail</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
              Audit Logs
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time audit records stored in the SQLite database for property submissions, broker valuation assessments, proposals, and consensus votes.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh Activity
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: "all", label: "All Activity" },
          { id: "listing", label: "Property Listings & Broker Reviews" },
          { id: "match", label: "Exchange Proposals & Votes" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setEntityFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              entityFilter === tab.id
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Activity Timeline List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-xl shadow-sm">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-600">Loading audit records from SQLite...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No activity logs recorded yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Perform actions such as reviewing a listing or proposing a match to generate audit trail events.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm divide-y divide-slate-100">
          {logs.map((log) => {
            const info = getActionInfo(log.action);
            const Icon = info.icon;
            let parsedDetails: any = null;
            try {
              if (log.details) parsedDetails = JSON.parse(log.details);
            } catch {
              parsedDetails = log.details;
            }

            return (
              <div key={log.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start gap-3.5">
                  <div className={`p-2 rounded-lg border shadow-xs mt-0.5 ${info.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-900">{info.label}</span>
                      <span className="font-mono text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        #{log.entityId}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 mt-1">
                      Performed by <span className="font-semibold text-slate-800">{log.performedBy}</span>
                    </div>

                    {parsedDetails && (
                      <div className="mt-2 text-xs text-slate-500 font-mono bg-slate-50 p-2 rounded border border-slate-200/60 max-w-xl truncate">
                        {typeof parsedDetails === "object" ? JSON.stringify(parsedDetails) : parsedDetails}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right sm:self-center text-xs text-slate-400 font-mono whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
