import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  UserCircle2,
  Mail,
  Phone,
  ShieldCheck,
  Building2,
  ArrowLeftRight,
  ShoppingBag,
  Tag,
  Clock,
  Sparkles,
  LogOut,
  Calendar,
  KeyRound,
  CheckCircle2
} from "lucide-react";
import { useUser } from "../context/UserContext.js";
import { api } from "../api.js";
import { BackButton } from "../components/BackButton.js";
import type { Listing } from "../types.js";

export const ProfilePage: React.FC = () => {
  const { currentUser, logout } = useUser();
  const navigate = useNavigate();

  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [inquiriesSent, setInquiriesSent] = useState<any[]>([]);
  const [inquiriesReceived, setInquiriesReceived] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      try {
        const [listings, sentInqs, recInqs] = await Promise.all([
          api.getOwnerListings().catch(() => []),
          api.getMyBuyInquiries().catch(() => []),
          api.getSellInquiries().catch(() => [])
        ]);
        setMyListings(listings);
        setInquiriesSent(sentInqs);
        setInquiriesReceived(recInqs);
      } catch {
        // Ignored
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const swapCount = myListings.filter((l) => l.intent === "swap" || l.intent === "both").length;
  const sellCount = myListings.filter((l) => l.intent === "sell" || l.intent === "both").length;
  const reviewedCount = myListings.filter((l) => l.status === "reviewed").length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <BackButton defaultPath="/owner/dashboard" label="Back to Dashboard" />
      </div>

      {/* Profile Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-50 via-teal-50 to-transparent rounded-full -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-500 text-white flex items-center justify-center font-bold text-2xl shadow-md shadow-blue-500/20 shrink-0">
              {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : "U"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{currentUser?.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-100 text-emerald-800">
                  {currentUser?.status || "active"}
                </span>
              </div>
              <p className="text-xs text-slate-500 capitalize font-medium mt-0.5">
                Verified Platform {currentUser?.role || "Owner"}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-xl text-xs font-bold hover:bg-red-50 transition-colors self-start sm:self-auto"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Account Info & Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact & Identity Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4 md:col-span-1">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <UserCircle2 className="w-4 h-4 text-blue-600" />
            <span>Account Details</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Email Address</span>
              <div className="flex items-center gap-2 text-slate-700 font-semibold truncate">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{currentUser?.email}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Phone Number</span>
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{currentUser?.phone || "+91 98450 00000"}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Account ID</span>
              <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                <KeyRound className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{currentUser?.id}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Security Status</span>
              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Session Authenticated (RBAC)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio & Activity Summary */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs md:col-span-2 space-y-5">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <span>Real Estate Activity & Metrics</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Owned</span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block">{myListings.length}</span>
              <span className="text-[10px] text-slate-500 mt-0.5 block">{reviewedCount} Broker Verified</span>
            </div>

            <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Swap Active</span>
                <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-blue-900 mt-1 block">{swapCount}</span>
              <Link to="/swap" className="text-[10px] font-bold text-blue-600 hover:underline mt-0.5 block">Explore Matches →</Link>
            </div>

            <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-100">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Sale Active</span>
                <Tag className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <span className="text-2xl font-bold text-amber-900 mt-1 block">{sellCount}</span>
              <Link to="/sell" className="text-[10px] font-bold text-amber-600 hover:underline mt-0.5 block">Manage Sales →</Link>
            </div>

            <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Buy Requests</span>
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <span className="text-2xl font-bold text-emerald-900 mt-1 block">{inquiriesSent.length}</span>
              <Link to="/buy" className="text-[10px] font-bold text-emerald-600 hover:underline mt-0.5 block">View Sent Inquiries →</Link>
            </div>

            <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-100">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Buyer Offers</span>
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <span className="text-2xl font-bold text-purple-900 mt-1 block">{inquiriesReceived.length}</span>
              <Link to="/sell" className="text-[10px] font-bold text-purple-600 hover:underline mt-0.5 block">Buyer Inquiries →</Link>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-center">
              <Link
                to="/register"
                className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold text-center hover:bg-slate-800 transition-colors shadow-xs"
              >
                + Add Property
              </Link>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <Link
              to="/my-properties"
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <span>View Full Portfolio</span>
              <span>→</span>
            </Link>
            <span className="text-slate-300">•</span>
            <Link
              to="/proposals"
              className="text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              Swap Proposals
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
