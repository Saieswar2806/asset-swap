import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  ShoppingBag,
  Building2,
  MapPin,
  Maximize2,
  BedDouble,
  Bath,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Tag,
  Mail,
  Phone,
  Clock,
  AlertCircle,
  X,
  Images,
  Heart
} from "lucide-react";
import { api } from "../api.js";
import { useUser } from "../context/UserContext.js";
import { formatCurrency } from "../components/PropertyCard.js";
import { PropertyImageGallery } from "../components/PropertyImageGallery.js";
import { getPropertyThumbnail, getPropertyTypeFallback, getPropertyImages } from "../../propertyImages.js";
import type { Listing, PropertyType } from "../types.js";

const PROPERTY_TYPES: Array<{ id: string; label: string }> = [
  { id: "all", label: "All Property Types" },
  { id: "apartment", label: "Apartment" },
  { id: "independent_house", label: "House / Villa" },
  { id: "plot_site", label: "Residential Plot / Site" },
  { id: "agricultural_land", label: "Agricultural Land" },
  { id: "farmhouse", label: "Farmhouse" },
  { id: "commercial", label: "Commercial Building" }
];

const DISTRICTS = [
  "All Districts",
  "Bengaluru",
  "Ramanagara",
  "Mysuru",
  "Mandya",
  "Tumakuru",
  "Chikkaballapur"
];

