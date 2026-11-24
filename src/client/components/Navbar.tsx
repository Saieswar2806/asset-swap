import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeftRight, Building2, UserCircle2, ShieldCheck, PlusCircle, LayoutDashboard, Sparkles, AlertCircle } from "lucide-react";
import { useUser } from "../context/UserContext.js";
import { api } from "../api.js";

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { currentUser, users, switchUser, isAdmin } = useUser();
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    api.getAdminReviewListings("submitted")
      .then((data) => setPendingCount(data.length))
      .catch(() => {});
  }, [location.pathname]);

  const navLinks = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/matches", label: "Find Exchanges", icon: Sparkles },
    { to: "/register", label: "Register Property", icon: PlusCircle },
    { to: "/my-properties", label: "My Properties", icon: Building2 },
    {
      to: "/admin",
      label: "Admin Review",
      icon: ShieldCheck,
      badge: pendingCount > 0 ? pendingCount : undefined
    }
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 block leading-tight">
                ASSET<span className="text-blue-600">SWAP</span>
              </span>
              <span className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase block">
                Direct & Multi-Party Real Estate Exchange
              </span>
            </div>
          </Link>

          {/* Nav Items */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-blue-50 text-blue-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-500"}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs font-bold rounded-full bg-amber-500 text-white animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Persona Switcher */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm">
              <UserCircle2 className="w-4 h-4 text-slate-500" />
              <div className="text-left hidden sm:block">
                <span className="text-[10px] uppercase font-bold text-slate-600 block leading-none">
                  Acting As:
                </span>
                <span className="text-xs font-semibold text-slate-900 max-w-[140px] truncate block">
                  {currentUser?.name || "Loading..."}
                </span>
              </div>
              <select
                value={currentUser?.id || ""}
                onChange={(e) => switchUser(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer pl-1 pr-2"
                aria-label="Switch User Persona"
              >
                <optgroup label="Property Owners">
                  <option value="OWNER-001">Naveen Hegde (Agri Land 2 Cr)</option>
                  <option value="OWNER-002">Sunil Kulkarni (Farmhouse 2 Cr)</option>
                  <option value="OWNER-007">Arun Deshmukh (Commercial 3 Cr)</option>
                  <option value="OWNER-008">Bhavana Shetty (House 2 Cr)</option>
                  <option value="OWNER-009">Chandrasekhar Gowda (Agri 2.5 Cr)</option>
                  <option value="OWNER-014">Pooja Varma (Pending Review)</option>
                </optgroup>
                <optgroup label="Platform Administration">
                  <option value="admin-001">Kavitha Murthy (Broker Review Specialist)</option>
                </optgroup>
              </select>
            </div>

            {isAdmin && (
              <span className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin Mode
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
