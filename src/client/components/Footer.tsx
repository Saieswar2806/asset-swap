import React from "react";
import { Shield } from "lucide-react";
import { AssetSwapLogo } from "./AssetSwapLogo.js";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3 md:col-span-1">
            <AssetSwapLogo size="sm" variant="dark" />
            <p className="text-slate-400 leading-relaxed">
              India's premier technology platform for direct bilateral & multi-party property exchanges, eliminating conventional cash liquidation friction.
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-slate-200 font-semibold uppercase tracking-wider block text-[11px]">
              Exchange Model
            </span>
            <ul className="space-y-1.5">
              <li>Direct 2-Party Asset Swaps</li>
              <li>3-Party Circular Trade Loops</li>
              <li>Mutually Agreed Cash Boot</li>
              <li>Broker-Reviewed Valuations</li>
            </ul>
          </div>

          <div className="space-y-2">
            <span className="text-slate-200 font-semibold uppercase tracking-wider block text-[11px]">
              Coverage (Karnataka)
            </span>
            <ul className="space-y-1.5 flex flex-wrap gap-x-3 gap-y-1">
              <li>Bengaluru Urban</li>
              <li>Ramanagara</li>
              <li>Mysuru</li>
              <li>Mandya</li>
              <li>Tumakuru</li>
              <li>Chikkaballapur</li>
            </ul>
          </div>

          <div className="space-y-2">
            <span className="text-slate-200 font-semibold uppercase tracking-wider block text-[11px] flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-teal-400" />
              Platform Disclaimers
            </span>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              All valuations are based on physical broker assessments. Legal conveyancing and title scrutiny are performed by certified advocates. This prototype is for demonstration only and does not process payments or register deeds.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} Asset Swap Technology Platforms Ltd. Fictional Demonstration Dataset.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Graph-Based Cycle Engine v2.0</span>
            <span>•</span>
            <span>Zero Unilateral Cash Transactions</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
