import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  Building2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Tag,
  MapPin,
  Maximize2,
  AlertCircle,
  ArrowLeftRight,
  ShoppingBag,
  BedDouble,
  Bath,
  Coins
} from "lucide-react";
import { api } from "../api.js";
import { useUser } from "../context/UserContext.js";
import { BackButton } from "../components/BackButton.js";
import type { PropertyType, AreaUnit, ListingIntent } from "../types.js";
import { formatCurrency } from "../components/PropertyCard.js";
import { getPropertyImages, getPropertyTypeFallback } from "../../propertyImages.js";

const DISTRICTS = [
  "Bengaluru",
  "Ramanagara",
  "Mysuru",
  "Mandya",
  "Tumakuru",
  "Chikkaballapur"
];

const PROPERTY_TYPES: Array<{ id: PropertyType; label: string; isResidential: boolean }> = [
  { id: "apartment", label: "Apartment / Flat", isResidential: true },
  { id: "independent_house", label: "Independent House / Villa", isResidential: true },
  { id: "plot_site", label: "Residential Plot / Site", isResidential: false },
  { id: "agricultural_land", label: "Agricultural Land", isResidential: false },
  { id: "farmhouse", label: "Farmhouse / Estate", isResidential: true },
  { id: "commercial", label: "Commercial Building / Shop", isResidential: false }
];