export const BuyPage: React.FC = () => {
  const { currentUser } = useUser();
  const [activeTab, setActiveTab] = useState<"browse" | "shortlist" | "my_inquiries">("browse");

  const [listings, setListings] = useState<Listing[]>([]);
  const [myInquiries, setMyInquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedDistrict, setSelectedDistrict] = useState("All Districts");
  const [minBedrooms, setMinBedrooms] = useState<string>("any");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [minArea, setMinArea] = useState<string>("");

  // Shortlisting state
  const [shortlistedIds, setShortlistedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("asset_swap_shortlist") || "[]");
    } catch {
      return [];
    }
  });

  const toggleShortlist = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShortlistedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem("asset_swap_shortlist", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Selected Listing for Detail / Inquiry Modal
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [inquiryOffer, setInquiryOffer] = useState("");
  const [inquiryPhone, setInquiryPhone] = useState(currentUser?.phone || "");
  const [inquiryMessage, setInquiryMessage] = useState(
    "Hello, I am interested in purchasing this property and would like to review verification documents and schedule a physical inspection."
  );
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState<string | null>(null);
  const [inquiryError, setInquiryError] = useState<string | null>(null);

  const fetchListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBuyListings({
        search: search.trim() || undefined,
        propertyType: selectedType !== "all" ? selectedType : undefined,
        district: selectedDistrict !== "All Districts" ? selectedDistrict : undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        minArea: minArea ? Number(minArea) : undefined,
        bedrooms: minBedrooms !== "any" ? Number(minBedrooms) : undefined
      });
      setListings(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load properties for sale.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyInquiries = async () => {
    try {
      const data = await api.getMyBuyInquiries();
      setMyInquiries(data);
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    fetchListings();
    fetchMyInquiries();
  }, [selectedType, selectedDistrict, minBedrooms]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchListings();
  };

  const handleOpenListing = (l: Listing) => {
    setSelectedListing(l);
    setInquiryOffer(l.askingPrice ? String(l.askingPrice) : String(l.reviewedValue || l.ownerDeclaredValue));
    setInquiryError(null);
    setInquirySuccess(null);
  };

  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedListing) return;

    setInquirySubmitting(true);
    setInquiryError(null);
    setInquirySuccess(null);

    try {
      const res = await api.submitBuyerInquiry({
        listingId: selectedListing.id,
        message: inquiryMessage,
        offerAmount: inquiryOffer ? Number(inquiryOffer) : undefined,
        buyerPhone: inquiryPhone || undefined
      });
      setInquirySuccess(res.message);
      fetchMyInquiries();
    } catch (err: any) {
      setInquiryError(err?.message || "Failed to transmit inquiry to seller.");
    } finally {
      setInquirySubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold mb-2">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Direct Real Estate Acquisitions</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Buy Property</h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse verified Karnataka real estate listed for outright sale. All properties include certified broker-reviewed valuations.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-center">
          <button
            onClick={() => setActiveTab("browse")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === "browse"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Properties For Sale ({listings.length})
          </button>
          <button
            onClick={() => setActiveTab("shortlist")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "shortlist"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            <span>Shortlisted ({shortlistedIds.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("my_inquiries")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "my_inquiries"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>My Buy Requests</span>
            {myInquiries.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">
                {myInquiries.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === "browse" || activeTab === "shortlist" ? (
        <>
          {/* Search & Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by locality, village, district or property keywords..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs"
              >
                Search Listings
              </button>
            </form>

            {/* Quick Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Property Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full py-1.5 px-2.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  District
                </label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full py-1.5 px-2.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Bedrooms
                </label>
                <select
                  value={minBedrooms}
                  onChange={(e) => setMinBedrooms(e.target.value)}
                  className="w-full py-1.5 px-2.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="any">Any Bedrooms</option>
                  <option value="1">1+ BHK</option>
                  <option value="2">2+ BHK</option>
                  <option value="3">3+ BHK</option>
                  <option value="4">4+ BHK</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Min Price (₹)
                </label>
                <input
                  type="number"
                  placeholder="Min budget"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  onBlur={fetchListings}
                  className="w-full py-1.5 px-2.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Max Price (₹)
                </label>
                <input
                  type="number"
                  placeholder="Max budget"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  onBlur={fetchListings}
                  className="w-full py-1.5 px-2.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Min Area (sq ft)
                </label>
                <input
                  type="number"
                  placeholder="Min area"
                  value={minArea}
                  onChange={(e) => setMinArea(e.target.value)}
                  onBlur={fetchListings}
                  className="w-full py-1.5 px-2.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Listings Grid */}
          {loading ? (
            <div className="min-h-[40vh] flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold text-slate-500">Searching properties for sale...</span>
              </div>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (() => {
            const displayedListings = activeTab === "shortlist"
              ? listings.filter((l) => shortlistedIds.includes(l.id))
              : listings;

            if (displayedListings.length === 0) {
              return (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
                    {activeTab === "shortlist" ? <Heart className="w-6 h-6 text-rose-400" /> : <ShoppingBag className="w-6 h-6" />}
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {activeTab === "shortlist" ? "No Shortlisted Properties Saved" : "No properties matching your criteria"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    {activeTab === "shortlist"
                      ? "You have not saved any properties yet. Click the heart icon on any property card to bookmark it for quick access."
                      : "No active sale listings match your selected location, property type, or price filters. Try clearing some filters."}
                  </p>
                  {activeTab === "browse" && (
                    <button
                      onClick={() => {
                        setSearch("");
                        setSelectedType("all");
                        setSelectedDistrict("All Districts");
                        setMinBedrooms("any");
                        setMinPrice("");
                        setMaxPrice("");
                        setMinArea("");
                      }}
                      className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
                    >
                      Reset All Filters
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {displayedListings.map((item) => {
                  const askingVal = item.askingPrice ?? (item.reviewedValue ?? item.ownerDeclaredValue);
                  const isResidential = ["apartment", "independent_house", "farmhouse"].includes(item.propertyType);

                  const num = parseInt(item.id.replace(/\D/g, "") || "0", 10) || 0;
                  const thumb = getPropertyThumbnail(item.propertyType, num, item.imageUrl || (item.metadata?.imageUrl as string), item.images || (item.metadata?.images as string[]));
                  const gallery = getPropertyImages(item.propertyType, num, item.images || (item.metadata?.images as string[]), item.imageUrl || (item.metadata?.imageUrl as string));
                  const isShortlisted = shortlistedIds.includes(item.id);

                  return (
                    <div
                      key={item.id}
                      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        {/* Property Image & Badges */}
                        <div className="relative h-44 bg-slate-900 overflow-hidden cursor-pointer" onClick={() => handleOpenListing(item)}>
                          <img
                            src={thumb}
                            alt={item.title || item.locality}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = getPropertyTypeFallback(item.propertyType);
                            }}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold tracking-wider uppercase shadow-xs">
                              For Sale
                            </span>
                            {item.intent === "both" && (
                              <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-bold tracking-wider uppercase shadow-xs">
                                Open to Swap
                              </span>
                            )}
                          </div>
                          
                          {/* Image counter and Shortlist heart button */}
                          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
                            {gallery.length > 1 && (
                              <div className="px-2 py-0.5 rounded-full bg-slate-900/70 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow-sm border border-white/10">
                                <Images className="w-3 h-3 text-slate-300" />
                                <span>{gallery.length}</span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={(e) => toggleShortlist(item.id, e)}
                              className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md transition-all shadow-xs ${
                                isShortlisted
                                  ? "bg-rose-500 text-white"
                                  : "bg-slate-900/60 hover:bg-slate-900/90 text-white"
                              }`}
                              title={isShortlisted ? "Remove from Shortlist" : "Save Property"}
                            >
                              <Heart className={`w-3.5 h-3.5 ${isShortlisted ? "fill-white" : ""}`} />
                            </button>
                          </div>

                          <div className="absolute bottom-2.5 left-2.5 px-2 py-1 rounded-md bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-bold">
                            {formatCurrency(askingVal)}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-2.5">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {item.propertyType.replace("_", " ")}
                            </span>
                            <h3 className="text-sm font-bold text-slate-900 truncate" title={item.title || item.locality}>
                              {item.title || `${item.locality}, ${item.district}`}
                            </h3>
                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                              <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                              <span className="truncate">{item.locality}, {item.district}</span>
                            </div>
                          </div>

                          {/* Specs row */}
                          <div className="flex items-center gap-3 py-2 border-y border-slate-100 text-xs text-slate-600">
                            <div className="flex items-center gap-1">
                              <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-semibold">{item.area} {item.areaUnit}</span>
                            </div>

                            {isResidential && item.bedrooms && (
                              <div className="flex items-center gap-1">
                                <BedDouble className="w-3.5 h-3.5 text-slate-400" />
                                <span className="font-semibold">{item.bedrooms} Beds</span>
                              </div>
                            )}

                            {isResidential && item.bathrooms && (
                              <div className="flex items-center gap-1">
                                <Bath className="w-3.5 h-3.5 text-slate-400" />
                                <span className="font-semibold">{item.bathrooms} Baths</span>
                              </div>
                            )}
                          </div>

                          {/* Verified valuation note */}
                          <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50/80 px-2 py-1 rounded-lg">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Broker Verified Value: <strong>{formatCurrency(item.reviewedValue || item.ownerDeclaredValue)}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Action footer with Seller Information */}
                      <div className="p-4 pt-0">
                        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div className="text-[11px] text-slate-500 truncate mr-2">
                            Seller: <strong className="text-slate-700 font-semibold">{item.sellerName || item.ownerName}</strong>
                          </div>
                          <button
                            onClick={() => handleOpenListing(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors shrink-0 shadow-xs"
                          >
                            <span>Details</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </>
      ) : (
        /* My Sent Inquiries Tab */
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900">My Purchase Inquiries</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Track the status of purchase expressions sent directly to property owners.
            </p>

            {myInquiries.length === 0 ? (
              <div className="py-12 text-center">
                <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">You have not submitted any property purchase inquiries yet.</p>
                <button
                  onClick={() => setActiveTab("browse")}
                  className="mt-3 px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                >
                  Browse For Sale Properties
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 mt-4">
                {myInquiries.map((inq) => (
                  <div key={inq.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
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
                      <div className="text-xs text-slate-500 flex items-center gap-3">
                        <span>Location: {inq.listingLocality}, {inq.listingDistrict}</span>
                        {inq.offerAmount && (
                          <span>Offer: <strong>{formatCurrency(inq.offerAmount)}</strong></span>
                        )}
                        <span>Sent: {new Date(inq.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg italic">
                        "{inq.message}"
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-slate-400 block">Owner / Seller</span>
                      <span className="text-xs font-bold text-slate-700">{inq.sellerName || "Verified Owner"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Property Details & Buyer Inquiry Modal */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  Verified Property For Sale
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {selectedListing.title || `${selectedListing.locality}, ${selectedListing.district}`}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedListing.locality}, {selectedListing.district} (PIN: {selectedListing.metadata?.pincode as string || "560001"})
                </p>
              </div>
              <button
                onClick={() => setSelectedListing(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Property Multi-Image Gallery */}
            <PropertyImageGallery
              images={selectedListing.images || (selectedListing.metadata?.images as string[]) || (selectedListing.imageUrl ? [selectedListing.imageUrl] : [])}
              propertyType={selectedListing.propertyType}
              title={selectedListing.title || selectedListing.locality}
              aspectRatio="wide"
            />

            {/* Price & Valuations */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Asking Price</span>
                <span className="text-sm font-bold text-emerald-700">
                  {formatCurrency(selectedListing.askingPrice || selectedListing.reviewedValue || selectedListing.ownerDeclaredValue)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Broker Valuation</span>
                <span className="text-sm font-bold text-slate-900">
                  {formatCurrency(selectedListing.reviewedValue || selectedListing.ownerDeclaredValue)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Area & Unit</span>
                <span className="text-sm font-bold text-slate-900">
                  {selectedListing.area} {selectedListing.areaUnit}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="text-xs text-slate-600 space-y-1">
              <span className="font-bold text-slate-800 block">Property Overview:</span>
              <p className="leading-relaxed">
                {selectedListing.metadata?.description as string || "Clear title property verified under state municipal boundaries with certified valuation."}
              </p>
            </div>

            {/* Inquiry Form */}
            <div className="pt-3 border-t border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
                Express Purchase Interest to Seller
              </h4>

              {inquirySuccess ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">{inquirySuccess}</span>
                    <span className="text-[11px] mt-0.5 block">
                      The property owner has received your request and can contact you directly through your registered phone or email.
                    </span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitInquiry} className="space-y-3">
                  {inquiryError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{inquiryError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Offer Amount (₹ Optional)
                      </label>
                      <input
                        type="number"
                        value={inquiryOffer}
                        onChange={(e) => setInquiryOffer(e.target.value)}
                        placeholder="Offer in INR"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        value={inquiryPhone}
                        onChange={(e) => setInquiryPhone(e.target.value)}
                        placeholder="+91 98450 00000"
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      Message to Property Owner
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={inquiryMessage}
                      onChange={(e) => setInquiryMessage(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedListing(null)}
                      className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={inquirySubmitting}
                      className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {inquirySubmitting ? "Transmitting..." : "Send Purchase Inquiry"}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
