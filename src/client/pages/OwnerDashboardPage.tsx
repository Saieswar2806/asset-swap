import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  PlusCircle,
  Sparkles,
  ArrowLeftRight,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  Lock,
  ArrowRight,
  Maximize2,
  Tag,
  MapPin,
  Trash2,
  Edit3,
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { DashboardLayout, type NavItem } from "../components/DashboardLayout.js";
import { api } from "../api.js";
import { useUser } from "../context/UserContext.js";
import { PropertyCard, formatCurrency } from "../components/PropertyCard.js";
import { MatchCard } from "../components/MatchCard.js";
import type { Listing, Match } from "../types.js";

export const OwnerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isOwner, isAuthenticated, loading: authLoading } = useUser();
  const [activeTab, setActiveTab] = useState<string>("overview");

  const [stats, setStats] = useState<any>(null);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [myMatches, setMyMatches] = useState<Match[]>([]);
  const [myProposals, setMyProposals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Edit Listing state
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Registration step state (embedded wizard)
  const [regStep, setRegStep] = useState(1);
  const [regTitle, setRegTitle] = useState("");
  const [regPropertyType, setRegPropertyType] = useState<string>("agricultural_land");
  const [regDistrict, setRegDistrict] = useState("Ramanagara");
  const [regLocality, setRegLocality] = useState("Kanakapura");
  const [regArea, setRegArea] = useState("2.5");
  const [regAreaUnit, setRegAreaUnit] = useState<string>("acres");
  const [regDeclaredValue, setRegDeclaredValue] = useState("20000000");
  const [regKhata, setRegKhata] = useState("Pahani / RTC");
  const [regSurvey, setRegSurvey] = useState("Sy. No. 128/1");
  const [regConversion, setRegConversion] = useState("Agricultural");
  const [regDescription, setRegDescription] = useState("Direct tar road access, fertile soil, perimeter fenced.");
  const [regWantedTypes, setRegWantedTypes] = useState<string[]>(["farmhouse", "residential_plot"]);
  const [submittingReg, setSubmittingReg] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !isOwner) {
        navigate("/login");
      }
    }
  }, [authLoading, isAuthenticated, isOwner, navigate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [s, l, m, p] = await Promise.all([
        api.getOwnerStats().catch(() => null),
        api.getOwnerListings().catch(() => []),
        api.getOwnerMatches().catch(() => []),
        api.getProposals({ ownerId: currentUser?.id }).catch(() => [])
      ]);
      setStats(s);
      setMyListings(l);
      setMyMatches(m);
      setMyProposals(p);
    } catch (err: any) {
      console.error("Failed to load owner data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) {
      loadData();
    }
  }, [isOwner]);

  const handleOpenEdit = (l: Listing) => {
    setEditingListing(l);
    setEditTitle(l.metadata?.title as string || l.locality);
    setEditValue(String(l.ownerDeclaredValue));
    setEditDescription((l.metadata?.description as string) || "");
  };

  const handleSaveEdit = async () => {
    if (!editingListing) return;
    try {
      await api.updateOwnerListing(editingListing.id, {
        title: editTitle,
        ownerDeclaredValue: Number(editValue),
        description: editDescription
      });
      setFeedback({ message: "Listing updated successfully.", type: "success" });
      setEditingListing(null);
      await loadData();
    } catch (err: any) {
      setFeedback({ message: err.message, type: "error" });
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm(`Are you sure you want to withdraw and delete listing #${listingId}?`)) return;
    try {
      const msg = await api.deleteOwnerListing(listingId);
      setFeedback({ message: msg, type: "success" });
      await loadData();
    } catch (err: any) {
      setFeedback({ message: err.message, type: "error" });
    }
  };

  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReg(true);
    try {
      await api.createOwnerListing({
        title: regTitle,
        propertyType: regPropertyType,
        district: regDistrict,
        locality: regLocality,
        area: Number(regArea),
        areaUnit: regAreaUnit,
        ownerDeclaredValue: Number(regDeclaredValue),
        khataType: regKhata,
        surveyNumber: regSurvey,
        conversionStatus: regConversion,
        description: regDescription,
        wants: {
          propertyTypes: regWantedTypes,
          preferredLocations: [regLocality, regDistrict],
          preferredDistricts: [regDistrict]
        }
      });
      setFeedback({ message: "Property registered successfully and is now under review by our broker network.", type: "success" });
      setActiveTab("properties");
      await loadData();
    } catch (err: any) {
      setFeedback({ message: err.message, type: "error" });
    } finally {
      setSubmittingReg(false);
    }
  };

  const handleRespondProposal = async (matchId: string, listingId: string, decision: "accepted" | "declined") => {
    try {
      const res = await api.respondToMatch(matchId, listingId, decision);
      let feedbackMsg = res.message;
      if (res.matchStatus === "accepted") {
        feedbackMsg = "Exchange unanimously accepted by all parties! Escrow asset locks retained.";
      } else if (res.matchStatus === "declined") {
        feedbackMsg = "Proposal declined. All participant property locks have been released.";
      } else if (decision === "accepted") {
        feedbackMsg = "Your acceptance has been recorded. Waiting for other participants to respond.";
      }
      setFeedback({ message: feedbackMsg, type: "success" });
      await loadData();
    } catch (err: any) {
      setFeedback({ message: err.message, type: "error" });
    }
  };

  const handleProposeMatch = async (matchId: string) => {
    try {
      const res = await api.proposeMatch(matchId);
      setFeedback({
        message: res.message || "Exchange proposal submitted successfully. Participating properties are now locked in escrow awaiting responses.",
        type: "success"
      });
      await loadData();
    } catch (err: any) {
      setFeedback({ message: err.message, type: "error" });
    }
  };

  const navItems: NavItem[] = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "properties", label: "My Properties", icon: Building2, badge: myListings.length },
    { id: "register", label: "Register Property", icon: PlusCircle },
    { id: "matches", label: "Discover Matches", icon: Sparkles, badge: myMatches.length > 0 ? myMatches.length : undefined },
    { id: "proposals", label: "Swap Proposals", icon: ArrowLeftRight, badge: myProposals.filter((p) => p.status === "proposed").length || undefined },
    { id: "profile", label: "Profile", icon: User }
  ];

  return (
    <DashboardLayout
      role="owner"
      title="Property Owner Portal"
      subtitle={`Welcome, ${currentUser?.name || "Owner"} • Manage your assets and exchange proposals`}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      navItems={navItems}
    >
      <div className="space-y-6">
        {feedback && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">My Properties</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">
                  {stats?.myTotalProperties ?? myListings.length}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">Registered in Karnataka</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Approved Assets</span>
                <span className="text-2xl font-bold text-emerald-600 mt-1 block">
                  {stats?.approvedProperties ?? myListings.filter((l) => l.status === "reviewed").length}
                </span>
                <span className="text-[10px] text-emerald-700 mt-1 block">Eligible for asset exchange</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Available Matches</span>
                <span className="text-2xl font-bold text-blue-600 mt-1 block">
                  {stats?.availableMatchesCount ?? myMatches.length}
                </span>
                <span className="text-[10px] text-blue-700 mt-1 block">2-party & 3-way opportunities</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Active Proposals</span>
                <span className="text-2xl font-bold text-teal-600 mt-1 block">
                  {stats?.activeProposals ?? myProposals.filter((p) => p.status === "proposed").length}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">Consensus voting in progress</span>
              </div>
            </div>

            {/* Quick Actions & High Priority Match Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Matches Preview */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">Exchange Matches for Your Properties</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab("matches")}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    View All ({myMatches.length})
                  </button>
                </div>

                {myMatches.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No exchange matches found yet for your registered properties.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myMatches.slice(0, 2).map((m) => (
                      <MatchCard key={m.id} match={m} onPropose={handleProposeMatch} />
                    ))}
                  </div>
                )}
              </div>

              {/* My Properties Preview */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-700" />
                    <h3 className="text-sm font-bold text-slate-900">My Registered Real Estate Assets</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab("register")}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    + Register Asset
                  </button>
                </div>

                {myListings.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    You have not registered any properties yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {myListings.slice(0, 3).map((l) => (
                      <div key={l.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900">{l.metadata?.title as string || l.locality}</div>
                          <div className="text-[11px] text-slate-500">
                            {l.locality}, {l.district} • Declared: {formatCurrency(l.ownerDeclaredValue)}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            l.status === "reviewed"
                              ? "bg-emerald-100 text-emerald-800"
                              : l.status === "submitted"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {l.status === "reviewed" ? "Approved" : l.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MY PROPERTIES TAB */}
        {activeTab === "properties" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <h2 className="text-base font-bold text-slate-900">My Registered Real Estate Assets</h2>
                <p className="text-xs text-slate-500">
                  Manage your property listings, update exchange requirements, or withdraw eligible assets.
                </p>
              </div>

              <button
                onClick={() => setActiveTab("register")}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 self-start"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Register New Asset
              </button>
            </div>

            {myListings.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-400">
                You have not registered any properties yet. Click the button above to list your first asset.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myListings.map((l) => (
                  <div key={l.id} className="relative group">
                    <PropertyCard listing={l} showWants={true} />
                    <div className="mt-2 flex items-center gap-2 px-1">
                      {!l.locked && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(l)}
                            className="flex-1 py-1.5 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <Edit3 className="w-3 h-3 text-slate-500" />
                            Edit Asset
                          </button>
                          <button
                            onClick={() => handleDeleteListing(l.id)}
                            className="py-1.5 px-3 bg-white border border-slate-200 hover:bg-red-50 text-red-600 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                            title="Withdraw Listing"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      {l.locked && (
                        <div className="w-full py-1 text-center text-[11px] font-bold text-amber-700 bg-amber-50 rounded-lg border border-amber-200">
                          Locked in Active Proposal
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* REGISTER PROPERTY TAB */}
        {activeTab === "register" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Register Property for Asset Exchange</h2>
              <p className="text-xs text-slate-500">
                Submit property details and specify what real estate categories and locations you seek in exchange.
              </p>
            </div>

            <form onSubmit={handleSubmitRegistration} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Property Title
                </label>
                <input
                  type="text"
                  required
                  value={regTitle}
                  onChange={(e) => setRegTitle(e.target.value)}
                  placeholder="e.g. Fertile Coconut Plantation with Road Access"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Property Type
                  </label>
                  <select
                    value={regPropertyType}
                    onChange={(e) => setRegPropertyType(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="agricultural_land">Agricultural Land</option>
                    <option value="plot_site">Residential Plot / Site</option>
                    <option value="apartment">Apartment</option>
                    <option value="independent_house">Independent House</option>
                    <option value="farmhouse">Farmhouse</option>
                    <option value="commercial">Commercial Property</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    District
                  </label>
                  <select
                    value={regDistrict}
                    onChange={(e) => setRegDistrict(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Bengaluru">Bengaluru</option>
                    <option value="Ramanagara">Ramanagara</option>
                    <option value="Mysuru">Mysuru</option>
                    <option value="Mandya">Mandya</option>
                    <option value="Tumakuru">Tumakuru</option>
                    <option value="Chikkaballapur">Chikkaballapur</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Locality / Taluk
                  </label>
                  <input
                    type="text"
                    required
                    value={regLocality}
                    onChange={(e) => setRegLocality(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Property Area
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    value={regArea}
                    onChange={(e) => setRegArea(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Area Unit
                  </label>
                  <select
                    value={regAreaUnit}
                    onChange={(e) => setRegAreaUnit(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="acres">Acres</option>
                    <option value="guntas">Guntas</option>
                    <option value="sq_ft">Sq. Ft.</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Owner Declared Expected Valuation (₹ INR)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={regDeclaredValue}
                  onChange={(e) => setRegDeclaredValue(e.target.value)}
                  className="w-full text-sm font-bold p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Value in words: <strong className="text-slate-800">{formatCurrency(Number(regDeclaredValue) || 0)}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Khata Type
                  </label>
                  <input
                    type="text"
                    value={regKhata}
                    onChange={(e) => setRegKhata(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Survey / Flat Number
                  </label>
                  <input
                    type="text"
                    value={regSurvey}
                    onChange={(e) => setRegSurvey(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Property Description
                </label>
                <textarea
                  rows={2}
                  value={regDescription}
                  onChange={(e) => setRegDescription(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submittingReg}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
                >
                  {submittingReg ? "Submitting for Review..." : "Submit Property for Broker Valuation"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* DISCOVER MATCHES TAB */}
        {activeTab === "matches" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <h2 className="text-base font-bold text-slate-900">Exchange Matches for My Properties</h2>
                <p className="text-xs text-slate-500">
                  Identified compatible 2-party and 3-way circular asset exchange opportunities involving your assets.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-blue-50 text-blue-800 rounded-full border border-blue-200">
                {myMatches.length} Matches Found
              </span>
            </div>

            {myMatches.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-400">
                No matching exchange cycles detected right now. When a broker approves your properties and other compatible participants join, opportunities will automatically appear here.
              </div>
            ) : (
              <div className="space-y-4">
                {myMatches.map((m) => (
                  <MatchCard key={m.id} match={m} onPropose={handleProposeMatch} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* SWAP PROPOSALS TAB */}
        {activeTab === "proposals" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <h2 className="text-base font-bold text-slate-900">My Swap Proposals</h2>
                <p className="text-xs text-slate-500">
                  Participate in consensus voting on proposals involving your properties. Unanimous consent retains locks; declining releases all properties back to open discovery.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-blue-50 text-blue-800 rounded-full border border-blue-200 self-start sm:self-auto">
                {myProposals.length} Total Proposals
              </span>
            </div>

            {myProposals.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-400">
                You are not currently involved in any active proposals. Discover a match and propose an exchange to get started.
              </div>
            ) : (
              <div className="space-y-5">
                {myProposals.map((item) => {
                  const myPart = item.participants?.find((p: any) => p.ownerId === currentUser?.id);
                  const isPendingMyVote = item.status === "proposed" && myPart?.response === "pending";
                  const isLocked = item.status === "proposed" || item.status === "accepted";

                  return (
                    <div
                      key={item.id}
                      className={`bg-white border rounded-2xl p-5 shadow-xs space-y-4 transition-all ${
                        isPendingMyVote
                          ? "border-amber-300 ring-2 ring-amber-400/20"
                          : "border-slate-200"
                      }`}
                    >
                      {/* Proposal Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-700">#{item.id}</span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                              item.status === "proposed"
                                ? "bg-blue-50 text-blue-800 border-blue-200"
                                : item.status === "accepted"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-red-50 text-red-800 border-red-200"
                            }`}
                          >
                            {item.status}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                              isLocked
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {isLocked ? "🔒 In Escrow Lock" : "🔓 Unlocked"}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Created: {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>

                        <Link
                          to={`/matches/${item.id}`}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 self-start sm:self-auto"
                        >
                          View Visual Flow →
                        </Link>
                      </div>

                      {/* Action Required Banner if vote pending */}
                      {isPendingMyVote && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                            <span>Action Required: Your consent is requested for this proposed exchange.</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleRespondProposal(item.id, myPart.listingId, "accepted")}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-2xs transition-colors flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Accept Proposal
                            </button>
                            <button
                              onClick={() => handleRespondProposal(item.id, myPart.listingId, "declined")}
                              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs shadow-2xs transition-colors flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Decline
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Proposal Explanation */}
                      <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 font-medium leading-relaxed">
                        {item.explanation}
                      </p>

                      {/* Participants Table */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Participating Property Owners & Responses ({item.participants?.length || 0}):
                        </span>

                        <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                          {item.participants?.map((p: any) => {
                            const isMe = p.ownerId === currentUser?.id;
                            const isPayer = p.action === "pay" || p.action === "pays";
                            const isReceiver = p.action === "receive" || p.action === "receives";
                            const bootDiff = p.cashDifference || p.amount || 0;

                            return (
                              <div
                                key={p.listingId}
                                className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
                                  isMe ? "bg-blue-50/70 font-medium" : "bg-white"
                                }`}
                              >
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-900">{p.ownerName}</span>
                                    {isMe && (
                                      <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded font-bold">
                                        You
                                      </span>
                                    )}
                                    <span className="text-slate-400 font-mono text-[11px]">#{p.listingId}</span>
                                  </div>

                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    Transfers: <strong className="text-slate-700 capitalize">{p.givesPropertyType?.replace(/_/g, " ") || p.ownedProperty?.propertyType?.replace(/_/g, " ") || "Property"}</strong> • Value: {formatCurrency(p.givesValue || p.ownedProperty?.reviewedValue || 0)}
                                  </div>

                                  <div className="text-[11px] mt-0.5">
                                    Cash Boot:{" "}
                                    <strong
                                      className={
                                        isPayer
                                          ? "text-amber-700"
                                          : isReceiver
                                          ? "text-emerald-700"
                                          : "text-slate-600"
                                      }
                                    >
                                      {isPayer
                                        ? `Pays ${formatCurrency(bootDiff)}`
                                        : isReceiver
                                        ? `Receives ${formatCurrency(bootDiff)}`
                                        : "₹0 Settled"}
                                    </strong>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-start sm:self-auto">
                                  <span
                                    className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase border ${
                                      p.response === "accepted"
                                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                        : p.response === "declined"
                                        ? "bg-red-100 text-red-800 border-red-300"
                                        : "bg-amber-100 text-amber-800 border-amber-300"
                                    }`}
                                  >
                                    {p.response === "pending" ? "Awaiting Response" : p.response}
                                  </span>

                                  {isMe && item.status === "proposed" && p.response === "pending" && !isPendingMyVote && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => handleRespondProposal(item.id, p.listingId, "accepted")}
                                        className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] hover:bg-emerald-700"
                                      >
                                        Accept
                                      </button>
                                      <button
                                        onClick={() => handleRespondProposal(item.id, p.listingId, "declined")}
                                        className="px-2.5 py-1 bg-red-600 text-white rounded-lg font-bold text-[11px] hover:bg-red-700"
                                      >
                                        Decline
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs max-w-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Property Owner Profile</h3>
            <div className="text-xs space-y-2.5 text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div><strong className="text-slate-800">Owner Name:</strong> {currentUser?.name}</div>
              <div><strong className="text-slate-800">Email:</strong> {currentUser?.email}</div>
              <div><strong className="text-slate-800">Phone:</strong> {currentUser?.phone || "—"}</div>
              <div><strong className="text-slate-800">Account Type:</strong> Property Owner</div>
              <div><strong className="text-slate-800">Account Status:</strong> <span className="text-emerald-700 font-bold">Active</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Listing Modal */}
      {editingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Edit Asset #{editingListing.id}</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Declared Value (₹)</label>
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditingListing(null)}
                className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
