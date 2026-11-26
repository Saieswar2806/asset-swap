import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeftRight,
  ShoppingBag,
  Tag,
  Building2,
  PlusCircle,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  Lock,
  ArrowRight,
  Maximize2,
  MapPin,
  ShieldCheck,
  RefreshCw,
  Mail,
  Phone,
  AlertCircle
} from "lucide-react";
import { api } from "../api.js";
import { useUser } from "../context/UserContext.js";
import { formatCurrency } from "../components/PropertyCard.js";
import type { Listing, Match } from "../types.js";

export const OwnerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isOwner, isAuthenticated, loading: authLoading } = useUser();

  const [stats, setStats] = useState<any>(null);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [myMatches, setMyMatches] = useState<Match[]>([]);
  const [myProposals, setMyProposals] = useState<any[]>([]);
  const [myBuyInquiries, setMyBuyInquiries] = useState<any[]>([]);
  const [mySellInquiries, setMySellInquiries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isOwner)) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, isOwner, navigate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [s, l, m, p, buyInqs, sellInqs] = await Promise.all([
        api.getOwnerStats().catch(() => null),
        api.getOwnerListings().catch(() => []),
        api.getOwnerMatches().catch(() => []),
        api.getProposals({ ownerId: currentUser?.id }).catch(() => []),
        api.getMyBuyInquiries().catch(() => []),
        api.getSellInquiries().catch(() => [])
      ]);
      setStats(s);
      setMyListings(l);
      setMyMatches(m);
      setMyProposals(p);
      setMyBuyInquiries(buyInqs);
      setMySellInquiries(sellInqs);
    } catch (err: any) {
      console.error("Failed to load owner data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner && currentUser) {
      loadData();
    }
  }, [isOwner, currentUser?.id]);

  const pendingProposals = myProposals.filter((p) => p.status === "proposed");
  const saleListingsCount = myListings.filter((l) => l.intent === "sell" || l.intent === "both").length;

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold uppercase tracking-wider">
              Property Owner Console
            </span>
            <span className="text-xs text-slate-400">Account ID: {currentUser?.id}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {currentUser?.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your real estate assets, explore 2-party and 3-party swaps, and access verified buy & sell listings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh Portfolio"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Register New Property</span>
          </Link>
        </div>
      </div>

      {/* THREE PRIMARY PROMINENT ACTION CARDS: SWAP, BUY, SELL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. SWAP PROPERTY */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Swap Property</h3>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold uppercase">
                  Primary Model
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Discover direct 2-party and 3-party circular exchange loops with certified valuations and automated Cash Boot calculations.
              </p>
            </div>

            <div className="pt-2 text-xs text-slate-600 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span><strong>{myMatches.length}</strong> compatible swap cycles available</span>
            </div>
          </div>

          <Link
            to="/swap"
            className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
          >
            <span>Explore Swaps & Proposals</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 2. BUY PROPERTY */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Buy Property</h3>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                  Outright Sale
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Explore verified real estate listed for direct purchase across Karnataka and submit purchase inquiries directly to verified owners.
              </p>
            </div>

            <div className="pt-2 text-xs text-slate-600 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span><strong>{myBuyInquiries.length}</strong> purchase inquiries sent</span>
            </div>
          </div>

          <Link
            to="/buy"
            className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
          >
            <span>Browse For Sale Listings</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 3. SELL PROPERTY */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-between group">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Tag className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Sell Property</h3>
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                  Cash Sale
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                List your property for outright cash sale, manage asking prices, and receive direct buyer inquiries while maintaining broker validation.
              </p>
            </div>

            <div className="pt-2 text-xs text-slate-600 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-600" />
              <span><strong>{saleListingsCount}</strong> of your properties listed for sale</span>
            </div>
          </div>

          <Link
            to="/sell"
            className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors shadow-xs"
          >
            <span>Manage Sale Listings</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Real Portfolio Status Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Owned Properties</span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">{myListings.length}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Broker-Reviewed Assets</span>
          <span className="text-2xl font-bold text-emerald-600 mt-1 block">
            {myListings.filter((l) => l.status === "reviewed").length}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pending Swap Proposals</span>
          <span className="text-2xl font-bold text-blue-600 mt-1 block">{pendingProposals.length}</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Buyer Inquiries Received</span>
          <span className="text-2xl font-bold text-amber-600 mt-1 block">{mySellInquiries.length}</span>
        </div>
      </div>

      {/* Pending Proposals Alert (if any) */}
      {pendingProposals.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                You have {pendingProposals.length} swap proposal{pendingProposals.length > 1 ? "s" : ""} awaiting your vote
              </h3>
              <p className="text-xs text-amber-700 mt-0.5">
                Every owner must independently agree to exchange terms and cash boot balance before a swap is accepted.
              </p>
            </div>
          </div>
          <Link
            to="/swap"
            className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors shadow-xs shrink-0 text-center"
          >
            Review & Vote Now
          </Link>
        </div>
      )}

      {/* My Properties & Active Listings Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">My Properties & Portfolio</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Properties registered in your name, their current verification state, and configured intent.
            </p>
          </div>
          <Link
            to="/my-properties"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-xs text-slate-400">Loading properties...</div>
        ) : myListings.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-slate-900">No properties registered yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Add your first property to start discovering swap matches, listing for sale, or exploring exchange loops.
            </p>
            <Link
              to="/register"
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register Property</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myListings.slice(0, 6).map((item) => (
              <div
                key={item.id}
                className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                      {item.intent === "both" ? "Swap & Sell" : item.intent === "sell" ? "For Sale" : "For Swap"}
                    </span>
                    {item.locked && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 flex items-center gap-1 border border-blue-200">
                        <Clock className="w-3 h-3 text-blue-600" />
                        <span>Active Proposal</span>
                      </span>
                    )}
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      item.status === "reviewed"
                        ? "bg-emerald-100 text-emerald-800"
                        : item.status === "submitted"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 truncate" title={item.metadata?.title as string || item.locality}>
                    {item.metadata?.title as string || `${item.locality}, ${item.district}`}
                  </h4>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>{item.locality}, {item.district}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded-lg text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Area</span>
                    <span className="font-semibold text-slate-800">{item.area} {item.areaUnit}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Valuation</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(item.reviewedValue || item.ownerDeclaredValue)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Split Section: Inquiries Received & Buy Inquiries Sent */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inquiries Received from Buyers */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-amber-600" />
              <span>Inquiries Received on My Properties</span>
            </h3>
            <Link to="/sell" className="text-xs font-bold text-blue-600 hover:text-blue-800">
              Manage
            </Link>
          </div>

          {mySellInquiries.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No buyer inquiries received yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {mySellInquiries.slice(0, 3).map((inq) => (
                <div key={inq.id} className="py-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{inq.buyerName}</span>
                    <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                      {inq.status}
                    </span>
                  </div>
                  <p className="text-slate-500 truncate">"{inq.message}"</p>
                  <div className="text-[11px] text-slate-400">
                    Property: {inq.listingTitle || inq.listingLocality}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Sent Buy Inquiries */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <span>My Sent Purchase Requests</span>
            </h3>
            <Link to="/buy" className="text-xs font-bold text-blue-600 hover:text-blue-800">
              Browse More
            </Link>
          </div>

          {myBuyInquiries.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">You have not sent any purchase inquiries yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {myBuyInquiries.slice(0, 3).map((inq) => (
                <div key={inq.id} className="py-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{inq.listingTitle || inq.listingLocality}</span>
                    <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                      {inq.status}
                    </span>
                  </div>
                  <p className="text-slate-500 truncate">"{inq.message}"</p>
                  <div className="text-[11px] text-slate-400">
                    Seller: {inq.sellerName || "Verified Owner"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
