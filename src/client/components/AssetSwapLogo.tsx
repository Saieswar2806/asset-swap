import React from "react";

interface AssetSwapLogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
  subtitle?: string;
  showWordmark?: boolean;
  className?: string;
}

/**
 * AssetSwapLogo
 * Modern geometric SVG mark depicting two architectural property parcels linked
 * by bidirectional asset exchange vectors. Designed for light & dark surfaces.
 */
export const AssetSwapLogo: React.FC<AssetSwapLogoProps> = ({
  size = "md",
  variant = "light",
  subtitle,
  showWordmark = true,
  className = ""
}) => {
  const iconDimensions =
    size === "sm"
      ? "w-7 h-7"
      : size === "lg"
      ? "w-11 h-11"
      : "w-9 h-9";

  const titleClass =
    size === "sm"
      ? "text-sm font-extrabold tracking-tight"
      : size === "lg"
      ? "text-2xl font-extrabold tracking-tight"
      : "text-lg font-extrabold tracking-tight";

  const isDark = variant === "dark";

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${iconDimensions} shrink-0 drop-shadow-xs`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="asw-grad-main" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="55%" stopColor="#1D4ED8" />
            <stop offset="100%" stopColor="#0D9488" />
          </linearGradient>
          <linearGradient id="asw-grad-dark" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="50%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#14B8A6" />
          </linearGradient>
        </defs>

        {/* Rounded architectural frame */}
        <rect
          x="2"
          y="2"
          width="36"
          height="36"
          rx="10"
          fill={isDark ? "url(#asw-grad-dark)" : "url(#asw-grad-main)"}
        />

        {/* Interlocking top-left property parcel block */}
        <path
          d="M10.5 16.5V12C10.5 11.1716 11.1716 10.5 12 10.5H19.5C20.3284 10.5 21 11.1716 21 12V16.5"
          stroke="#FFFFFF"
          strokeOpacity="0.92"
          strokeWidth="2.1"
          strokeLinecap="round"
        />
        {/* Interlocking bottom-right property parcel block */}
        <path
          d="M19 23.5V28C19 28.8284 19.6716 29.5 20.5 29.5H28C28.8284 29.5 29.5 28.8284 29.5 28V23.5"
          stroke="#99F6E4"
          strokeWidth="2.1"
          strokeLinecap="round"
        />

        {/* Top directional exchange flow (left -> right) */}
        <path
          d="M12.5 17.75H26.5M26.5 17.75L23.5 14.75M26.5 17.75L23.5 20.75"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Bottom directional exchange flow (right -> left) */}
        <path
          d="M27.5 22.25H13.5M13.5 22.25L16.5 19.25M13.5 22.25L16.5 25.25"
          stroke="#5EEAD4"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {showWordmark && (
        <div className="leading-tight text-left">
          <span
            className={`${titleClass} block leading-none ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            Asset{" "}
            <span className={isDark ? "text-teal-300" : "text-blue-600"}>Swap</span>
          </span>
          {subtitle && (
            <span
              className={`text-[9.5px] font-bold tracking-wider uppercase block mt-0.5 ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
