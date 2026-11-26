import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, PlusCircle, Filter, Sparkles, Edit3, Lock, CheckCircle2, Clock, XCircle, FileText, ArrowRight } from "lucide-react";
import { useUser } from "../context/UserContext.js";
import { api } from "../api.js";
import type { Listing, VerificationStatus } from "../types.js";
import { PropertyCard, formatCurrency } from "../components/PropertyCard.js";
import { BackButton } from "../components/BackButton.js";

export const MyPropertiesPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useUser();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editValue, setEditValue] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);
    api.getOwnerListings()
      .then((data) => {
        setListings(data);
      })
      .catch((err) => {
        console.error("Failed to load user listings:", err);
      })
      .finally(() => setLoading(false));
  }, [currentUser]);

  const filteredListings = listings.filter((l) => {
    if (selectedStatus === "all") return true;
    if (selectedStatus === "active_proposal") return l.locked;
    if (selectedStatus === "under_review") return l.status === "submitted" || l.status === "under_review";
    return l.status === selectedStatus;
  });

  const handleStartEdit = (listing: Listing) => {
    setEditingListing(listing);
    setEditTitle(listing.metadata?.title as string || "");
    setEditValue(String(listing.ownerDeclaredValue || ""));
  };

  const handleSaveEdit = async () => {
    if (!editingListing) return;
    setSavingEdit(true);
    try {
      await api.updateListing(editingListing.id, {
        title: editTitle,
        ownerDeclaredValue: Number(editValue)
      });
      // Refresh listings
      const updated = await api.getListings({ ownerId: currentUser?.id });
      setListings(updated);
      setEditingListing(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update listing");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <BackButton defaultPath="/owner/dashboard" label="Back to Dashboard" className="mb-2" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Registered Properties</h1>
            <p className="text-xs text-slate-500">
              Portfolio of registered assets for <strong className="text-slate-800">{currentUser?.name}</strong> (#{currentUser?.id})
            </p>
          </div>

          <Link
            to="/register"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 self-start"
          >
            <PlusCircle className="w-4 h-4" />
            Register Another Asset
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: "all", label: "All Properties", count: listings.length },
          { id: "reviewed", label: "Approved for Listing", count: listings.filter((l) => l.status === "reviewed").length },
          { id: "under_review", label: "Submitted / Under Review", count: listings.filter((l) => l.status === "submitted" || l.status === "under_review").length },
          { id: "active_proposal", label: "In Active Proposal", count: listings.filter((l) => l.locked).length },
          { id: "rejected", label: "Rejected", count: listings.filter((l) => l.status === "rejected").length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedStatus(tab.id)}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              selectedStatus === tab.id
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              selectedStatus === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Listings Portfolio Grid */}
      {loading ? (
        <div className="py-20 text-center text-sm font-semibold text-slate-500">
          Loading portfolio assets...
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center space-y-4">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">No properties found in this view</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You do not have any properties matching the filter "{selectedStatus}". Register a new property or switch to another demo owner profile.
            </p>
          </div>
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm"
          >
            <PlusCircle className="w-4 h-4" /> Register Property
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((listing) => (
            <div key={listing.id} className="relative flex flex-col">
              <PropertyCard listing={listing} />

              {/* Action Ribbon below card */}
              <div className="bg-white border-x border-b border-slate-200 rounded-b-xl -mt-1 p-3 pt-4 flex items-center justify-between gap-2 shadow-2xs">
                {listing.status === "reviewed" && !listing.locked ? (
                  <button
                    onClick={() => navigate(listing.intent === "sell" ? "/sell" : `/swap`)}
                    className="flex-1 py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {listing.intent === "sell" ? "Manage Sale Listing" : "Explore Swap Opportunities"}
                  </button>
                ) : listing.locked ? (
                  <Link
                    to="/proposals"
                    className="flex-1 text-center py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center justify-center gap-1 transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>{(listing as any).activeProposal?.statusLabel || "Exchange Proposal Active"}</span>
                  </Link>
                ) : listing.status === "rejected" ? (
                  <span
                    title={listing.rejectionReason || (listing.metadata?.rejectionReason as string) || "Rejected during valuation review"}
                    className="flex-1 text-center py-1.5 px-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg truncate"
                  >
                    Rejected: {listing.rejectionReason || (listing.metadata?.rejectionReason as string) || "Review Required"}
                  </span>
                ) : (
                  <span className="flex-1 text-center py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg">
                    {listing.status === "under_review" ? "Under Broker Review" : listing.status === "draft" ? "Draft" : "Submitted for Review"}
                  </span>
                )}

                {!listing.locked && (
                  <button
                    onClick={() => handleStartEdit(listing)}
                    title="Edit Listing"
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Property Modal */}
      {editingListing && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Edit Property #{editingListing.id}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Declared Value (₹)</label>
                <input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditingListing(null)}
                className="px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