export const RegisterPropertyPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialIntent = (searchParams.get("intent") as ListingIntent) || "swap";

  const { currentUser } = useUser();

  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  // Intent: Swap, Sell, or Both
  const [intent, setIntent] = useState<ListingIntent>(initialIntent);

  // SECTION A: PROPERTY CURRENTLY OWNED
  const [ownedData, setOwnedData] = useState({
    title: "",
    propertyType: "apartment" as PropertyType,
    state: "Karnataka",
    district: "Bengaluru",
    taluk: "",
    locality: "",
    pincode: "",
    approxValue: "",
    area: "",
    areaUnit: "sq_ft" as AreaUnit,
    bedrooms: "3",
    bathrooms: "2",
    khataType: "A-Khata",
    surveyNumber: "",
    conversionStatus: "DC Converted",
    description: "",
    imageUrl: ""
  });

  // SECTION B: PROPERTY THE OWNER WANTS (Exchange Preferences)
  const [wantedData, setWantedData] = useState({
    desiredPropertyTypes: ["independent_house", "plot_site"] as PropertyType[],
    preferredState: "Karnataka",
    preferredDistricts: ["Bengaluru", "Ramanagara"],
    preferredLocalities: "Whitefield, Indiranagar, Kanakapura Road",
    minArea: "",
    minAreaUnit: "sq_ft" as AreaUnit,
    minValue: "",
    maxValue: "",
    openToCashAdjustment: true,
    maxCashToPay: "2000000",
    maxCashToReceive: "2000000",
    additionalPreferences: ""
  });

  // SECTION C: SALE DETAILS (when intent is 'sell' or 'both')
  const [saleData, setSaleData] = useState({
    askingPrice: "",
    saleDescription: ""
  });

  const updateOwned = (field: string, value: unknown) => {
    setOwnedData((prev) => ({ ...prev, [field]: value }));
  };

  const updateWanted = (field: string, value: unknown) => {
    setWantedData((prev) => ({ ...prev, [field]: value }));
  };

  const updateSale = (field: string, value: unknown) => {
    setSaleData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleDesiredType = (type: PropertyType) => {
    setWantedData((prev) => {
      const exists = prev.desiredPropertyTypes.includes(type);
      const updated = exists
        ? prev.desiredPropertyTypes.filter((t) => t !== type)
        : [...prev.desiredPropertyTypes, type];
      return { ...prev, desiredPropertyTypes: updated };
    });
  };

  const currentTypeMeta = PROPERTY_TYPES.find((t) => t.id === ownedData.propertyType);
  const isResidential = currentTypeMeta?.isResidential ?? false;

  const validateStep = (currentStep: number): boolean => {
    setError(null);

    if (currentStep === 1) {
      // Intent selection always valid
      return true;
    }

    if (currentStep === 2) {
      // Validate Section A: Property Owned
      if (!ownedData.title.trim()) {
        setError("Please enter a property title.");
        return false;
      }
      if (!ownedData.locality.trim()) {
        setError("Please enter the locality or area name.");
        return false;
      }
      const areaNum = Number(ownedData.area);
      if (!areaNum || areaNum <= 0) {
        setError("Please enter a valid positive area.");
        return false;
      }
      const valNum = Number(ownedData.approxValue);
      if (!valNum || valNum <= 0) {
        setError("Please enter an approximate market value.");
        return false;
      }
      return true;
    }

    if (currentStep === 3) {
      // Validate Section B: Property Wanted (if intent is swap or both)
      if (intent === "swap" || intent === "both") {
        if (wantedData.desiredPropertyTypes.length === 0) {
          setError("Please select at least one desired property type you want in exchange.");
          return false;
        }
      }

      // If intent is 'sell' or 'both', validate asking price
      if (intent === "sell" || intent === "both") {
        const askNum = Number(saleData.askingPrice || ownedData.approxValue);
        if (!askNum || askNum <= 0) {
          setError("Please enter a valid asking price for sale.");
          return false;
        }
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setError(null);
    setStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        title: ownedData.title.trim(),
        propertyType: ownedData.propertyType,
        district: ownedData.district,
        taluk: ownedData.taluk || undefined,
        locality: ownedData.locality.trim(),
        pincode: ownedData.pincode || "560001",
        area: Number(ownedData.area),
        areaUnit: ownedData.areaUnit,
        ownerDeclaredValue: Number(ownedData.approxValue),
        khataType: ownedData.khataType,
        surveyNumber: ownedData.surveyNumber || undefined,
        conversionStatus: ownedData.conversionStatus,
        description: ownedData.description.trim() || undefined,
        imageUrl: ownedData.imageUrl.trim() || undefined,
        intent,
        askingPrice: (intent === "sell" || intent === "both")
          ? Number(saleData.askingPrice || ownedData.approxValue)
          : undefined,
        saleDescription: (intent === "sell" || intent === "both")
          ? (saleData.saleDescription.trim() || undefined)
          : undefined,
        bedrooms: isResidential && ownedData.bedrooms ? Number(ownedData.bedrooms) : undefined,
        bathrooms: isResidential && ownedData.bathrooms ? Number(ownedData.bathrooms) : undefined,
        wants: (intent === "swap" || intent === "both") ? {
          propertyTypes: wantedData.desiredPropertyTypes,
          preferredDistricts: wantedData.preferredDistricts,
          preferredLocations: wantedData.preferredLocalities
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          minArea: wantedData.minArea ? Number(wantedData.minArea) : undefined,
          minAreaUnit: wantedData.minAreaUnit,
          minValue: wantedData.minValue ? Number(wantedData.minValue) : undefined,
          maxValue: wantedData.maxValue ? Number(wantedData.maxValue) : undefined,
          openToCashAdjustment: wantedData.openToCashAdjustment,
          maxCashToPay: wantedData.maxCashToPay ? Number(wantedData.maxCashToPay) : undefined,
          maxCashToReceive: wantedData.maxCashToReceive ? Number(wantedData.maxCashToReceive) : undefined
        } : {
          propertyTypes: [],
          preferredDistricts: [],
          preferredLocations: []
        }
      };

      const result = await api.createListing(payload);
      setSuccessId(result.id);
    } catch (err: any) {
      setError(err?.message || "Failed to register property.");
    } finally {
      setSubmitting(false);
    }
  };

  if (successId) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs space-y-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Property Successfully Registered</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Your property <strong>{ownedData.title}</strong> has been assigned ID{" "}
            <span className="font-mono font-bold text-blue-600">{successId}</span> and queued for physical broker inspection and certified valuation.
          </p>

          <div className="pt-4 flex items-center justify-center gap-3">
            <Link
              to="/owner/dashboard"
              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs"
            >
              Return to Owner Dashboard
            </Link>
            {intent !== "sell" && (
              <Link
                to="/swap"
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
              >
                Explore Swap Matches
              </Link>
            )}
            {intent !== "swap" && (
              <Link
                to="/sell"
                className="px-5 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors shadow-xs"
              >
                View Sell Portfolio
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <div>
        <BackButton defaultPath="/my-properties" label="Back to My Properties" />
      </div>

      {/* Step Indicator */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
              Step {step} of 4
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              {step === 1 && "Choose Transaction Intent"}
              {step === 2 && "Section A: Property You Currently Own"}
              {step === 3 && (intent === "sell" ? "Section B: Sale Terms & Asking Price" : "Section B: Property You Want (Exchange Preferences)")}
              {step === 4 && "Review & Submit for Verification"}
            </h1>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            {step === 1 && "Intent"}
            {step === 2 && "Property Owned"}
            {step === 3 && (intent === "sell" ? "Sale Terms" : "Property Wanted")}
            {step === 4 && "Review"}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: TRANSACTION INTENT */}
      {step === 1 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">What is your intention for this property?</h2>
            <p className="text-xs text-slate-500 mt-1">
              Select how you would like to participate on Asset Swap. You are not forced to swap if you only wish to sell.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Swap Only */}
            <div
              onClick={() => setIntent("swap")}
              className={`border-2 rounded-2xl p-5 cursor-pointer transition-all flex flex-col justify-between ${
                intent === "swap"
                  ? "border-blue-600 bg-blue-50/50 shadow-xs"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Swap Only</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Participate exclusively in 2-party and 3-party circular asset swaps. Cash is used only for valuation differences (Cash Boot).
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-blue-600">
                Collects Owned & Desired Properties
              </div>
            </div>

            {/* Sell Only */}
            <div
              onClick={() => setIntent("sell")}
              className={`border-2 rounded-2xl p-5 cursor-pointer transition-all flex flex-col justify-between ${
                intent === "sell"
                  ? "border-amber-600 bg-amber-50/50 shadow-xs"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Sell Only</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    List your property for outright cash sale. Do not participate in asset swapping or circular exchange matching.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-amber-600">
                Collects Owned Property & Asking Price
              </div>
            </div>

            {/* Both Swap & Sell */}
            <div
              onClick={() => setIntent("both")}
              className={`border-2 rounded-2xl p-5 cursor-pointer transition-all flex flex-col justify-between ${
                intent === "both"
                  ? "border-emerald-600 bg-emerald-50/50 shadow-xs"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Both Swap & Sell</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Maximum flexibility. Allow circular swap matches while simultaneously listing the property for outright purchase.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-bold text-emerald-600">
                Collects Owned, Desired & Sale Terms
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: SECTION A - PROPERTY CURRENTLY OWNED */}
      {step === 2 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
              Section A: Owned Asset
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-1">Details of Property You Currently Own</h2>
            <p className="text-xs text-slate-500">
              Enter accurate details for physical broker verification and market valuation assessment.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Property Title *
              </label>
              <input
                type="text"
                required
                value={ownedData.title}
                onChange={(e) => updateOwned("title", e.target.value)}
                placeholder="e.g. 3 BHK Luxury Apartment in Whitefield, Bengaluru"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Property Type *
                </label>
                <select
                  value={ownedData.propertyType}
                  onChange={(e) => updateOwned("propertyType", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Approximate Market Value (₹ INR) *
                </label>
                <input
                  type="number"
                  required
                  value={ownedData.approxValue}
                  onChange={(e) => updateOwned("approxValue", e.target.value)}
                  placeholder="e.g. 12000000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Area & Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Property Area *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={ownedData.area}
                  onChange={(e) => updateOwned("area", e.target.value)}
                  placeholder="e.g. 1850"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Measurement Unit *
                </label>
                <select
                  value={ownedData.areaUnit}
                  onChange={(e) => updateOwned("areaUnit", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="sq_ft">Square Feet (sq ft)</option>
                  <option value="guntas">Guntas</option>
                  <option value="acres">Acres</option>
                </select>
              </div>
            </div>

            {/* Conditional Bedrooms and Bathrooms ONLY for residential */}
            {isResidential && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <div>
                  <label className="block text-xs font-bold text-blue-900 uppercase mb-1">
                    Bedrooms
                  </label>
                  <select
                    value={ownedData.bedrooms}
                    onChange={(e) => updateOwned("bedrooms", e.target.value)}
                    className="w-full px-3 py-1.5 border border-blue-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="1">1 BHK</option>
                    <option value="2">2 BHK</option>
                    <option value="3">3 BHK</option>
                    <option value="4">4 BHK</option>
                    <option value="5">5+ BHK</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-900 uppercase mb-1">
                    Bathrooms
                  </label>
                  <select
                    value={ownedData.bathrooms}
                    onChange={(e) => updateOwned("bathrooms", e.target.value)}
                    className="w-full px-3 py-1.5 border border-blue-200 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="1">1 Bathroom</option>
                    <option value="2">2 Bathrooms</option>
                    <option value="3">3 Bathrooms</option>
                    <option value="4">4+ Bathrooms</option>
                  </select>
                </div>
              </div>
            )}

            {/* Location Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  District *
                </label>
                <select
                  value={ownedData.district}
                  onChange={(e) => updateOwned("district", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Locality / Area *
                </label>
                <input
                  type="text"
                  required
                  value={ownedData.locality}
                  onChange={(e) => updateOwned("locality", e.target.value)}
                  placeholder="e.g. Whitefield, Indiranagar"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  PIN Code
                </label>
                <input
                  type="text"
                  value={ownedData.pincode}
                  onChange={(e) => updateOwned("pincode", e.target.value)}
                  placeholder="e.g. 560066"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Ownership & Document Verification Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Khata Type
                </label>
                <select
                  value={ownedData.khataType}
                  onChange={(e) => updateOwned("khataType", e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="A-Khata">A-Khata (Bruhat Bengaluru)</option>
                  <option value="B-Khata">B-Khata</option>
                  <option value="E-Khata">E-Khata (Gram Panchayat)</option>
                  <option value="Pahani / RTC">Pahani / RTC (Agricultural)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Survey Number
                </label>
                <input
                  type="text"
                  value={ownedData.surveyNumber}
                  onChange={(e) => updateOwned("surveyNumber", e.target.value)}
                  placeholder="e.g. Sy. No. 142/2"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Conversion Status
                </label>
                <select
                  value={ownedData.conversionStatus}
                  onChange={(e) => updateOwned("conversionStatus", e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="DC Converted">DC Converted (Residential)</option>
                  <option value="BDA Approved">BDA Approved</option>
                  <option value="BMRDA Approved">BMRDA Approved</option>
                  <option value="Agricultural">Agricultural (Green Belt)</option>
                  <option value="Commercial Converted">Commercial Converted</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Property Description
              </label>
              <textarea
                rows={2}
                value={ownedData.description}
                onChange={(e) => updateOwned("description", e.target.value)}
                placeholder="Key highlights, road width, facing direction, physical condition..."
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Property Photo Gallery & Imagery */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Property Photos & Imagery (Curated by Type)
              </label>
              <p className="text-[11px] text-slate-500">
                A category-relevant photo gallery matching <strong className="capitalize">{ownedData.propertyType.replace(/_/g, " ")}</strong> is automatically selected. You may choose a featured thumbnail or provide a custom image URL.
              </p>
              <div className="grid grid-cols-4 gap-2 pt-1">
                {getPropertyImages(ownedData.propertyType, 0).map((imgUrl, idx) => {
                  const isSelected = ownedData.imageUrl === imgUrl || (!ownedData.imageUrl && idx === 0);
                  return (
                    <div
                      key={idx}
                      onClick={() => updateOwned("imageUrl", imgUrl)}
                      className={`relative h-20 rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                        isSelected
                          ? "border-blue-600 ring-2 ring-blue-500/30 scale-102"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={imgUrl} alt="Sample" className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute top-1 right-1 bg-blue-600 text-white rounded-full p-0.5 shadow-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="pt-2">
                <input
                  type="url"
                  value={ownedData.imageUrl}
                  onChange={(e) => updateOwned("imageUrl", e.target.value)}
                  placeholder="Or paste a custom image URL (optional)"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SECTION B - PROPERTY WANTED (EXCHANGE PREFERENCES) OR SALE TERMS */}
      {step === 3 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          {intent === "sell" ? (
            /* Sell only: Collect Asking Price & Sale Terms */
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                  Section B: Sale Terms
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">Sale Details & Asking Price</h2>
                <p className="text-xs text-slate-500">
                  Specify your desired sale terms for outright cash purchase by vetted buyers.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Asking Price (₹ INR) *
                </label>
                <input
                  type="number"
                  required
                  value={saleData.askingPrice || ownedData.approxValue}
                  onChange={(e) => updateSale("askingPrice", e.target.value)}
                  placeholder="e.g. 12500000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Sale Description / Terms
                </label>
                <textarea
                  rows={3}
                  value={saleData.saleDescription}
                  onChange={(e) => updateSale("saleDescription", e.target.value)}
                  placeholder="e.g. Clear marketable title, all tax receipts up to date, negotiable on upfront payment..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>
            </div>
          ) : (
            /* Swap or Both: Collect Exchange Preferences (Property Wanted) */
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800">
                  Section B: Desired Exchange Preferences
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">What Property Do You Want in Exchange?</h2>
                <p className="text-xs text-slate-500">
                  The matching engine compares what you own with what other owners want. Express flexible preferences.
                </p>
              </div>

              {/* Desired Property Types (Multi-select) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Acceptable Property Types in Exchange *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {PROPERTY_TYPES.map((t) => {
                    const isSelected = wantedData.desiredPropertyTypes.includes(t.id);
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => handleToggleDesiredType(t.id)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                          isSelected
                            ? "bg-blue-50 border-blue-600 text-blue-900 shadow-xs"
                            : "border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{t.label}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preferred Locations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Preferred Localities / Areas
                  </label>
                  <input
                    type="text"
                    value={wantedData.preferredLocalities}
                    onChange={(e) => updateWanted("preferredLocalities", e.target.value)}
                    placeholder="Comma separated: Indiranagar, Whitefield, Mysuru"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Minimum Preferred Area (sq ft)
                  </label>
                  <input
                    type="number"
                    value={wantedData.minArea}
                    onChange={(e) => updateWanted("minArea", e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Cash Boot Preferences */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900">Cash Boot Adjustment Flexibility</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={wantedData.openToCashAdjustment}
                      onChange={(e) => updateWanted("openToCashAdjustment", e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Open to Cash Boot Balance</span>
                  </label>
                </div>

                {wantedData.openToCashAdjustment && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Max Cash Willing to Pay (₹)
                      </label>
                      <input
                        type="number"
                        value={wantedData.maxCashToPay}
                        onChange={(e) => updateWanted("maxCashToPay", e.target.value)}
                        placeholder="e.g. 2000000"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                        Max Cash Willing to Receive (₹)
                      </label>
                      <input
                        type="number"
                        value={wantedData.maxCashToReceive}
                        onChange={(e) => updateWanted("maxCashToReceive", e.target.value)}
                        placeholder="e.g. 2000000"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* If intent is 'both', also ask for asking price */}
              {intent === "both" && (
                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 space-y-2">
                  <span className="text-xs font-bold text-amber-900 block">Outright Sale Terms (Since 'Both' Selected):</span>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Asking Price for Cash Purchase (₹ INR)
                    </label>
                    <input
                      type="number"
                      value={saleData.askingPrice || ownedData.approxValue}
                      onChange={(e) => updateSale("askingPrice", e.target.value)}
                      placeholder="e.g. 12000000"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* STEP 4: REVIEW & SUBMIT */}
      {step === 4 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Review Registration Details</h2>
            <p className="text-xs text-slate-500">
              Verify your owned property and desired exchange terms before submitting for broker review.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Section A Summary */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-2.5 bg-slate-50/50 text-xs">
              <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-blue-100 text-blue-800">
                Property You Own
              </span>
              <h4 className="font-bold text-slate-900 text-sm">{ownedData.title}</h4>
              <div className="space-y-1 text-slate-600">
                <div>Type: <strong>{ownedData.propertyType.replace("_", " ")}</strong></div>
                <div>Location: <strong>{ownedData.locality}, {ownedData.district}</strong></div>
                <div>Area: <strong>{ownedData.area} {ownedData.areaUnit}</strong></div>
                {isResidential && <div>Specs: <strong>{ownedData.bedrooms} BHK, {ownedData.bathrooms} Baths</strong></div>}
                <div>Declared Value: <strong>{formatCurrency(Number(ownedData.approxValue))}</strong></div>
                <div>Khata: <strong>{ownedData.khataType}</strong></div>
              </div>
            </div>

            {/* Section B / Intent Summary */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-2.5 bg-slate-50/50 text-xs">
              <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-emerald-100 text-emerald-800">
                Configured Intent: {intent.toUpperCase()}
              </span>

              {intent !== "sell" ? (
                <div className="space-y-1 text-slate-600">
                  <span className="font-bold text-slate-900 block text-xs">What You Want in Exchange:</span>
                  <div>Acceptable Types: <strong>{wantedData.desiredPropertyTypes.map((t) => t.replace("_", " ")).join(", ")}</strong></div>
                  <div>Preferred Localities: <strong>{wantedData.preferredLocalities || "Flexible"}</strong></div>
                  <div>Cash Boot Allowed: <strong>{wantedData.openToCashAdjustment ? "Yes" : "No"}</strong></div>
                  {intent === "both" && (
                    <div className="pt-2 border-t border-slate-200 text-amber-800">
                      Outright Asking Price: <strong>{formatCurrency(Number(saleData.askingPrice || ownedData.approxValue))}</strong>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1 text-slate-600">
                  <span className="font-bold text-slate-900 block text-xs">Sale Terms:</span>
                  <div>Asking Price: <strong>{formatCurrency(Number(saleData.askingPrice || ownedData.approxValue))}</strong></div>
                  <div>Terms: <strong>{saleData.saleDescription || "Direct outright sale"}</strong></div>
                </div>
              )}
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Human-in-the-Loop Broker Valuation Review</span>
              <span className="text-[11px] mt-0.5 block">
                Upon submission, a certified real estate broker will conduct physical document verification. Once approved to 'reviewed' status, your property will actively participate in matches and/or public sale exploration.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        {step > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous Step</span>
          </button>
        ) : (
          <div />
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
          >
            <span>Proceed to Step {step + 1}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
          >
            {submitting ? "Registering Property..." : "Submit Property for Verification"}
            <CheckCircle2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
