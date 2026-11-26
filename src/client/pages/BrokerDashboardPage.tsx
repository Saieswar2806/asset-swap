import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Clock,
  CheckCircle2,
  XCircle,
  FileCheck2,
  User,
  ShieldCheck,
  Building2,
  MapPin,
  Maximize2,
  DollarSign,
  AlertCircle,
  RefreshCw,
  Award,
  Building,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  Check,
  ExternalLink,
  Info,
  Layers,
  Sparkles,
  Search,
  Filter,
  FileText,
  AlertTriangle,
  Send
} from "lucide-react";
import { DashboardLayout, type NavItem } from "../components/DashboardLayout.js";
import { api } from "../api.js";
import { useUser } from "../context/UserContext.js";
import { formatCurrency } from "../components/PropertyCard.js";
import { PropertyImageGallery } from "../components/PropertyImageGallery.js";
import type { Listing, ComparableProperty, ConsentStatus, PropertyType, AreaUnit } from "../types.js";

const KARNATAKA_DISTRICTS = [
  "Bengaluru Urban",
  "Bengaluru Rural",
  "Ramanagara",
  "Mysuru",
  "Mandya",
  "Tumakuru",
  "Chikkaballapur",
  "Kolar",
  "Hassan",
  "Dharwad"
];

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "plot_site", label: "Residential Plot / Site" },
  { value: "agricultural_land", label: "Agricultural Land / Farm" },
  { value: "apartment", label: "Multi-Storey Apartment" },
  { value: "independent_house", label: "Independent Villa / House" },
  { value: "farmhouse", label: "Rural Farmhouse / Estate" },
  { value: "commercial", label: "Commercial Office / Retail" }
];

