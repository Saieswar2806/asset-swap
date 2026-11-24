import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeftRight,
  LayoutDashboard,
  Users,
  ShieldCheck,
  Building2,
  FileCheck2,
  Activity,
  Settings,
  LogOut,
  Sparkles,
  PlusCircle,
  Menu,
  X,
  UserCircle2,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShieldAlert
} from "lucide-react";
import { useUser } from "../context/UserContext.js";

export interface NavItem {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  badge?: number | string;
}

interface DashboardLayoutProps {
  role: "admin" | "broker" | "owner";
  title: string;
  subtitle?: string;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: React.ReactNode;
  navItems: NavItem[];
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  role,
  title,
  subtitle,
  activeTab,
  onTabChange,
  children,
  navItems
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, isAuthenticated } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const roleBadgeInfo = {
    admin: { label: "Administrator", bg: "bg-purple-100 text-purple-800 border-purple-200" },
    broker: { label: "Verified Broker", bg: "bg-teal-100 text-teal-800 border-teal-200" },
    owner: { label: "Property Owner", bg: "bg-blue-100 text-blue-800 border-blue-200" }
  };

  const currentBadge = roleBadgeInfo[role];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row text-slate-900">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-slate-200 shrink-0 select-none">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 block leading-tight">
                ASSET<span className="text-blue-600">SWAP</span>
              </span>
              <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase block">
                {currentBadge.label} Portal
              </span>
            </div>
          </Link>
        </div>

        {/* User Card Pill */}
        <div className="p-4 mx-3 my-3 bg-slate-50 border border-slate-200/80 rounded-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase">
              {currentUser?.name ? currentUser.name.slice(0, 2) : "US"}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-slate-900 truncate block">
                {currentUser?.name || "Authenticated User"}
              </span>
              <span className="text-[10px] text-slate-500 truncate block">
                {currentUser?.email || "user@asset-swap.local"}
              </span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px]">
            <span className={`px-2 py-0.5 rounded-full font-bold border ${currentBadge.bg}`}>
              {currentBadge.label}
            </span>
            <span className="text-emerald-700 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 space-y-1 py-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left ${
                  isActive
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer / Logout */}
        <div className="p-3 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
          >
            <LogOut className="w-4 h-4 text-red-500" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-slate-500 hidden sm:block">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${currentBadge.bg}`}>
              {currentBadge.label}
            </span>
            <button
              onClick={handleLogout}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onTabChange(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-left ${
                    isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg text-left"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
