import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeftRight, Building2, UserCircle2, ShieldCheck, PlusCircle, LayoutDashboard, Sparkles, Activity, LogIn, LogOut, ChevronRight, ShoppingBag, Tag } from "lucide-react";
import { useUser } from "../context/UserContext.js";

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, isAdmin, isBroker, isOwner, logout } = useUser();

  const dashboardRoute = isAdmin
    ? "/admin/dashboard"
    : isBroker
    ? "/broker/dashboard"
    : "/owner/dashboard";

  // Navigation Links strictly conditioned on authentication and role
  const navLinks: Array<{ to: string; label: string; icon: any }> = !isAuthenticated
    ? []
    : isOwner
    ? [
        { to: "/owner/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { to: "/swap", label: "Swap", icon: ArrowLeftRight },
        { to: "/buy", label: "Buy", icon: ShoppingBag },
        { to: "/sell", label: "Sell", icon: Tag },
        { to: "/my-properties", label: "My Properties", icon: Building2 },
        { to: "/proposals", label: "Proposals", icon: Sparkles }
      ]
    : isBroker
    ? [
        { to: "/broker/dashboard", label: "Broker Dashboard", icon: LayoutDashboard }
      ]
    : [
        { to: "/admin/dashboard", label: "Admin Console", icon: ShieldCheck }
      ];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand (Clicks go to Dashboard if authenticated, else Login) */}
          <Link to={isAuthenticated ? dashboardRoute : "/login"} className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
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

          {/* Nav Items (Only shown for authenticated users) */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-blue-50 text-blue-700 shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-blue-600" : "text-slate-500"}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Real Authentication Header Actions */}
          <div className="flex items-center gap-2.5">
            {isAuthenticated ? (
              <>
                {isOwner && (
                  <Link
                    to="/register"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-colors"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Property</span>
                  </Link>
                )}

                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
                  <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] uppercase">
                    {currentUser?.name ? currentUser.name.slice(0, 2) : "U"}
                  </div>
                  <div className="text-left text-xs leading-none">
                    <span className="font-bold text-slate-900 block max-w-[120px] truncate">{currentUser?.name}</span>
                    <span className="text-[9px] font-bold uppercase text-slate-400">{currentUser?.role}</span>
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
