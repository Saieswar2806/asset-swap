import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  defaultPath: string;
  label?: string;
  className?: string;
}

/**
 * Robust Back Button:
 * Uses browser navigation if local history exists, otherwise safely falls back
 * to the specified defaultPath so direct URL visits never get stranded.
 */
export const BackButton: React.FC<BackButtonProps> = ({
  defaultPath,
  label = "Back",
  className = ""
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1 && window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(defaultPath);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer ${className}`}
      title={label}
    >
      <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
      <span>{label}</span>
    </button>
  );
};
