import React from "react";
import {
  X,
  MapPin,
  Maximize2,
  Tag,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  FileCheck2,
  Building,
  BedDouble,
  Bath,
  ArrowRight,
  Sparkles,
  DollarSign
} from "lucide-react";
import type { Listing } from "../types.js";
import { formatCurrency } from "./PropertyCard.js";
import { PropertyImageGallery } from "./PropertyImageGallery.js";
import { getPropertyStatusMeta } from "../utils/statusLabels.js";

interface PropertyDetailModalProps {
  listing: Listing | null;
  onClose: () => void;
  onAction?: (listing: Listing) => void;
  actionLabel?: string;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  listing,
  onClose,
  onAction,
  actionLabel
}) => {
  if (!listing) return null;

  const meta = listing.metadata || {};
  const title = (meta.title as string) || listing.title || `${listing.propertyType.replace(/_/g, " ")} in ${listing.locality}`;
  const isResidential = ["apartment", "independent_house", "farmhouse"].includes(listing.propertyType);

  const statusIcons: Record<string, React.FC<{ className?: string }>> = {
    reviewed: CheckCircle2,
    submitted: Clock,
    under_review: Clock,
    rejected: XCircle,
    draft: FileText
  };

  const statusMeta = getPropertyStatusMeta(listing.status);
  const StatusIcon = statusIcons[listing.status] || Clock;
  const statusInfo = { bg: statusMeta.badgeClass, text: statusMeta.label };

  const galleryImages = (listing.images && listing.images.length > 0)
    ? listing.images
    : (meta.images as string[] | undefined) || (listing.imageUrl ? [listing.imageUrl] : []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/60">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                #{listing.id}
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.bg}`}>
                <StatusIcon className="w-3 h-3" />
                {statusInfo.text}
              </span>
              {listing.locked && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-xs">
                  <Clock className="w-3 h-3" />
                  Exchange Proposal Active
                </span>
              )}
              {listing.intent && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                  {listing.intent === "both" ? "Swap & Sell" : listing.intent === "sell" ? "For Sale" : "Swap Only"}
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-slate-900 line-clamp-1">{title}</h2>
            <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{listing.locality}, {listing.district} (PIN: {(meta.pincode as string) || "560001"})</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Multi-Image Gallery */}
          <PropertyImageGallery
            images={galleryImages}
            propertyType={listing.propertyType}
            title={title}
            aspectRatio="wide"
          />

          {/* Pricing & Valuation Comparison Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Owner Declared Value
              </span>
              <span className="text-base font-bold text-slate-800 mt-0.5 block">
                {formatCurrency(listing.ownerDeclaredValue)}
              </span>
              <span className="text-[10px] text-slate-400">Self-declared at registration</span>
            </div>

            <div className="border-t sm:border-t-0 sm:border-l border-slate-200/80 pt-2 sm:pt-0 sm:pl-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                Broker Verified Valuation
              </span>
              <span className={`text-base font-extrabold mt-0.5 block ${listing.reviewedValue ? "text-emerald-700" : "text-slate-400 italic font-medium"}`}>
                {listing.reviewedValue ? formatCurrency(listing.reviewedValue) : "Pending Review"}
              </span>
              <span className="text-[10px] text-slate-500">
                {listing.reviewedValue ? "Based on guidance value & market comp" : "Assigned during broker review"}
              </span>
            </div>

            {(listing.intent === "sell" || listing.intent === "both" || listing.askingPrice) && (
              <div className="border-t sm:border-t-0 sm:border-l border-slate-200/80 pt-2 sm:pt-0 sm:pl-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                  Outright Asking Price
                </span>
                <span className="text-base font-bold text-blue-900 mt-0.5 block">
                  {formatCurrency(listing.askingPrice || listing.reviewedValue || listing.ownerDeclaredValue)}
                </span>
                <span className="text-[10px] text-slate-500">Subject to purchase inquiry</span>
              </div>
            )}
          </div>

          {/* Specifications & Legal Details */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Property Specifications & Legal Classification
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Property Type</span>
                <span className="font-bold text-slate-800 capitalize mt-0.5 block">
                  {listing.propertyType.replace(/_/g, " ")}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Area & Unit</span>
                <span className="font-bold text-slate-800 mt-0.5 block">
                  {listing.area} {listing.areaUnit}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Khata Title</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {(meta.khataType as string) || "A-Khata (BBMP/Local Authority)"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Survey Number</span>
                <span className="font-mono font-semibold text-slate-800 mt-0.5 block">
                  {(meta.surveyNumber as string) || "Sy. No. Verified"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Conversion Status</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {(meta.conversionStatus as string) || "DC Converted / Residential"}
                </span>
              </div>
              {isResidential && (
                <>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Bedrooms</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">
                      {listing.bedrooms || (meta.bedrooms as number) || 3} BHK
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Bathrooms</span>
                    <span className="font-bold text-slate-800 mt-0.5 block">
                      {listing.bathrooms || (meta.bathrooms as number) || 2} Baths
                    </span>
                  </div>
                </>
              )}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Registered Owner</span>
                <span className="font-bold text-slate-800 mt-0.5 block">
                  {listing.ownerName}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5 text-xs text-slate-600">
            <h3 className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">
              Property Description
            </h3>
            <p className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 leading-relaxed text-slate-700">
              {(meta.description as string) ||
                (meta.saleDescription as string) ||
                listing.saleDescription ||
                "Well-maintained clear title real estate asset with verified road access, certified Khata documentation, and state municipal clearance. Eligible for direct bilateral asset swap or multi-party circular trade cycles."}
            </p>
          </div>

          {/* Exchange Requirements (Wants) */}
          {listing.wants && (
            <div className="space-y-2.5 pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Owner's Desired Exchange Preferences (Wants)
              </h3>
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-xs space-y-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-800 block mb-1">
                    Acceptable Property Types in Exchange:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {listing.wants.propertyTypes.map((pt) => (
                      <span
                        key={pt}
                        className="px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-blue-900 font-bold capitalize text-xs shadow-2xs"
                      >
                        {pt.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-blue-100/60">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-blue-800 block">
                      Preferred Locations:
                    </span>
                    <span className="font-semibold text-slate-800">
                      {listing.wants.preferredLocations.join(", ") || "Any Karnataka District"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-blue-800 block">
                      Max Cash Boot Flexibility:
                    </span>
                    <span className="font-semibold text-slate-800">
                      Up to {formatCurrency(listing.wants.maxCashToPay || 5000000)} pay / receive
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500 font-mono">
            Listing Asset ID: #{listing.id}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-white transition-colors"
            >
              Close
            </button>
            {onAction && actionLabel && (
              <button
                onClick={() => onAction(listing)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                {actionLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