export const BrokerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isBroker, isAuthenticated, loading: authLoading } = useUser();
  const [activeTab, setActiveTab] = useState<string>("overview");

  const [stats, setStats] = useState<any>(null);
  const [queue, setQueue] = useState<Listing[]>([]);
  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [mySubmissions, setMySubmissions] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Review modal with Comparable Properties
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [reviewedValuation, setReviewedValuation] = useState<string>("");
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [comparablesData, setComparablesData] = useState<{
    comparables: ComparableProperty[];
    totalFound: number;
    hasInsufficientData: boolean;
    message?: string;
  } | null>(null);
  const [loadingComparables, setLoadingComparables] = useState<boolean>(false);
  const [selectedComparableIds, setSelectedComparableIds] = useState<string[]>([]);

  // Submissions filters and modal
  const [submissionFilterIntent, setSubmissionFilterIntent] = useState<string>("all");
  const [submissionFilterStatus, setSubmissionFilterStatus] = useState<string>("all");
  const [inspectSubmission, setInspectSubmission] = useState<Listing | null>(null);

  // Broker-assisted Registration Wizard State
  const [regStep, setRegStep] = useState<number>(1);
  const [isSubmittingReg, setIsSubmittingReg] = useState<boolean>(false);
  const [ownerForm, setOwnerForm] = useState({
    name: "",
    phone: "",
    email: "",
    preferredContactMethod: "phone" as "phone" | "email" | "whatsapp",
    address: ""
  });
  const [consentForm, setConsentForm] = useState({
    status: "consent_provided" as ConsentStatus,
    documentationRef: "",
    notes: ""
  });
  const [propForm, setPropForm] = useState({
    title: "",
    propertyType: "plot_site" as PropertyType,
    district: "Bengaluru Urban",
    taluk: "",
    locality: "",
    pincode: "",
    area: "",
    areaUnit: "sq_ft" as AreaUnit,
    ownerDeclaredValue: "",
    khataType: "A-Khata",
    surveyNumber: "",
    conversionStatus: "DC Converted",
    description: "",
    bedrooms: "",
    bathrooms: ""
  });
  const [intentChoice, setIntentChoice] = useState<"swap" | "sell">("swap");
  const [swapPrefs, setSwapPrefs] = useState({
    desiredPropertyTypes: ["plot_site"] as PropertyType[],
    preferredDistricts: ["Bengaluru Urban"],
    preferredLocalities: "",
    minArea: "",
    minAreaUnit: "sq_ft" as AreaUnit,
    maxCashToPay: "2000000",
    maxCashToReceive: "5000000",
    minValue: "",
    maxValue: ""
  });
  const [saleForm, setSaleForm] = useState({
    askingPrice: "",
    saleDescription: "",
    isNegotiable: true
  });

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !isBroker) {
        navigate("/login");
      }
    }
  }, [authLoading, isAuthenticated, isBroker, navigate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [s, q, r, sub] = await Promise.all([
        api.getBrokerStats().catch(() => null),
        api.getBrokerQueue().catch(() => []),
        api.getBrokerMyReviews().catch(() => []),
        api.getMyBrokerSubmissions().catch(() => [])
      ]);
      setStats(s);
      setQueue(q);
      setMyReviews(r);
      setMySubmissions(sub);
    } catch (err: any) {
      console.error("Failed to load broker data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isBroker) {
      loadData();
    }
  }, [isBroker]);

  const handleOpenReviewModal = async (listing: Listing, defaultAction: "approve" | "reject" = "approve") => {
    setSelectedListing(listing);
    setActionType(defaultAction);
    setReviewedValuation(String(listing.ownerDeclaredValue));
    setReviewNotes("Sub-registrar guidance value and market comparables verified.");
    setRejectionReason("Valuation mismatch with prevailing sub-registrar rates.");
    setSelectedComparableIds([]);

    // Fetch suggested comparable properties for this asset
    setLoadingComparables(true);
    try {
      const res = await api.getComparableProperties(listing.id);
      if (res && res.success) {
        setComparablesData({
          comparables: res.comparables || [],
          totalFound: res.totalFound || 0,
          hasInsufficientData: res.hasInsufficientData || false,
          message: res.message
        });
      }
    } catch (err) {
      console.error("Failed to fetch comparables:", err);
      setComparablesData({
        comparables: [],
        totalFound: 0,
        hasInsufficientData: true,
        message: "Unable to load comparable properties."
      });
    } finally {
      setLoadingComparables(false);
    }
  };

  const toggleComparableSelection = (id: string) => {
    setSelectedComparableIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmitReview = async () => {
    if (!selectedListing) return;
    setSubmittingReview(true);
    try {
      const res = await api.brokerReviewListing(selectedListing.id, {
        action: actionType,
        reviewedValue: actionType === "approve" ? Number(reviewedValuation) : undefined,
        internalNotes: reviewNotes,
        rejectionReason: actionType === "reject" ? rejectionReason : undefined,
        selectedComparableIds
      });
      setFeedback({ message: res.message, type: "success" });
      setSelectedListing(null);
      await loadData();
    } catch (err: any) {
      setFeedback({ message: err.message, type: "error" });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleRegisterOnBehalfOfOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerForm.name.trim() || !ownerForm.phone.trim()) {
      setFeedback({ message: "Owner name and valid phone number are required.", type: "error" });
      return;
    }
    if (!propForm.title.trim() || !propForm.area || !propForm.ownerDeclaredValue) {
      setFeedback({ message: "Property title, area, and owner-declared value are required.", type: "error" });
      return;
    }

    setIsSubmittingReg(true);
    try {
      const payload: any = {
        owner: {
          name: ownerForm.name.trim(),
          phone: ownerForm.phone.trim(),
          email: ownerForm.email.trim() || undefined,
          preferredContactMethod: ownerForm.preferredContactMethod,
          address: ownerForm.address.trim() || undefined
        },
        consent: {
          status: consentForm.status,
          documentationRef: consentForm.documentationRef.trim() || "Broker Verified Verbal Mandate",
          notes: consentForm.notes.trim() || undefined
        },
        property: {
          title: propForm.title.trim(),
          propertyType: propForm.propertyType,
          district: propForm.district,
          taluk: propForm.taluk.trim() || undefined,
          locality: propForm.locality.trim() || propForm.district,
          pincode: propForm.pincode.trim() || "560001",
          area: Number(propForm.area),
          areaUnit: propForm.areaUnit,
          ownerDeclaredValue: Number(propForm.ownerDeclaredValue),
          khataType: propForm.khataType,
          surveyNumber: propForm.surveyNumber.trim() || undefined,
          conversionStatus: propForm.conversionStatus,
          description: propForm.description.trim() || undefined,
          bedrooms: propForm.bedrooms ? Number(propForm.bedrooms) : undefined,
          bathrooms: propForm.bathrooms ? Number(propForm.bathrooms) : undefined
        },
        intent: intentChoice
      };

      if (intentChoice === "swap") {
        payload.swapPreferences = {
          desiredPropertyTypes: swapPrefs.desiredPropertyTypes,
          preferredDistricts: swapPrefs.preferredDistricts,
          preferredLocalities: swapPrefs.preferredLocalities ? [swapPrefs.preferredLocalities.trim()] : [propForm.locality || propForm.district],
          minArea: swapPrefs.minArea ? Number(swapPrefs.minArea) : undefined,
          minAreaUnit: swapPrefs.minAreaUnit,
          maxCashToPay: swapPrefs.maxCashToPay ? Number(swapPrefs.maxCashToPay) : 5000000,
          maxCashToReceive: swapPrefs.maxCashToReceive ? Number(swapPrefs.maxCashToReceive) : 5000000,
          minValue: swapPrefs.minValue ? Number(swapPrefs.minValue) : undefined,
          maxValue: swapPrefs.maxValue ? Number(swapPrefs.maxValue) : undefined
        };
      } else {
        payload.saleDetails = {
          askingPrice: saleForm.askingPrice ? Number(saleForm.askingPrice) : Number(propForm.ownerDeclaredValue),
          saleDescription: saleForm.saleDescription.trim() || undefined,
          isNegotiable: saleForm.isNegotiable
        };
      }

      const res = await api.registerOwnerProperty(payload);
      setFeedback({ message: res.message, type: "success" });

      // Reset wizard
      setRegStep(1);
      setOwnerForm({ name: "", phone: "", email: "", preferredContactMethod: "phone", address: "" });
      setPropForm({
        title: "",
        propertyType: "plot_site",
        district: "Bengaluru Urban",
        taluk: "",
        locality: "",
        pincode: "",
        area: "",
        areaUnit: "sq_ft",
        ownerDeclaredValue: "",
        khataType: "A-Khata",
        surveyNumber: "",
        conversionStatus: "DC Converted",
        description: "",
        bedrooms: "",
        bathrooms: ""
      });

      // Reload and switch to submissions tab
      await loadData();
      setActiveTab("submissions");
    } catch (err: any) {
      setFeedback({ message: err.message || "Failed to register property.", type: "error" });
    } finally {
      setIsSubmittingReg(false);
    }
  };

  const navItems: NavItem[] = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "queue", label: "Review Queue", icon: Clock, badge: queue.length > 0 ? queue.length : undefined },
    { id: "register", label: "Register for Owner", icon: UserPlus },
    { id: "submissions", label: "My Submissions", icon: Building2, badge: mySubmissions.length > 0 ? mySubmissions.length : undefined },
    { id: "reviews", label: "My Reviews", icon: FileCheck2 },
    { id: "profile", label: "Profile", icon: User }
  ];

  // Filtered submissions
  const filteredSubmissions = mySubmissions.filter((s) => {
    if (submissionFilterIntent !== "all" && s.intent !== submissionFilterIntent) return false;
    if (submissionFilterStatus !== "all" && s.status !== submissionFilterStatus) return false;
    return true;
  });

  // Self-review check on selected property
  const isOwnSubmission = Boolean(selectedListing?.submittedByBrokerId && selectedListing.submittedByBrokerId === currentUser?.id);
  const isPendingConsent = Boolean(selectedListing?.consentStatus === "pending_consent");

  return (
    <DashboardLayout
      role="broker"
      title="Broker Valuation & Assisted Registration"
      subtitle={`Welcome, ${currentUser?.name || "Broker"} • Certified Real Estate Valuation Specialist`}
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

        {/* ======================================================== */}
        {/* OVERVIEW TAB */}
        {/* ======================================================== */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Review Queue</span>
                <span className="text-2xl font-bold text-amber-600 mt-1 block">
                  {stats?.queueCount ?? queue.length}
                </span>
                <span className="text-[10px] text-amber-700 mt-1 block">Awaiting broker inspection</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Assessed by Me</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">
                  {stats?.reviewedByMe ?? myReviews.length}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">Completed assessments</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Approved by Me</span>
                <span className="text-2xl font-bold text-emerald-600 mt-1 block">
                  {stats?.approvedByMe ?? 0}
                </span>
                <span className="text-[10px] text-emerald-700 mt-1 block">Active on platform</span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Rejected by Me</span>
                <span className="text-2xl font-bold text-red-600 mt-1 block">
                  {stats?.rejectedByMe ?? 0}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">Documentation issues</span>
              </div>

              <div className="bg-white border border-teal-200 rounded-2xl p-4 shadow-xs bg-teal-50/40">
                <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider block">My Submissions</span>
                <span className="text-2xl font-bold text-teal-700 mt-1 block">
                  {mySubmissions.length}
                </span>
                <span className="text-[10px] text-teal-600 mt-1 block">Registered on owner behalf</span>
              </div>
            </div>

            {/* Quick Action Banner */}
            <div className="bg-gradient-to-r from-teal-700 to-slate-900 text-white rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-teal-300" />
                  Broker-Assisted Property Registration
                </h3>
                <p className="text-xs text-teal-100/90 mt-1">
                  Onboard property owners directly, capture documented authorization, and record their exchange (Swap) or sale intent.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("register")}
                className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs transition-colors shrink-0 flex items-center gap-2 shadow-xs"
              >
                Register on Behalf of Owner
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Queue Quick View */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900">Properties Requiring Your Valuation Assessment</h3>
                </div>
                <button
                  onClick={() => setActiveTab("queue")}
                  className="text-xs font-bold text-teal-600 hover:text-teal-800"
                >
                  View Full Queue ({queue.length})
                </button>
              </div>

              {queue.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  All submitted properties have been reviewed. No pending items in queue.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {queue.slice(0, 4).map((l) => (
                    <div key={l.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                          <span className="font-mono">#{l.id}</span>
                          <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Awaiting Valuation
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{l.title || l.locality}</h4>
                        <div className="text-xs text-slate-500 mt-1">
                          {l.locality}, {l.district} • {l.area} {l.areaUnit}
                        </div>
                        <div className="text-xs font-semibold text-slate-700 mt-2">
                          Owner Declared: <strong className="text-slate-900">{formatCurrency(l.ownerDeclaredValue)}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                        <button
                          onClick={() => handleOpenReviewModal(l, "approve")}
                          className="flex-1 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors"
                        >
                          Assess with Comparables
                        </button>
                        <button
                          onClick={() => handleOpenReviewModal(l, "reject")}
                          className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-lg text-xs font-bold transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* REVIEW QUEUE TAB */}
        {/* ======================================================== */}
        {activeTab === "queue" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <h2 className="text-base font-bold text-slate-900">Broker Review & Valuation Queue</h2>
                <p className="text-xs text-slate-500">
                  Inspect submitted property records, examine automated comparable references, and enter manual valuations.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200">
                {queue.length} Pending
              </span>
            </div>

            {queue.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-400">
                Queue is empty. All listings have been reviewed.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {queue.map((l) => (
                  <div key={l.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                        <span className="font-mono font-bold">#{l.id}</span>
                        <div className="flex items-center gap-1.5">
                          {l.submittedByBrokerId && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200">
                              Broker Assisted
                            </span>
                          )}
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-bold">
                            Under Review
                          </span>
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{l.title || l.locality}</h3>
                      <div className="text-xs text-slate-500 mt-1">
                        {l.locality}, {l.district} • {l.area} {l.areaUnit}
                      </div>

                      <div className="mt-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                        <div className="flex justify-between text-slate-500">
                          <span>Owner:</span>
                          <span className="font-bold text-slate-800">{l.ownerName}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Declared Value:</span>
                          <span className="font-bold text-slate-800">{formatCurrency(l.ownerDeclaredValue)}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Intent:</span>
                          <span className="font-bold text-slate-800 uppercase">{l.intent || "SWAP"}</span>
                        </div>
                        {l.consentStatus && (
                          <div className="flex justify-between text-slate-500">
                            <span>Consent:</span>
                            <span className="font-medium text-slate-700">{l.consentStatus}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      <button
                        onClick={() => handleOpenReviewModal(l, "approve")}
                        className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Assess & Value
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* REGISTER ON BEHALF OF OWNER (WIZARD) */}
        {/* ======================================================== */}
        {activeTab === "register" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6 max-w-4xl mx-auto">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Register Property on Behalf of Owner</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Structured onboarding workflow for client properties with documented mandate & transaction intention.
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
                  <span className={`px-2.5 py-1 rounded-lg ${regStep === 1 ? "bg-white text-teal-700 shadow-xs" : ""}`}>1. Owner</span>
                  <span className={`px-2.5 py-1 rounded-lg ${regStep === 2 ? "bg-white text-teal-700 shadow-xs" : ""}`}>2. Property</span>
                  <span className={`px-2.5 py-1 rounded-lg ${regStep === 3 ? "bg-white text-teal-700 shadow-xs" : ""}`}>3. Intention</span>
                  <span className={`px-2.5 py-1 rounded-lg ${regStep === 4 ? "bg-white text-teal-700 shadow-xs" : ""}`}>4. Review</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleRegisterOnBehalfOfOwner}>
              {/* STEP 1: OWNER & CONSENT DETAILS */}
              {regStep === 1 && (
                <div className="space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900">Step 1: Property Owner Details & Authorization Mandate</h3>
                    <p className="text-xs text-slate-500">Provide the client's verified contact information and consent status.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Owner Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={ownerForm.name}
                        onChange={(e) => setOwnerForm({ ...ownerForm, name: e.target.value })}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Owner Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={ownerForm.phone}
                        onChange={(e) => setOwnerForm({ ...ownerForm, phone: e.target.value })}
                        placeholder="e.g. +91 98450 12345"
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Owner Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        value={ownerForm.email}
                        onChange={(e) => setOwnerForm({ ...ownerForm, email: e.target.value })}
                        placeholder="e.g. ramesh.kumar@example.com"
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        If existing owner matches phone/email, property will safely link to their profile.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Preferred Contact Method
                      </label>
                      <select
                        value={ownerForm.preferredContactMethod}
                        onChange={(e) => setOwnerForm({ ...ownerForm, preferredContactMethod: e.target.value as any })}
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none"
                      >
                        <option value="phone">Direct Phone Call</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="email">Email</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Owner Residence / Postal Address
                      </label>
                      <input
                        type="text"
                        value={ownerForm.address}
                        onChange={(e) => setOwnerForm({ ...ownerForm, address: e.target.value })}
                        placeholder="e.g. #14, 4th Main, Jayanagar 3rd Block, Bengaluru"
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Mandate & Consent Section */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-teal-600" />
                      Owner Authorization & Legal Consent
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Consent & Mandate Status <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={consentForm.status}
                          onChange={(e) => setConsentForm({ ...consentForm, status: e.target.value as ConsentStatus })}
                          className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white font-medium"
                        >
                          <option value="consent_provided">Signed Authorization / Mandate Letter on File</option>
                          <option value="verified_by_owner">Direct Physical / Verbal Verification Completed</option>
                          <option value="pending_consent">Awaiting Written Owner Authorization (Unapproved)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Mandate / Agreement Reference Number
                        </label>
                        <input
                          type="text"
                          value={consentForm.documentationRef}
                          onChange={(e) => setConsentForm({ ...consentForm, documentationRef: e.target.value })}
                          placeholder="e.g. MANDATE-2026-KAR-084"
                          className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white font-mono"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Broker Authorization Notes
                        </label>
                        <input
                          type="text"
                          value={consentForm.notes}
                          onChange={(e) => setConsentForm({ ...consentForm, notes: e.target.value })}
                          placeholder="e.g. Registered owner met at property site; physical title deed copies submitted."
                          className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      disabled={!ownerForm.name.trim() || !ownerForm.phone.trim()}
                      onClick={() => setRegStep(2)}
                      className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      Continue to Property Details
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: PROPERTY DETAILS */}
              {regStep === 2 && (
                <div className="space-y-5">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Step 2: Property Specifications & Characteristics</h3>
                      <p className="text-xs text-slate-500">Provide complete asset information, location, and owner valuation.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRegStep(1)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Property Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={propForm.title}
                        onChange={(e) => setPropForm({ ...propForm, title: e.target.value })}
                        placeholder="e.g. Prime Residential Corner Plot in Kanakapura Road"
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Property Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={propForm.propertyType}
                        onChange={(e) => setPropForm({ ...propForm, propertyType: e.target.value as PropertyType })}
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none font-semibold"
                      >
                        {PROPERTY_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        District <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={propForm.district}
                        onChange={(e) => setPropForm({ ...propForm, district: e.target.value })}
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none font-semibold"
                      >
                        {KARNATAKA_DISTRICTS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Locality / Area <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={propForm.locality}
                        onChange={(e) => setPropForm({ ...propForm, locality: e.target.value })}
                        placeholder="e.g. Jayanagar, Harohalli, Whitefield"
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Taluk / Municipality
                      </label>
                      <input
                        type="text"
                        value={propForm.taluk}
                        onChange={(e) => setPropForm({ ...propForm, taluk: e.target.value })}
                        placeholder="e.g. Bengaluru South, Kanakapura"
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Property Area <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={propForm.area}
                          onChange={(e) => setPropForm({ ...propForm, area: e.target.value })}
                          placeholder="e.g. 2400"
                          className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Unit <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={propForm.areaUnit}
                          onChange={(e) => setPropForm({ ...propForm, areaUnit: e.target.value as AreaUnit })}
                          className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none"
                        >
                          <option value="sq_ft">Square Feet (sq ft)</option>
                          <option value="guntas">Guntas</option>
                          <option value="acres">Acres</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Owner-Declared Value (₹ INR) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={100000}
                        value={propForm.ownerDeclaredValue}
                        onChange={(e) => setPropForm({ ...propForm, ownerDeclaredValue: e.target.value })}
                        placeholder="e.g. 15000000"
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none font-bold text-slate-900"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Estimated value: {formatCurrency(Number(propForm.ownerDeclaredValue) || 0)}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Khata / Title Type</label>
                      <select
                        value={propForm.khataType}
                        onChange={(e) => setPropForm({ ...propForm, khataType: e.target.value })}
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none"
                      >
                        <option value="A-Khata">A-Khata (Clear BBMP / BDA)</option>
                        <option value="E-Khata">E-Khata (Panchayat Electronic)</option>
                        <option value="B-Khata">B-Khata</option>
                        <option value="RTC/Pahani">RTC / Pahani (Agricultural Land)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Conversion Status</label>
                      <select
                        value={propForm.conversionStatus}
                        onChange={(e) => setPropForm({ ...propForm, conversionStatus: e.target.value })}
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none"
                      >
                        <option value="DC Converted">DC Converted (Residential / Commercial)</option>
                        <option value="BDA Approved">BDA Approved Layout</option>
                        <option value="BMRDA Approved">BMRDA Approved</option>
                        <option value="Agricultural">Agricultural Zone</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Detailed Description</label>
                      <textarea
                        rows={2}
                        value={propForm.description}
                        onChange={(e) => setPropForm({ ...propForm, description: e.target.value })}
                        placeholder="Highlight road access, water connection, orientation, landmarks..."
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setRegStep(1)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={!propForm.title.trim() || !propForm.area || !propForm.ownerDeclaredValue}
                      onClick={() => setRegStep(3)}
                      className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      Choose Transaction Intention
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: TRANSACTION INTENTION (SWAP VS SELL) */}
              {regStep === 3 && (
                <div className="space-y-5">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Step 3: Select Owner's Transaction Intention</h3>
                      <p className="text-xs text-slate-500">Does the property owner want to exchange (Swap) their property or sell it directly?</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRegStep(2)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                  </div>

                  {/* Dual Intention Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      onClick={() => setIntentChoice("swap")}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        intentChoice === "swap"
                          ? "bg-teal-50/60 border-teal-600 ring-2 ring-teal-600 shadow-xs"
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-teal-900 flex items-center gap-2">
                          <Layers className="w-4 h-4 text-teal-600" />
                          Option A: Exchange Property (Swap)
                        </span>
                        <input
                          type="radio"
                          name="intent"
                          checked={intentChoice === "swap"}
                          onChange={() => setIntentChoice("swap")}
                          className="text-teal-600"
                        />
                      </div>
                      <p className="text-xs text-slate-600 mt-2">
                        Owner seeks another real estate asset in return. Eligible for multi-party & direct swap algorithms post-review.
                      </p>
                    </div>

                    <div
                      onClick={() => setIntentChoice("sell")}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        intentChoice === "sell"
                          ? "bg-indigo-50/60 border-indigo-600 ring-2 ring-indigo-600 shadow-xs"
                          : "bg-white border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-indigo-900 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-indigo-600" />
                          Option B: Sell Property (Buy Marketplace)
                        </span>
                        <input
                          type="radio"
                          name="intent"
                          checked={intentChoice === "sell"}
                          onChange={() => setIntentChoice("sell")}
                          className="text-indigo-600"
                        />
                      </div>
                      <p className="text-xs text-slate-600 mt-2">
                        Owner wants cash liquidation. Will be listed directly on the Buy Property Marketplace after review.
                      </p>
                    </div>
                  </div>

                  {/* SWAP INTENT WORKFLOW */}
                  {intentChoice === "swap" ? (
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                      <div className="border-b border-slate-200 pb-2 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-teal-600" />
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Owner's Desired Exchange Preferences
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Desired Property Types in Return <span className="text-red-500">*</span>
                          </label>
                          <div className="space-y-1.5 bg-white p-3 rounded-xl border border-slate-200 max-h-36 overflow-y-auto">
                            {PROPERTY_TYPES.map((pt) => {
                              const checked = swapPrefs.desiredPropertyTypes.includes(pt.value);
                              return (
                                <label key={pt.value} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      const updated = checked
                                        ? swapPrefs.desiredPropertyTypes.filter((t) => t !== pt.value)
                                        : [...swapPrefs.desiredPropertyTypes, pt.value];
                                      setSwapPrefs({ ...swapPrefs, desiredPropertyTypes: updated });
                                    }}
                                    className="rounded text-teal-600"
                                  />
                                  <span>{pt.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Preferred District in Return
                            </label>
                            <select
                              value={swapPrefs.preferredDistricts[0] || propForm.district}
                              onChange={(e) => setSwapPrefs({ ...swapPrefs, preferredDistricts: [e.target.value] })}
                              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white"
                            >
                              {KARNATAKA_DISTRICTS.map((d) => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Preferred Locality (Optional)
                            </label>
                            <input
                              type="text"
                              value={swapPrefs.preferredLocalities}
                              onChange={(e) => setSwapPrefs({ ...swapPrefs, preferredLocalities: e.target.value })}
                              placeholder="e.g. Indiranagar, HSR Layout, Kuvempunagar"
                              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Min Desired Area</label>
                            <input
                              type="number"
                              value={swapPrefs.minArea}
                              onChange={(e) => setSwapPrefs({ ...swapPrefs, minArea: e.target.value })}
                              placeholder="e.g. 1500"
                              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Unit</label>
                            <select
                              value={swapPrefs.minAreaUnit}
                              onChange={(e) => setSwapPrefs({ ...swapPrefs, minAreaUnit: e.target.value as AreaUnit })}
                              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white"
                            >
                              <option value="sq_ft">sq ft</option>
                              <option value="guntas">guntas</option>
                              <option value="acres">acres</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Max Cash to Pay (Boot)</label>
                            <input
                              type="number"
                              value={swapPrefs.maxCashToPay}
                              onChange={(e) => setSwapPrefs({ ...swapPrefs, maxCashToPay: e.target.value })}
                              placeholder="e.g. 2000000"
                              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Max Cash to Receive</label>
                            <input
                              type="number"
                              value={swapPrefs.maxCashToReceive}
                              onChange={(e) => setSwapPrefs({ ...swapPrefs, maxCashToReceive: e.target.value })}
                              placeholder="e.g. 5000000"
                              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* SELL INTENT WORKFLOW */
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                      <div className="border-b border-slate-200 pb-2 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Owner's Sale Listing Terms
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Asking Sale Price (₹ INR) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            required
                            min={100000}
                            value={saleForm.askingPrice || propForm.ownerDeclaredValue}
                            onChange={(e) => setSaleForm({ ...saleForm, askingPrice: e.target.value })}
                            placeholder="e.g. 16500000"
                            className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white font-bold text-slate-900"
                          />
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            Displayed on Buy marketplace: {formatCurrency(Number(saleForm.askingPrice || propForm.ownerDeclaredValue) || 0)}
                          </span>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Price Flexibility</label>
                          <div className="flex items-center gap-4 mt-2">
                            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                              <input
                                type="radio"
                                name="negotiable"
                                checked={saleForm.isNegotiable}
                                onChange={() => setSaleForm({ ...saleForm, isNegotiable: true })}
                              />
                              <span>Negotiable</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                              <input
                                type="radio"
                                name="negotiable"
                                checked={!saleForm.isNegotiable}
                                onChange={() => setSaleForm({ ...saleForm, isNegotiable: false })}
                              />
                              <span>Fixed Price</span>
                            </label>
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Public Sale Remarks for Buyers
                          </label>
                          <textarea
                            rows={2}
                            value={saleForm.saleDescription}
                            onChange={(e) => setSaleForm({ ...saleForm, saleDescription: e.target.value })}
                            placeholder="e.g. Immediate registration possible. Clear title, single owner."
                            className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setRegStep(2)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegStep(4)}
                      className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      Review & Confirm
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: REVIEW & SUBMIT */}
              {regStep === 4 && (
                <div className="space-y-5">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Step 4: Review Registration Details</h3>
                      <p className="text-xs text-slate-500">Please review all data carefully before submitting on behalf of the owner.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRegStep(3)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Owner Card */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                      <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        Client / Owner Summary
                      </h4>
                      <div><strong className="text-slate-600">Full Name:</strong> {ownerForm.name}</div>
                      <div><strong className="text-slate-600">Phone:</strong> {ownerForm.phone}</div>
                      {ownerForm.email && <div><strong className="text-slate-600">Email:</strong> {ownerForm.email}</div>}
                      <div><strong className="text-slate-600">Mandate Status:</strong> <span className="font-semibold text-teal-800">{consentForm.status}</span></div>
                      {consentForm.documentationRef && (
                        <div><strong className="text-slate-600">Ref:</strong> <span className="font-mono">{consentForm.documentationRef}</span></div>
                      )}
                    </div>

                    {/* Property Card */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                      <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        Property Summary
                      </h4>
                      <div><strong className="text-slate-600">Title:</strong> {propForm.title}</div>
                      <div><strong className="text-slate-600">Type:</strong> {propForm.propertyType}</div>
                      <div><strong className="text-slate-600">Location:</strong> {propForm.locality}, {propForm.district}</div>
                      <div><strong className="text-slate-600">Area:</strong> {propForm.area} {propForm.areaUnit}</div>
                      <div><strong className="text-slate-600">Declared Value:</strong> {formatCurrency(Number(propForm.ownerDeclaredValue) || 0)}</div>
                    </div>

                    {/* Transaction Intention Card */}
                    <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
                      <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-slate-500" />
                        Transaction Intention: <span className="uppercase text-teal-800">{intentChoice}</span>
                      </h4>
                      {intentChoice === "swap" ? (
                        <div>
                          <div><strong className="text-slate-600">Desired Types:</strong> {swapPrefs.desiredPropertyTypes.join(", ")}</div>
                          <div><strong className="text-slate-600">Preferred Districts:</strong> {swapPrefs.preferredDistricts.join(", ")}</div>
                        </div>
                      ) : (
                        <div>
                          <div><strong className="text-slate-600">Asking Price:</strong> {formatCurrency(Number(saleForm.askingPrice || propForm.ownerDeclaredValue) || 0)}</div>
                          <div><strong className="text-slate-600">Terms:</strong> {saleForm.isNegotiable ? "Negotiable" : "Fixed Price"}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                    <span>
                      <strong>Broker Notice:</strong> By submitting, you confirm that you have documented mandate/authorization from the owner. This listing will enter the verification queue. Per governance policy, you cannot approve your own submission.
                    </span>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setRegStep(3)}
                      className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingReg}
                      className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-xs"
                    >
                      {isSubmittingReg ? "Submitting..." : "Submit Registration"}
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* MY SUBMITTED PROPERTIES TAB */}
        {/* ======================================================== */}
        {activeTab === "submissions" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <h2 className="text-base font-bold text-slate-900">My Submitted Client Properties</h2>
                <p className="text-xs text-slate-500">
                  Track properties you registered on behalf of clients, view authorization status, and monitor review progress.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("register")}
                className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                New Registration
              </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex flex-wrap items-center gap-3 text-xs">
              <span className="font-bold text-slate-500 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filters:
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Intent:</span>
                <select
                  value={submissionFilterIntent}
                  onChange={(e) => setSubmissionFilterIntent(e.target.value)}
                  className="p-1.5 border border-slate-200 rounded-lg bg-slate-50 text-xs"
                >
                  <option value="all">All Intentions</option>
                  <option value="swap">Swap / Exchange Only</option>
                  <option value="sell">Direct Sale Only</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400">Review Status:</span>
                <select
                  value={submissionFilterStatus}
                  onChange={(e) => setSubmissionFilterStatus(e.target.value)}
                  className="p-1.5 border border-slate-200 rounded-lg bg-slate-50 text-xs"
                >
                  <option value="all">All Statuses</option>
                  <option value="submitted">Submitted (Under Review)</option>
                  <option value="reviewed">Approved & Active</option>
                  <option value="rejected">Needs Revision / Rejected</option>
                </select>
              </div>

              <span className="ml-auto text-slate-400 font-medium">
                Showing {filteredSubmissions.length} of {mySubmissions.length}
              </span>
            </div>

            {filteredSubmissions.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-400">
                No submitted properties match your filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSubmissions.map((s) => (
                  <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                        <span className="font-mono font-bold">#{s.id}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            s.intent === "sell" ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-teal-50 text-teal-700 border border-teal-200"
                          }`}>
                            {s.intent || "SWAP"}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.status === "reviewed" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                            s.status === "rejected" ? "bg-red-50 text-red-700 border border-red-200" :
                            "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {s.status}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{s.title || s.locality}</h3>
                      <div className="text-xs text-slate-500 mt-1">
                        {s.locality}, {s.district} • {s.area} {s.areaUnit}
                      </div>

                      <div className="mt-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                        <div className="flex justify-between text-slate-500">
                          <span>Owner:</span>
                          <span className="font-bold text-slate-800">{s.ownerName}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Declared Value:</span>
                          <span className="font-bold text-slate-800">{formatCurrency(s.ownerDeclaredValue)}</span>
                        </div>
                        {s.reviewedValue && (
                          <div className="flex justify-between text-slate-500">
                            <span>Reviewed Value:</span>
                            <span className="font-bold text-emerald-700">{formatCurrency(s.reviewedValue)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-500">
                          <span>Mandate:</span>
                          <span className="font-medium text-slate-700">{s.consentStatus || "consent_provided"}</span>
                        </div>
                      </div>

                      {s.rejectionReason && (
                        <div className="p-2 bg-red-50 text-red-700 border border-red-200 rounded-lg text-[11px] mt-2">
                          <strong>Rejection:</strong> {s.rejectionReason}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                      <span>Submitted: {new Date(s.metadata?.createdAt as string || Date.now()).toLocaleDateString()}</span>
                      <button
                        onClick={() => setInspectSubmission(s)}
                        className="text-teal-600 hover:text-teal-800 font-bold"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* MY REVIEWS TAB */}
        {/* ======================================================== */}
        {activeTab === "reviews" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">My Completed Valuation Reviews</h2>
              <p className="text-xs text-slate-500">Historical log of properties evaluated under your broker license.</p>
            </div>

            {myReviews.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                You have not completed any reviews yet. Properties you evaluate will appear here.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                {myReviews.map((r) => (
                  <div key={r.reviewId} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{r.title}</span>
                        <span className="font-mono text-[10px] text-slate-400">#{r.listingId}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            r.action === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {r.action}
                        </span>
                      </div>
                      <div className="text-slate-500 mt-1">
                        Owner: {r.ownerName} • Declared: {formatCurrency(r.ownerDeclaredValue)} • Reviewed: <strong className="text-slate-800">{formatCurrency(r.reviewedValue)}</strong>
                      </div>
                      {r.internalNotes && (
                        <div className="text-[11px] text-slate-400 italic mt-0.5">Notes: {r.internalNotes}</div>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono sm:text-right">
                      {new Date(r.reviewDate).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* PROFILE TAB */}
        {/* ======================================================== */}
        {activeTab === "profile" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs max-w-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Broker Professional Profile</h3>
            <div className="text-xs space-y-2.5 text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div><strong className="text-slate-800">Broker Name:</strong> {currentUser?.name}</div>
              <div><strong className="text-slate-800">Email:</strong> {currentUser?.email}</div>
              <div><strong className="text-slate-800">Agency / Firm:</strong> {currentUser?.agency || "Karnataka Valuation Partners"}</div>
              <div><strong className="text-slate-800">License Number:</strong> <span className="font-mono font-bold text-slate-900">{currentUser?.licenseNumber || "KAR-REV-2018-0912"}</span></div>
              <div><strong className="text-slate-800">Operating Jurisdiction:</strong> {currentUser?.jurisdiction || "Bengaluru, Ramanagara, Mysuru"}</div>
              <div><strong className="text-slate-800">Experience:</strong> {currentUser?.experienceYears || 10} Years</div>
              <div><strong className="text-slate-800">Status:</strong> <span className="text-emerald-700 font-bold">Active & Verified</span></div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* REVIEW & VALUATION MODAL WITH COMPARABLE REFERENCES */}
      {/* ======================================================== */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Broker Valuation Assessment & Comparables</h3>
                <span className="text-xs text-slate-500 font-mono">Asset #{selectedListing.id} • {selectedListing.locality}, {selectedListing.district}</span>
              </div>
              <button onClick={() => setSelectedListing(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {/* Self-Review Prohibition Notice */}
            {isOwnSubmission && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <div>
                  <strong>Self-Review Prohibited:</strong> You registered this property on behalf of the owner. Under platform governance, an independent broker or administrator must review this property.
                </div>
              </div>
            )}

            {/* Pending Consent Warning */}
            {isPendingConsent && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <strong>Owner Authorization Pending:</strong> The owner's consent or mandate has not been verified yet. Property cannot be approved until documented authorization is provided.
                </div>
              </div>
            )}

            {/* Property Image Gallery */}
            <PropertyImageGallery
              images={selectedListing.images || (selectedListing.metadata?.images as string[]) || (selectedListing.imageUrl ? [selectedListing.imageUrl] : [])}
              propertyType={selectedListing.propertyType}
              title={selectedListing.title || selectedListing.locality}
              aspectRatio="wide"
            />

            {/* Assessed Property Stats */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-900">{selectedListing.title || selectedListing.locality}</div>
              <div className="text-slate-500">
                {selectedListing.propertyType.replace("_", " ").toUpperCase()} • {selectedListing.locality}, {selectedListing.district} • {selectedListing.area} {selectedListing.areaUnit}
              </div>
              <div className="text-slate-700">
                Owner Declared Value: <strong>{formatCurrency(selectedListing.ownerDeclaredValue)}</strong>
              </div>
            </div>

            {/* COMPARABLE PROPERTIES SECTION */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Suggested Comparable Properties (Valuation References)
                  </h4>
                </div>
                <span className="text-[11px] font-semibold text-slate-500">
                  {selectedComparableIds.length} Selected
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Reference properties matching {selectedListing.propertyType.replace("_", " ")} in {selectedListing.locality} or nearby areas. Valuation remains a manual broker decision.
              </p>

              {loadingComparables ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading comparable reference data...</div>
              ) : comparablesData?.hasInsufficientData || comparablesData?.comparables.length === 0 ? (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-800">
                  {comparablesData?.message || "Insufficient comparable property data available for this location."}
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {comparablesData?.comparables.map((comp) => {
                    const isSelected = selectedComparableIds.includes(comp.id);
                    return (
                      <div
                        key={comp.id}
                        onClick={() => toggleComparableSelection(comp.id)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-teal-50 border-teal-500 ring-1 ring-teal-500"
                            : "bg-white border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{comp.title}</span>
                            <span className="font-mono text-[10px] text-slate-400">#{comp.id}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              comp.referenceType === "verified_broker_valuation"
                                ? "bg-emerald-100 text-emerald-800"
                                : comp.referenceType === "market_asking_price"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-100 text-slate-700"
                            }`}>
                              {comp.referenceType === "verified_broker_valuation"
                                ? "Broker-Reviewed"
                                : comp.referenceType === "market_asking_price"
                                ? "Market Asking"
                                : "Owner-Declared"}
                            </span>
                          </div>
                          <div className="text-slate-500 text-[11px]">
                            {comp.locality}, {comp.district} • {comp.area} {comp.areaUnit} • {comp.proximityLabel}
                          </div>
                          <div className="text-slate-700 font-semibold text-[11px]">
                            Valuation: <strong className="text-slate-900">{formatCurrency(comp.referenceValuation)}</strong>
                            {" "}(~₹{comp.ratePerSqFt.toLocaleString()}/sq ft)
                          </div>
                        </div>

                        <div className="shrink-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-teal-600 w-4 h-4"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActionType("approve")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                  actionType === "approve"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                Approve with Valuation
              </button>
              <button
                type="button"
                onClick={() => setActionType("reject")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                  actionType === "reject"
                    ? "bg-red-600 text-white border-red-600 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                Reject Listing
              </button>
            </div>

            {actionType === "approve" ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Broker-Assessed Property Valuation (₹ INR)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={reviewedValuation}
                    onChange={(e) => setReviewedValuation(e.target.value)}
                    placeholder="e.g. 20000000"
                    className="w-full text-sm font-bold text-slate-900 p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Formally assessed: <strong className="text-slate-800">{formatCurrency(Number(reviewedValuation) || 0)}</strong>
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Broker Valuation Rationale & Field Notes
                  </label>
                  <textarea
                    rows={2}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Specify prevailing sub-registrar rates and comparable references used..."
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mandatory Rejection Reason
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain discrepancy or missing documentation..."
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedListing(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingReview || (actionType === "approve" && (isOwnSubmission || isPendingConsent))}
                onClick={handleSubmitReview}
                className={`px-5 py-2 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 ${
                  actionType === "approve" ? "bg-teal-600 hover:bg-teal-700" : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {submittingReview ? "Saving..." : actionType === "approve" ? "Confirm & Approve" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SUBMISSION DETAILS MODAL */}
      {/* ======================================================== */}
      {inspectSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Submitted Property Overview</h3>
                <span className="text-xs text-slate-500 font-mono">Asset #{inspectSubmission.id}</span>
              </div>
              <button onClick={() => setInspectSubmission(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="text-xs space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div><strong className="text-slate-800">Property Title:</strong> {inspectSubmission.title}</div>
              <div><strong className="text-slate-800">Property Type:</strong> {inspectSubmission.propertyType}</div>
              <div><strong className="text-slate-800">Location:</strong> {inspectSubmission.locality}, {inspectSubmission.district}</div>
              <div><strong className="text-slate-800">Area:</strong> {inspectSubmission.area} {inspectSubmission.areaUnit}</div>
              <div><strong className="text-slate-800">Owner Name:</strong> {inspectSubmission.ownerName}</div>
              <div><strong className="text-slate-800">Owner Phone:</strong> {inspectSubmission.ownerPhone || "On file"}</div>
              {inspectSubmission.ownerEmail && (
                <div><strong className="text-slate-800">Owner Email:</strong> {inspectSubmission.ownerEmail}</div>
              )}
              <div><strong className="text-slate-800">Transaction Intention:</strong> <span className="uppercase font-bold text-teal-800">{inspectSubmission.intent || "SWAP"}</span></div>
              <div><strong className="text-slate-800">Consent Status:</strong> <span className="font-semibold">{inspectSubmission.consentStatus || "consent_provided"}</span></div>
              {inspectSubmission.consentDocumentationRef && (
                <div><strong className="text-slate-800">Mandate Ref:</strong> <span className="font-mono">{inspectSubmission.consentDocumentationRef}</span></div>
              )}
              <div><strong className="text-slate-800">Owner Declared Value:</strong> {formatCurrency(inspectSubmission.ownerDeclaredValue)}</div>
              {inspectSubmission.reviewedValue && (
                <div><strong className="text-slate-800">Reviewed Value:</strong> {formatCurrency(inspectSubmission.reviewedValue)}</div>
              )}
              <div><strong className="text-slate-800">Review Status:</strong> <span className="font-bold">{inspectSubmission.status}</span></div>
              {inspectSubmission.rejectionReason && (
                <div className="text-red-700"><strong>Rejection Reason:</strong> {inspectSubmission.rejectionReason}</div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectSubmission(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
