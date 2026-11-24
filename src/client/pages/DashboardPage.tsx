import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowLeftRight,
  TrendingUp,
  MapPin,
  ArrowRight,
  PlusCircle,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts";
import { api } from "../api.js";
import type { DashboardStats } from "../types.js";
import { PropertyCard, formatCurrency } from "../components/PropertyCard.js";
import { MatchCard } from "../components/MatchCard.js";

const COLORS = ["#2563eb", "#0d9488", "#d97706", "#7c3aed", "#e11d48", "#475569"];

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getDashboardStats()
      .then((data) => setStats(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Loading exchange metrics...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="max-w-4xl mx-auto my-12 p-6 bg-red-50 border border-red-200 rounded-xl text-red-800">
        <h3 className="font-bold text-base mb-1">Failed to load platform data</h3>
        <p className="text-sm">{error || "Unknown error occurred"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-200 border border-blue-400/30">
            <Sparkles className="w-3.5 h-3.5 text-teal-300" />
            Karnataka Real Estate Asset Exchange Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Exchange Real Estate Without Selling for Cash
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Asset Swap connects verified property owners in direct 2-party and 3-party circular trade loops. Cash is strictly utilized for mutual broker-reviewed valuation differences (**Cash Boot**).
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/matches"
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Find Exchange Opportunities
            </Link>
            <Link
              to="/register"
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold backdrop-blur-md transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Register New Property
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Total Properties</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{stats.totalListings}</div>
          <span className="text-[11px] text-slate-500">Across 6 districts</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Broker-Reviewed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">{stats.brokerReviewed}</div>
          <span className="text-[11px] text-emerald-600 font-medium">Eligible for matching</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Awaiting Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600">{stats.awaitingReview}</div>
          <Link to="/admin" className="text-[11px] text-blue-600 hover:underline font-semibold block">
            Review in Admin →
          </Link>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Discovered Matches</span>
            <Sparkles className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-extrabold text-teal-700">{stats.availableMatchesCount}</div>
          <span className="text-[11px] text-slate-500">2-party & 3-party loops</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Active Proposals</span>
            <ArrowLeftRight className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-blue-700">{stats.activeProposals}</div>
          <span className="text-[11px] text-slate-500">Escrow locked</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Completed Swaps</span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold text-purple-700">{stats.completedTrades}</div>
          <span className="text-[11px] text-slate-500">Unanimous consensus</span>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Property Categories Distribution</h3>
              <p className="text-xs text-slate-500">Listings by real estate asset classification</p>
            </div>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
              6 Categories
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.typeDistribution.map((d) => ({
                  name: d.type.replace(/_/g, " "),
                  count: d.count,
                  avgCr: (d.avgValue / 10000000).toFixed(1)
                }))}
                margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
              >
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [String(val), "Properties"]}
                  labelFormatter={(lbl) => `Asset Type: ${lbl}`}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Exchange Activity Volume Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Simulated Exchange Volume (Cr)</h3>
              <p className="text-xs text-slate-500">Monthly trade loop propositions and completions</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              Active Exchange Growth
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.exchangeActivity} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [`₹${v} Cr`, "Transaction Volume"]} />
                <Area type="monotone" dataKey="volumeCr" stroke="#0d9488" strokeWidth={2.5} fillOpacity={1} fill="url(#volGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recommended Matches Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Top Recommended Exchanges
            </h2>
            <p className="text-xs text-slate-500">
              High-compatibility 2-party bilateral and 3-party circular trade loops
            </p>
          </div>
          <Link
            to="/matches"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Explore all {stats.availableMatchesCount} matches <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {stats.recentMatches.slice(0, 2).map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </div>

      {/* Recent Properties Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-700" />
              Recently Registered Properties
            </h2>
            <p className="text-xs text-slate-500">Verified and submitted assets across Karnataka</p>
          </div>
          <Link
            to="/my-properties"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Manage My Properties <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {stats.recentListings.slice(0, 6).map((listing) => (
            <PropertyCard key={listing.id} listing={listing} />
          ))}
        </div>
      </div>
    </div>
  );
};
