import React from "react";
import { MapPin, Maximize2, Tag, Lock, ArrowUpRight, CheckCircle2, Clock, XCircle, FileText } from "lucide-react";
import type { Listing } from "../types.js";

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
  const title = (meta.title as string) || `${listing.propertyType.replace(/_/g, " ")} in ${listing.locality}`;
  const imageUrl = (meta.imageUrl as string) || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=60";

  const statusBadges: Record<string, { bg: string; text: string; icon: React.FC<{ className?: string }> }> = {
    reviewed: { bg: "bg-emerald-50 border-emerald-200 text-emerald-700", text: "Broker-Reviewed", icon: CheckCircle2 },
    submitted: { bg: "bg-blue-50 border-blue-200 text-blue-700", text: "Submitted (Awaiting Broker)", icon: Clock },
    under_review: { bg: "bg-amber-50 border-amber-200 text-amber-700", text: "Under Broker Review", icon: Clock },
    rejected: { bg: "bg-red-50 border-red-200 text-red-700", text: "Rejected", icon: XCircle },
    draft: { bg: "bg-slate-50 border-slate-200 text-slate-600", text: "Draft", icon: FileText }
  };

  const statusInfo = statusBadges[listing.status] || statusBadges.submitted;
  const StatusIcon = statusInfo.icon;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group">
      {/* Property Image & Status Badges */}
      <div className="relative h-48 overflow-hidden bg-slate-100">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur-md shadow-sm ${statusInfo.bg}`}>
            <StatusIcon className="w-3.5 h-3.5" />
            {statusInfo.text}
          </span>
          {listing.locked && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/90 text-white shadow-sm backdrop-blur-md">
              <Lock className="w-3 h-3" />
              Locked in Escrow
            </span>
          )}
        </div>

        {/* Bottom Property ID */}
        <div className="absolute bottom-2 left-3 text-white text-xs font-mono font-medium opacity-90">
          #{listing.id}
        </div>
      </div>

      {/* Property Details */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          <div className="flex items-center gap-1 text-slate-500 text-xs font-medium mb-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>{listing.locality}, {listing.district}</span>
          </div>

          <h3 className="text-base font-bold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
            {title}
          </h3>

          <div className="flex items-center gap-3 text-xs text-slate-600 mt-2">
            <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium capitalize">
              <Tag className="w-3 h-3 text-slate-400" />
              {listing.propertyType.replace(/_/g, " ")}
            </span>
            <span className="flex items-center gap-1 font-medium">
              <Maximize2 className="w-3 h-3 text-slate-400" />
              {listing.area} {listing.areaUnit}
            </span>
          </div>
        </div>

        {/* Valuations Comparison */}
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 space-y-1 text-xs">
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
            <span className="text-[11px] font-semibold text-slate-500 block">DESIRED IN EXCHANGE:</span>
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
          {onSelect && (
            <button
              onClick={() => onSelect(listing)}
              className="text-blue-600 font-semibold hover:text-blue-700 flex items-center gap-0.5"
            >
              Details <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
