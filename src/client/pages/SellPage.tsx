import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Tag,
  PlusCircle,
  Building2,
  MapPin,
  Maximize2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Mail,
  Phone,
  ArrowRight,
  ShieldCheck,
  Edit3,
  X,
  MessageSquare
} from "lucide-react";
import { api } from "../api.js";
import { useUser } from "../context/UserContext.js";
import { formatCurrency } from "../components/PropertyCard.js";
import type { Listing } from "../types.js";

export const SellPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useUser();

  const [activeTab, setActiveTab] = useState<"listings" | "inquiries" | "convert">("listings");
  const [saleListings, setSaleListings] = useState<Array<Listing & { inquiryCount: number }>>([]);
  const [allMyListings, setAllMyListings] = useState<Listing[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Enable Sale Modal on existing property
  const [enableModalListing, setEnableModalListing] = useState<Listing | null>(null);
  const [askingPrice, setAskingPrice] = useState("");
  const [saleDescription, setSaleDescription] = useState("");
  const [saleIntent, setSaleIntent] = useState<"both" | "sell">("both");
  const [enabling, setEnabling] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [sales, all, inqs] = await Promise.all([
        api.getSellListings().catch(() => []),
        api.getOwnerListings().catch(() => []),
        api.getSellInquiries().catch(() => [])
      ]);
      setSaleListings(sales);
      setAllMyListings(all);
      setInquiries(inqs);
    } catch (err: any) {
      setFeedback({ message: err?.message || "Failed to load seller listings.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenEnableSale = (l: Listing) => {
    setEnableModalListing(l);
    setAskingPrice(String(l.reviewedValue || l.ownerDeclaredValue));
    setSaleDescription("Verified clear title property available for outright sale.");
    setSaleIntent("both");
  };

  const handleEnableSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enableModalListing) return;

    setEnabling(true);
    try {
      await api.enableSaleListing({
        listingId: enableModalListing.id,
        askingPrice: Number(askingPrice),
        saleDescription,
        intent: saleIntent
      });
      setFeedback({
        message: `Property "${enableModalListing.metadata?.title || enableModalListing.locality}" is now listed for sale.`,
        type: "success"
      });
      setEnableModalListing(null);
      loadData();
    } catch (err: any) {
      setFeedback({ message: err?.message || "Failed to enable sale.", type: "error" });
    } finally {
      setEnabling(false);
    }
  };

  const handleStatusUpdate = async (inquiryId: string, status: "contacted" | "closed") => {
    try {
      await api.updateInquiryStatus(inquiryId, status);
      setFeedback({ message: `Inquiry marked as ${status}.`, type: "success" });
      loadData();
    } catch (err: any) {
      setFeedback({ message: err?.message || "Failed to update inquiry status.", type: "error" });
    }
  };

  // Filter properties eligible to be listed for sale (currently only swap)
  const swapOnlyProperties = allMyListings.filter((l) => l.intent !== "sell" && l.intent !== "both");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold mb-2">
            <Tag className="w-3.5 h-3.5" />
            <span>Outright Real Estate Sales</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sell Property</h1>
          <p className="text-xs text-slate-500 mt-1">
            List properties for outright sale with verified broker valuation review, or enable sales on your existing portfolio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/register?intent=sell"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>List New Property for Sale</span>
          </Link>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("listings")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === "listings"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          My Sale Listings ({saleListings.length})
        </button>

        <button
          onClick={() => setActiveTab("inquiries")}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === "inquiries"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          }`}
        >
          <span>Buyer Inquiries Received</span>
          {inquiries.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center">
              {inquiries.length}
            </span>
          )}
        </button>

        {swapOnlyProperties.length > 0 && (
          <button
            onClick={() => setActiveTab("convert")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "convert"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <span>Enable Sale on Existing ({swapOnlyProperties.length})</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-500 font-semibold">Loading sale portfolio...</span>
          </div>
        </div>
      ) : activeTab === "listings" ? (
        /* 1. My Sale Listings */
        <div className="space-y-4">
          {saleListings.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
              <Tag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-900">No properties listed for sale</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                You have not listed any properties for outright sale yet. You can register a new property or enable sale on your existing swap properties.
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <Link
                  to="/register?intent=sell"
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs"
                >
                  List New Property
                </Link>
                {swapOnlyProperties.length > 0 && (
                  <button
                    onClick={() => setActiveTab("convert")}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                  >
                    Enable on Existing Portfolio
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {saleListings.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                        {item.intent === "both" ? "Swap & Sell" : "Direct Sale"}
                      </span>
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

                    <h3 className="text-sm font-bold text-slate-900 mt-2 truncate">
                      {item.metadata?.title as string || item.locality}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.locality}, {item.district}</span>
                    </p>

                    <div className="grid grid-cols-2 gap-2 mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Asking Price</span>
                        <span className="font-bold text-slate-900">
                          {formatCurrency(item.askingPrice || item.reviewedValue || item.ownerDeclaredValue)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Broker Valuation</span>
                        <span className="font-bold text-slate-700">
                          {formatCurrency(item.reviewedValue || item.ownerDeclaredValue)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-slate-600">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-semibold">{item.inquiryCount} Inquiries</span>
                    </div>

                    <button
                      onClick={() => handleOpenEnableSale(item)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Terms</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === "inquiries" ? (
        /* 2. Inquiries Received */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">Buyer Inquiries on Your Properties</h2>
          <p className="text-xs text-slate-500">
            Direct expressions of interest submitted by authenticated buyers interested in purchasing your real estate.
          </p>

          {inquiries.length === 0 ? (
            <div className="py-12 text-center">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No buyer inquiries received yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {inquiries.map((inq) => (
                <div key={inq.id} className="py-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{inq.listingTitle || inq.listingLocality}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        inq.status === "contacted"
                          ? "bg-emerald-100 text-emerald-800"
                          : inq.status === "closed"
                          ? "bg-slate-100 text-slate-600"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {inq.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span className="font-semibold text-slate-900">Buyer: {inq.buyerName}</span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {inq.buyerEmail}
                      </span>
                      {inq.buyerPhone && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {inq.buyerPhone}
                        </span>
                      )}
                      {inq.offerAmount && (
                        <span className="text-emerald-700 font-bold">
                          Offer: {formatCurrency(inq.offerAmount)}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      "{inq.message}"
                    </p>
                    <span className="text-[10px] text-slate-400 block">
                      Received: {new Date(inq.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {inq.status === "pending" && (
                      <button
                        onClick={() => handleStatusUpdate(inq.id, "contacted")}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs"
                      >
                        Mark Contacted
                      </button>
                    )}
                    {inq.status !== "closed" && (
                      <button
                        onClick={() => handleStatusUpdate(inq.id, "closed")}
                        className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* 3. Convert / Enable Existing Swap Properties for Sale */
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Enable Sale on Registered Properties</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              These properties are currently registered for asset swap. You can enable them for outright sale as well ("Both Swap & Sell") without re-registering.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {swapOnlyProperties.map((item) => (
              <div key={item.id} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50/50">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    {item.propertyType.replace("_", " ")}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {item.metadata?.title as string || item.locality}
                  </h4>
                  <span className="text-xs text-slate-500 block">{item.locality}, {item.district}</span>
                  <span className="text-xs font-bold text-slate-700 mt-1 block">
                    Valuation: {formatCurrency(item.reviewedValue || item.ownerDeclaredValue)}
                  </span>
                </div>

                <button
                  onClick={() => handleOpenEnableSale(item)}
                  className="w-full py-1.5 px-3 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>List for Outright Sale</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enable Sale Modal */}
      {enableModalListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">List Property for Sale</h3>
                <p className="text-xs text-slate-500">
                  {enableModalListing.metadata?.title as string || enableModalListing.locality}
                </p>
              </div>
              <button
                onClick={() => setEnableModalListing(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEnableSaleSubmit} className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                  Asking Price (₹ INR)
                </label>
                <input
                  type="number"
                  required
                  value={askingPrice}
                  onChange={(e) => setAskingPrice(e.target.value)}
                  placeholder="e.g. 18000000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                  Sale Intent Model
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSaleIntent("both")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${
                      saleIntent === "both"
                        ? "bg-blue-50 border-blue-600 text-blue-900"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Both Swap & Sell
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaleIntent("sell")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${
                      saleIntent === "sell"
                        ? "bg-amber-50 border-amber-600 text-amber-900"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Sell Only (No Swap)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                  Sale Description & Terms
                </label>
                <textarea
                  rows={3}
                  value={saleDescription}
                  onChange={(e) => setSaleDescription(e.target.value)}
                  placeholder="Clear title, negotiable terms, immediate possession..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEnableModalListing(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enabling}
                  className="px-5 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors shadow-xs disabled:opacity-50"
                >
                  {enabling ? "Updating..." : "Publish Sale Listing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
