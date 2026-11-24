import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, FileText, CheckCircle2, ArrowRight, ArrowLeft, ShieldCheck, Tag, MapPin, Maximize2, AlertCircle } from "lucide-react";
import { api } from "../api.js";
import { useUser } from "../context/UserContext.js";
import type { PropertyType, AreaUnit } from "../types.js";
import { formatCurrency } from "../components/PropertyCard.js";

const DISTRICTS = [
  "Bengaluru",
  "Ramanagara",
  "Mysuru",
  "Mandya",
  "Tumakuru",
  "Chikkaballapur"
];

const PROPERTY_TYPES: Array<{ id: PropertyType; label: string }> = [
  { id: "agricultural_land", label: "Agricultural Land" },
  { id: "plot_site", label: "Residential Plot / Site" },
  { id: "apartment", label: "Apartment" },
  { id: "independent_house", label: "Independent House / Villa" },
  { id: "farmhouse", label: "Farmhouse" },
  { id: "commercial", label: "Commercial Building / Space" }
];

export const RegisterPropertyPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useUser();

  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Details
    title: "",
    propertyType: "apartment" as PropertyType,
    district: "Bengaluru",
    taluk: "",
    locality: "",
    pincode: "",
    area: "",
    areaUnit: "sq_ft" as AreaUnit,
    ownerDeclaredValue: "",

    // Step 2: Information
    khataType: "A-Khata",
    surveyNumber: "",
    conversionStatus: "DC Converted",
    description: "",

    // Step 3: Requirements
    desiredPropertyTypes: ["independent_house", "plot_site"] as PropertyType[],
    preferredDistricts: ["Bengaluru"],
    preferredLocalities: "",
    minArea: "",
    minAreaUnit: "sq_ft" as AreaUnit,
    maxCashToPay: "2000000",
    maxCashToReceive: "2000000"
  });

  const updateField = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleDesiredType = (type: PropertyType) => {
    setFormData((prev) => {
      const exists = prev.desiredPropertyTypes.includes(type);
      const updated = exists
        ? prev.desiredPropertyTypes.filter((t) => t !== type)
        : [...prev.desiredPropertyTypes, type];
      return { ...prev, desiredPropertyTypes: updated };
    });
  };

  const validateStep = (currentStep: number): boolean => {
    setError(null);
    if (currentStep === 1) {
      if (!formData.title.trim()) {
        setError("Please enter a property title.");
        return false;
      }
      if (!formData.locality.trim()) {
        setError("Please enter the locality or village name.");
        return false;
      }
      const areaNum = Number(formData.area);
      if (!areaNum || areaNum <= 0) {
        setError("Please enter a valid positive area.");
        return false;
      }
      const valNum = Number(formData.ownerDeclaredValue);
      if (!valNum || valNum <= 0) {
        setError("Please enter a valid positive owner-declared value.");
        return false;
      }
    }

    if (currentStep === 2) {
      if (!formData.surveyNumber.trim()) {
        setError("Please enter survey number / site number.");
        return false;
      }
    }

    if (currentStep === 3) {
      if (formData.desiredPropertyTypes.length === 0) {
        setError("Please select at least one desired property type for exchange.");
        return false;
      }
    }

    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((s) => s + 1);
    }
  };

  const prevStep = () => {
    setError(null);
    setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    setSubmitting(true);
    setError(null);

    try {
      const preferredLocs = formData.preferredLocalities
        .split(",")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const payload = {
        ownerId: currentUser?.id || "OWNER-NEW",
        ownerName: currentUser?.name || "Property Owner",
        title: formData.title,
        propertyType: formData.propertyType,
        district: formData.district,
        taluk: formData.taluk || formData.district,
        locality: formData.locality,
        pincode: formData.pincode || "560001",
        area: Number(formData.area),
        areaUnit: formData.areaUnit,
        ownerDeclaredValue: Number(formData.ownerDeclaredValue),
        khataType: formData.khataType,
        surveyNumber: formData.surveyNumber,
        conversionStatus: formData.conversionStatus,
        description: formData.description,
        wants: {
          propertyTypes: formData.desiredPropertyTypes,
          preferredDistricts: formData.preferredDistricts,
          preferredLocations: preferredLocs.length > 0 ? preferredLocs : [formData.district],
          minArea: formData.minArea ? Number(formData.minArea) : undefined,
          minAreaUnit: formData.minAreaUnit,
          maxCashToPay: formData.maxCashToPay ? Number(formData.maxCashToPay) : 5000000,
          maxCashToReceive: formData.maxCashToReceive ? Number(formData.maxCashToReceive) : 5000000
        }
      };

      const result = await api.createListing(payload);
      setSuccessId(result.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (successId) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center space-y-5">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
            Listing Registered: #{successId}
          </span>
          <h2 className="text-2xl font-bold text-slate-900">Property Submitted for Broker Assessment</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Your property has entered the <span className="font-semibold text-blue-700">submitted</span> state. A local broker assessor will physically review documentation and sub-registrar guidance value before qualifying it for exchange matching.
          </p>
        </div>

        <div className="pt-4 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => navigate("/my-properties")}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
          >
            View in My Properties
          </button>
          <button
            onClick={() => navigate("/admin")}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all"
          >
            Review in Admin Panel (Demo)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      {/* Wizard Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Register Property for Exchange</h1>
        <p className="text-sm text-slate-500">
          List your real estate asset and define exchange preferences. New listings enter broker valuation review before matching.
        </p>
      </div>

      {/* Progress Steps Header */}
      <div className="grid grid-cols-4 gap-2 border-b border-slate-200 pb-4">
        {[
          { num: 1, title: "Property Details" },
          { num: 2, title: "Legal & Land Info" },
          { num: 3, title: "Exchange Wants" },
          { num: 4, title: "Review & Submit" }
        ].map((s) => (
          <div
            key={s.num}
            className={`flex flex-col border-t-2 pt-2 text-xs transition-colors ${
              step >= s.num ? "border-blue-600 text-blue-700 font-bold" : "border-slate-200 text-slate-400 font-medium"
            }`}
          >
            <span className="text-[10px] uppercase font-semibold">Step 0{s.num}</span>
            <span className="truncate">{s.title}</span>
          </div>
        ))}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Step Contents */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* STEP 1: Property Details */}
        {step === 1 && (
          <div className="space-y-5">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Step 1: Basic Property Details
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Property Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="e.g. Spacious 3BHK Apartment in Indiranagar / 2.5 Acre Farmland"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Property Type *
                  </label>
                  <select
                    value={formData.propertyType}
                    onChange={(e) => updateField("propertyType", e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    District (Karnataka) *
                  </label>
                  <select
                    value={formData.district}
                    onChange={(e) => updateField("district", e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {DISTRICTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Locality / Area *
                  </label>
                  <input
                    type="text"
                    value={formData.locality}
                    onChange={(e) => updateField("locality", e.target.value)}
                    placeholder="e.g. Harohalli / Indiranagar"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Taluk
                  </label>
                  <input
                    type="text"
                    value={formData.taluk}
                    onChange={(e) => updateField("taluk", e.target.value)}
                    placeholder="e.g. Kanakapura"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    PIN Code
                  </label>
                  <input
                    type="text"
                    value={formData.pincode}
                    onChange={(e) => updateField("pincode", e.target.value)}
                    placeholder="560038"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Property Area *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.area}
                    onChange={(e) => updateField("area", e.target.value)}
                    placeholder="e.g. 2400 or 2.5"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Area Unit *
                  </label>
                  <select
                    value={formData.areaUnit}
                    onChange={(e) => updateField("areaUnit", e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="sq_ft">Square Feet (sq ft)</option>
                    <option value="guntas">Guntas</option>
                    <option value="acres">Acres</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Owner-Declared Value (₹ INR) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-semibold text-sm">₹</span>
                  <input
                    type="number"
                    value={formData.ownerDeclaredValue}
                    onChange={(e) => updateField("ownerDeclaredValue", e.target.value)}
                    placeholder="e.g. 20000000 (2 Crores)"
                    className="w-full pl-8 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                </div>
                {formData.ownerDeclaredValue && Number(formData.ownerDeclaredValue) > 0 && (
                  <p className="text-xs text-blue-600 font-semibold mt-1">
                    Formatted: {formatCurrency(Number(formData.ownerDeclaredValue))}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Legal & Land Information */}
        {step === 2 && (
          <div className="space-y-5">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Step 2: Legal & Land Registry Information
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Khata / Revenue Record Type *
                  </label>
                  <select
                    value={formData.khataType}
                    onChange={(e) => updateField("khataType", e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="A-Khata">A-Khata (City Corporation / BBMP)</option>
                    <option value="B-Khata">B-Khata (Town Planning / Municipal)</option>
                    <option value="E-Khata">E-Khata (Panchayat / Grama Thana)</option>
                    <option value="Pahani / RTC">Pahani / RTC (Agricultural Revenue)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Survey / Property Identification No. *
                  </label>
                  <input
                    type="text"
                    value={formData.surveyNumber}
                    onChange={(e) => updateField("surveyNumber", e.target.value)}
                    placeholder="e.g. Sy. No. 124/3 or Site No. 45"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Land Conversion / Zoning Status
                </label>
                <select
                  value={formData.conversionStatus}
                  onChange={(e) => updateField("conversionStatus", e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DC Converted">DC Converted (Residential / Commercial)</option>
                  <option value="Agricultural">Agricultural Land (General / Farm)</option>
                  <option value="BDA Approved">BDA / BMRDA Approved Layout</option>
                  <option value="MUDA Approved">MUDA Approved Layout</option>
                  <option value="Gramathana">Gramathana Old Inhabitation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Property Description & Access Details
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Describe road access, boundary compound, water/electricity utilities, and documentation status..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Exchange Requirements */}
        {step === 3 && (
          <div className="space-y-5">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-600" />
              Step 3: Desired Exchange Requirements
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  What Property Categories Are You Willing to Receive? *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PROPERTY_TYPES.map((t) => {
                    const isChecked = formData.desiredPropertyTypes.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? "bg-blue-50/70 border-blue-300 text-blue-900 font-semibold"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleDesiredType(t.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <span className="text-xs">{t.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Preferred Localities / Areas (comma separated)
                </label>
                <input
                  type="text"
                  value={formData.preferredLocalities}
                  onChange={(e) => updateField("preferredLocalities", e.target.value)}
                  placeholder="e.g. Harohalli, Kanakapura, Indiranagar, Gokulam"
                  className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Properties matching these localities receive top location preference scores (0 km transit).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Max Cash You Are Willing to Pay (Boot Limit)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-semibold text-sm">₹</span>
                    <input
                      type="number"
                      value={formData.maxCashToPay}
                      onChange={(e) => updateField("maxCashToPay", e.target.value)}
                      placeholder="e.g. 2000000"
                      className="w-full pl-8 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Max Cash You Are Willing to Receive (Boot Limit)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-semibold text-sm">₹</span>
                    <input
                      type="number"
                      value={formData.maxCashToReceive}
                      onChange={(e) => updateField("maxCashToReceive", e.target.value)}
                      placeholder="e.g. 2000000"
                      className="w-full pl-8 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Review and Submit */}
        {step === 4 && (
          <div className="space-y-5">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Step 4: Review Submission Details
            </h3>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">Property Title:</span>
                <span className="font-bold text-slate-900">{formData.title}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">Property Type:</span>
                <span className="font-semibold capitalize text-slate-800">{formData.propertyType.replace(/_/g, " ")}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">Location:</span>
                <span className="font-semibold text-slate-800">{formData.locality}, {formData.district}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">Area:</span>
                <span className="font-semibold text-slate-800">{formData.area} {formData.areaUnit}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">Owner-Declared Value:</span>
                <span className="font-bold text-blue-800 text-sm">{formatCurrency(Number(formData.ownerDeclaredValue))}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-2">
                <span className="text-slate-500">Khata / Survey No:</span>
                <span className="font-semibold text-slate-800">{formData.khataType} | {formData.surveyNumber}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">Desired In Exchange:</span>
                <span className="font-semibold text-emerald-700 capitalize">
                  {formData.desiredPropertyTypes.map((t) => t.replace(/_/g, " ")).join(", ")}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Physical Broker Valuation Policy
              </p>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                Upon submission, your property enters the <strong>submitted</strong> state. A local certified broker will review revenue documents, sub-registrar guidance rates, and enter a verified broker valuation before exchange loops can be formed.
              </p>
            </div>
          </div>
        )}

        {/* Wizard Navigation Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-5">
          {step > 1 ? (
            <button
              onClick={prevStep}
              disabled={submitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Previous
            </button>
          ) : <div />}

          {step < 4 ? (
            <button
              onClick={nextStep}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              Continue to Step {step + 1} <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              {submitting ? "Submitting Property..." : "Confirm & Submit Property"}
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
