import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  ArrowLeftRight,
  ShoppingBag,
  Tag,
  UserCircle2,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronRight
} from "lucide-react";
import { useUser } from "../context/UserContext.js";
import { api } from "../api.js";
import { AssetSwapLogo } from "./AssetSwapLogo.js";

interface NavLinkItem {
  path: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  badge?: number | string;
}

export const OwnerLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, isAuthenticated } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      api.getOwnerNotifications()
        .then((res) => {
          setUnreadNotifs(res.unreadCount || 0);
          setNotifications(res.data || []);
        })
        .catch(() => {});
    }
  }, [isAuthenticated, location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const navItems: NavLinkItem[] = [
    { path: "/owner/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/my-properties", label: "My Properties", icon: Building2 },
    { path: "/swap", label: "Swap", icon: ArrowLeftRight },
    { path: "/buy", label: "Buy", icon: ShoppingBag },
    { path: "/sell", label: "Sell", icon: Tag },
    { path: "/profile", label: "Profile", icon: UserCircle2 }
  ];

  const isActive = (path: string) => {
    if (path === "/owner/dashboard") {
      return location.pathname === "/owner/dashboard" || location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row text-slate-900">
      {/* ============================================================ */}
      {/* DESKTOP SIDEBAR */}
      {/* ============================================================ */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-slate-200 shrink-0 select-none sticky top-0 h-screen z-30">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-slate-200">
          <Link to="/owner/dashboard" className="group transition-opacity hover:opacity-90">
            <AssetSwapLogo size="md" subtitle="Property Owner Console" />
          </Link>
        </div>

        {/* User Profile Pill */}
        <div className="p-3.5 mx-3 my-3 bg-slate-50 border border-slate-200/80 rounded-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {currentUser?.name ? currentUser.name.slice(0, 2) : "OW"}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-slate-900 truncate block">
                {currentUser?.name || "Verified Owner"}
              </span>
              <span className="text-[10px] text-slate-500 truncate block">
                {currentUser?.email || "owner@asset-swap.local"}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? "bg-blue-600 text-white shadow-xs font-bold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                      active ? "bg-white/20 text-white" : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section: Logout */}
        <div className="p-3 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* MOBILE TOP HEADER & DRAWER */}
      {/* ============================================================ */}
      <div className="lg:hidden bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="h-16 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              aria-label="Toggle Navigation Menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/owner/dashboard" className="flex items-center">
              <AssetSwapLogo size="sm" />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="relative p-2 text-slate-600 hover:text-slate-900 rounded-lg"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifs > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
              )}
            </button>
            <Link
              to="/profile"
              className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center uppercase"
            >
              {currentUser?.name ? currentUser.name.slice(0, 2) : "OW"}
            </Link>
          </div>
        </div>

        {/* Mobile Slide-down Drawer */}
        {mobileOpen && (
          <div className="border-t border-slate-200 px-4 py-3 bg-white space-y-1 shadow-lg animate-in slide-in-from-top duration-200">
            <div className="pb-2 mb-2 border-b border-slate-100 text-xs text-slate-500">
              Signed in as <strong className="text-slate-800">{currentUser?.name}</strong>
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold ${
                    active ? "bg-blue-600 text-white font-bold" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </Link>
              );
            })}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* MAIN CONTENT AREA */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Top Header Bar with Notifications */}
        <header className="hidden lg:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-8 sticky top-0 z-20">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Property Owner Portal</span>
            <ChevronRight className="w-3 h-3 text-slate-300" />
            <span className="font-semibold text-slate-800 capitalize">
              {navItems.find((n) => isActive(n.path))?.label || "Workspace"}
            </span>
          </div>

          <div className="flex items-center gap-4 relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="relative p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              title="System Alerts"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifs > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifMenu && (
              <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-50 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-bold text-slate-900">
                  <span>Notifications ({unreadNotifs} unread)</span>
                  <button onClick={() => setShowNotifMenu(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-slate-400 py-4 text-center">No alerts at this time.</p>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto py-1">
                    {notifications.slice(0, 5).map((n) => (
                      <div key={n.id} className="py-2 space-y-0.5">
                        <div className="font-semibold text-slate-900">{n.title}</div>
                        <div className="text-slate-500 text-[11px] leading-tight">{n.message}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="h-4 w-px bg-slate-200" />
            <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center uppercase">
                {currentUser?.name ? currentUser.name.slice(0, 2) : "OW"}
              </div>
              <span className="text-xs font-semibold text-slate-800">{currentUser?.name}</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
