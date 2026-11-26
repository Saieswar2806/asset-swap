import React, { useState } from "react";
import {
  MapPin,
  Maximize2,
  Tag,
  Lock,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Images
} from "lucide-react";
import type { Listing } from "../types.js";
import { getPropertyThumbnail, getPropertyTypeFallback, getPropertyImages } from "../../propertyImages.js";
import { PropertyDetailModal } from "./PropertyDetailModal.js";

interface PropertyCardProps {
  listing: Listing;
  onSelect?: (listing: Listing) => void;
  showWants?: boolean;
}

export function formatCurrency(amount: number): string {
  if (Math.abs(amount) >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  }
  if (Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ listing, onSelect, showWants = true }) => {
  const meta = listing.metadata || {};
  const title = (meta.title as string) || listing.title || `${listing.propertyType.replace(/_/g, " ")} in ${listing.locality}`;
  
  const numId = parseInt(listing.id.replace(/\D/g, ""), 10) || 0;
  const initialThumb = getPropertyThumbnail(
    listing.propertyType,
    numId,
    listing.imageUrl || (meta.imageUrl as string),
    listing.images || (meta.images as string[])
  );

  const [imgSrc, setImgSrc] = useState<string>(initialThumb);
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  const gallery = getPropertyImages(
    listing.propertyType,
    numId,
    listing.images || (meta.images as string[]),
    listing.imageUrl || (meta.imageUrl as string)
  );

  const statusBadges: Record<string, { bg: string; text: string; icon: React.FC<{ className?: string }> }> = {
    reviewed: { bg: "bg-emerald-50 border-emerald-200 text-emerald-700", text: "Approved", icon: CheckCircle2 },
    submitted: { bg: "bg-blue-50 border-blue-200 text-blue-700", text: "Under Review", icon: Clock },
    under_review: { bg: "bg-amber-50 border-amber-200 text-amber-700", text: "Under Review", icon: Clock },
    rejected: { bg: "bg-red-50 border-red-200 text-red-700", text: "Rejected", icon: XCircle },
    draft: { bg: "bg-slate-50 border-slate-200 text-slate-600", text: "Draft", icon: FileText }
  };

  const statusInfo = statusBadges[listing.status] || statusBadges.submitted;
  const StatusIcon = statusInfo.icon;

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(listing);
    } else {
      setModalOpen(true);
    }
  };

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group">
        {/* Property Image & Status Badges */}
        <div
          onClick={handleCardClick}
          className="relative h-48 overflow-hidden bg-slate-900 cursor-pointer"
        >
          <img
            src={imgSrc}
            alt={title}
            onError={() => setImgSrc(getPropertyTypeFallback(listing.propertyType))}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent pointer-events-none" />

          {/* Top Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur-md shadow-sm ${statusInfo.bg}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {statusInfo.text}
            </span>
            {listing.locked && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-600/95 text-white shadow-sm backdrop-blur-md">
                <Clock className="w-3 h-3" />
                Exchange Proposal Active
              </span>
            )}
          </div>

          {/* Gallery Count Pill */}
          {gallery.length > 1 && (
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-slate-900/70 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow-sm border border-white/10">
              <Images className="w-3 h-3 text-slate-300" />
              <span>{gallery.length}</span>
            </div>
          )}

          {/* Bottom Property ID */}
          <div className="absolute bottom-2 left-3 text-white text-xs font-mono font-medium opacity-90">
            #{listing.id}
          </div>
        </div>

        {/* Property Details */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-1 text-slate-500 text-xs font-medium mb-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{listing.locality}, {listing.district}</span>
            </div>

            <h3
              onClick={handleCardClick}
              className="text-base font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors cursor-pointer"
            >
              {title}
            </h3>

            <div className="flex items-center gap-3 text-xs text-slate-600 mt-2">
              <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-lg text-slate-700 font-semibold capitalize text-[11px]">
                <Tag className="w-3 h-3 text-slate-400" />
                {listing.propertyType.replace(/_/g, " ")}
              </span>
              <span className="flex items-center gap-1 font-semibold text-[11px] text-slate-700">
                <Maximize2 className="w-3 h-3 text-slate-400" />
                {listing.area} {listing.areaUnit}
              </span>
            </div>
          </div>

          {/* Valuations Comparison */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 space-y-1 text-xs">
            <div className="flex justify-between items-center text-slate-500">
              <span>Owner-Declared:</span>
              <span className="font-semibold text-slate-700">{formatCurrency(listing.ownerDeclaredValue)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-900 font-bold border-t border-slate-200/60 pt-1">
              <span className="text-blue-900 flex items-center gap-1">
                Broker Valuation:
              </span>
              <span className={listing.reviewedValue ? "text-emerald-700 font-bold text-sm" : "text-slate-400 italic font-normal"}>
                {listing.reviewedValue ? formatCurrency(listing.reviewedValue) : "Pending Review"}
              </span>
            </div>
          </div>

          {/* Wants / Exchange Requirements */}
          {showWants && listing.wants && (
            <div className="text-xs text-slate-600 border-t border-slate-100 pt-2 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">DESIRED IN EXCHANGE:</span>
              <div className="flex flex-wrap gap-1">
                {listing.wants.propertyTypes.map((type) => (
                  <span key={type} className="bg-blue-50 text-blue-700 border border-blue-100 px-1.5 py-0.5 rounded text-[11px] font-medium capitalize">
                    {type.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Card Footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Owner: <strong className="text-slate-700">{listing.ownerName}</strong></span>
            <button
              onClick={handleCardClick}
              className="text-blue-600 font-bold hover:text-blue-800 flex items-center gap-0.5 transition-colors"
            >
              Details <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Property Details Modal */}
      {modalOpen && (
        <PropertyDetailModal
          listing={listing}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
};
