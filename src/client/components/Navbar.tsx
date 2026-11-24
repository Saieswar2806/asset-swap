import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeftRight, Building2, UserCircle2, ShieldCheck, PlusCircle, LayoutDashboard, Sparkles, Activity, LogIn, LogOut, ChevronRight } from "lucide-react";
import { useUser } from "../context/UserContext.js";
import { api } from "../api.js";

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, isAdmin, isBroker, isOwner, logout } = useUser();
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    api.getAdminReviewListings("submitted")
      .then((data) => setPendingCount(data.length))
      .catch(() => {});
  }, [location.pathname]);

  const dashboardRoute = isAdmin
    ? "/admin/dashboard"
    : isBroker
    ? "/broker/dashboard"
    : "/owner/dashboard";

  const navLinks: Array<{ to: string; label: string; icon: any; badge?: number | string }> = [
    { to: "/", label: "Overview", icon: LayoutDashboard },
    { to: "/matches", label: "Explore Matches", icon: Sparkles },
    { to: "/proposals", label: "Swap Proposals", icon: ArrowLeftRight },
    { to: "/activity", label: "Activity", icon: Activity }
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

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

          {/* Real Authentication Header Actions */}
          <div className="flex items-center gap-2.5">
            {isAuthenticated ? (
              <>
                <Link
                  to={dashboardRoute}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-xs transition-colors"
                >
                  <span>My Dashboard</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>

                <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                  <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] uppercase">
                    {currentUser?.name ? currentUser.name.slice(0, 2) : "U"}
                  </div>
                  <div className="text-left text-xs leading-none">
                    <span className="font-bold text-slate-900 block max-w-[120px] truncate">{currentUser?.name}</span>
                    <span className="text-[10px] font-bold uppercase text-slate-400">{currentUser?.role}</span>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
                <Link
                  to="/register-owner"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-colors"
                >
                  <span>Register</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
