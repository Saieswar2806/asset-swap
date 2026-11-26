import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { getPropertyImages, getPropertyTypeFallback } from "../../propertyImages.js";
import type { PropertyType } from "../../types.js";

interface PropertyImageGalleryProps {
  images?: string[] | null;
  propertyType?: PropertyType;
  title?: string;
  className?: string;
  aspectRatio?: "video" | "square" | "wide";
  showThumbnails?: boolean;
}

export const PropertyImageGallery: React.FC<PropertyImageGalleryProps> = ({
  images,
  propertyType = "apartment" as PropertyType,
  title = "Property Photo",
  className = "",
  aspectRatio = "video",
  showThumbnails = true
}) => {
  const fallback = getPropertyTypeFallback(propertyType);
  const resolvedImages = getPropertyImages(propertyType, 0, images);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [failedIndices, setFailedIndices] = useState<Record<number, boolean>>({});

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : resolvedImages.length - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev < resolvedImages.length - 1 ? prev + 1 : 0));
  };

  const handleImageError = (index: number) => {
    setFailedIndices((prev) => ({ ...prev, [index]: true }));
  };

  const currentUrl = failedIndices[activeIndex] ? fallback : resolvedImages[activeIndex] || fallback;

  const aspectClass =
    aspectRatio === "video"
      ? "aspect-video"
      : aspectRatio === "wide"
      ? "h-72 sm:h-80 w-full"
      : "aspect-square";

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Main Image Stage */}
      <div className={`relative ${aspectClass} rounded-2xl overflow-hidden bg-slate-900 group select-none shadow-xs border border-slate-200/80`}>
        <img
          src={currentUrl}
          alt={`${title} - view ${activeIndex + 1}`}
          onError={() => handleImageError(activeIndex)}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-black/20 pointer-events-none" />

        {/* Counter Badge */}
        {resolvedImages.length > 1 && (
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[10px] font-bold tracking-wider shadow-sm flex items-center gap-1.5 border border-white/10">
            <ImageIcon className="w-3 h-3 text-slate-300" />
            <span>
              {activeIndex + 1} / {resolvedImages.length}
            </span>
          </div>
        )}

        {/* Previous / Next Arrows */}
        {resolvedImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous image"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition-all opacity-80 group-hover:opacity-100 hover:scale-110 shadow-md border border-white/10"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next image"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition-all opacity-80 group-hover:opacity-100 hover:scale-110 shadow-md border border-white/10"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails Navigation Strip */}
      {showThumbnails && resolvedImages.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {resolvedImages.map((imgUrl, idx) => {
            const thumbUrl = failedIndices[idx] ? fallback : imgUrl;
            const isActive = idx === activeIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex(idx);
                }}
                className={`relative w-16 h-12 sm:w-20 sm:h-14 shrink-0 rounded-xl overflow-hidden transition-all duration-200 border-2 ${
                  isActive
                    ? "border-blue-600 ring-2 ring-blue-500/30 scale-105 shadow-sm"
                    : "border-transparent opacity-60 hover:opacity-100 hover:border-slate-300"
                }`}
              >
                <img
                  src={thumbUrl}
                  alt={`Thumbnail ${idx + 1}`}
                  onError={() => handleImageError(idx)}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
