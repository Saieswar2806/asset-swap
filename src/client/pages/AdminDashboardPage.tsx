import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Building2,
  ArrowLeftRight,
  Activity,
  Settings,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  UserX,
  Eye,
  Award,
  Building,
  Bell,
  Calendar,
  MapPin,
  MessageSquare,
  FileText,
  Check,
  ExternalLink,
  Phone,
  Mail,
  Info
} from "lucide-react";
import { DashboardLayout, type NavItem } from "../components/DashboardLayout.js";
import { api } from "../api.js";
import { useUser } from "../context/UserContext.js";
import { PropertyCard, formatCurrency } from "../components/PropertyCard.js";
import { BrokerDetailModal } from "../components/BrokerDetailModal.js";
import type { Listing, User } from "../types.js";

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAdmin, isAuthenticated, loading: authLoading } = useUser();
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Overview metrics
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Users tab state
  const [userList, setUserList] = useState<User[]>([]);
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [userSearch, setUserSearch] = useState<string>("");

  // Brokers tab state
  const [brokerList, setBrokerList] = useState<User[]>([]);
  const [brokerStatusFilter, setBrokerStatusFilter] = useState<string>("all");

  // Listings tab state
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingStatusFilter, setListingStatusFilter] = useState<string>("all");

  // Activity logs tab state
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  // Action feedback
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Broker Application Details Modal
  const [selectedBrokerId, setSelectedBrokerId] = useState<string | null>(null);

  // Rejection modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetBrokerId, setTargetBrokerId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Accepted Exchanges Tab State
  const [acceptedExchanges, setAcceptedExchanges] = useState<any[]>([]);
  const [exchangeStatusFilter, setExchangeStatusFilter] = useState<string>("all");
  const [exchangeSearch, setExchangeSearch] = useState<string>("");
  const [selectedExchange, setSelectedExchange] = useState<any | null>(null);
  const [coordinationModalOpen, setCoordinationModalOpen] = useState(false);
  const [coordTab, setCoordTab] = useState<"status" | "site_visit" | "notes" | "timeline">("status");
  const [newStatus, setNewStatus] = useState<string>("awaiting_coordination");
  const [statusNotes, setStatusNotes] = useState<string>("");
  const [siteVisitDate, setSiteVisitDate] = useState<string>("");
  const [siteVisitLocation, setSiteVisitLocation] = useState<string>("");
  const [siteVisitNotes, setSiteVisitNotes] = useState<string>("");
  const [coordNote, setCoordNote] = useState<string>("");
  const [submittingCoord, setSubmittingCoord] = useState(false);

  // Real Notifications State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || !isAdmin) {
        navigate("/login");
      }
    }
  }, [authLoading, isAuthenticated, isAdmin, navigate]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [m, u, b, l, a, ex, notifs] = await Promise.all([
        api.getAdminMetrics().catch(() => null),
        api.getAdminUsers({ role: userRoleFilter === "all" ? undefined : userRoleFilter, search: userSearch || undefined }).catch(() => []),
        api.getAdminBrokers({ status: brokerStatusFilter === "all" ? undefined : brokerStatusFilter }).catch(() => []),
        api.getListings({ status: listingStatusFilter === "all" ? undefined : listingStatusFilter }).catch(() => []),
        api.getActivityLogs({ limit: 50 }).catch(() => []),
        api.getAdminAcceptedExchanges({ status: exchangeStatusFilter === "all" ? undefined : exchangeStatusFilter, search: exchangeSearch || undefined }).catch(() => []),
        api.getAdminNotifications().catch(() => ({ data: [], unreadCount: 0 }))
      ]);

      setMetrics(m);
      setUserList(u);
      setBrokerList(b);
      setListings(l);
      setActivityLogs(a);
      setAcceptedExchanges(ex);
      setNotifications(notifs.data || []);
      setUnreadNotifs(notifs.unreadCount || 0);
    } catch (err: any) {
      console.error("Failed to load admin data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, userRoleFilter, brokerStatusFilter, listingStatusFilter, exchangeStatusFilter]);

  const handleToggleUserStatus = async (user: User) => {
    const newStatus = user.status === "active" ? "suspended" : "active";
    try {
      const msg = await api.updateUserStatus(user.id, newStatus);
      setFeedback({ message: msg, type: "success" });
      await loadData();
    } catch (err: any) {
      setFeedback({ message: err.message, type: "error" });
    }
  };

  const handleApproveBroker = async (brokerId: string) => {
    try {
      const msg = await api.reviewBrokerApplication(brokerId, "approve");
      setFeedback({ message: msg, type: "success" });
      await loadData();
    } catch (err: any) {
      setFeedback({ message: err.message, type: "error" });
    }
  };

  const handleOpenRejectBroker = (brokerId: string) => {
    setTargetBrokerId(brokerId);
    setRejectionReason("License verification could not be validated with state registry.");
    setRejectModalOpen(true);
  };

  const handleConfirmRejectBroker = async () => {
    if (!targetBrokerId) return;
    try {
      const msg = await api.reviewBrokerApplication(targetBrokerId, "reject", rejectionReason);
      setFeedback({ message: msg, type: "success" });
      setRejectModalOpen(false);
      setTargetBrokerId(null);
      await loadData();
    } catch (err: any) {
      setFeedback({ message: err.message, type: "error" });
    }
  };

  const pendingBrokerCount = brokerList.filter((b) => b.status === "pending").length;
  const awaitingCoordCount = metrics?.exchanges?.awaitingCoordination || 0;

  const handleOpenCoordination = (exchange: any) => {
    setSelectedExchange(exchange);
    setNewStatus(exchange.coordinationStatus || "awaiting_coordination");
    setStatusNotes("");
    setSiteVisitDate(exchange.siteVisitDate ? exchange.siteVisitDate.slice(0, 16) : "");
    setSiteVisitLocation(exchange.siteVisitLocation || "");
    setSiteVisitNotes(exchange.siteVisitNotes || "");
    setCoordNote("");
    setCoordTab("status");
    setCoordinationModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedExchange) return;
    setSubmittingCoord(true);
    try {
      const res = await api.updateExchangeCoordinationStatus(selectedExchange.id, newStatus, statusNotes);
      setFeedback({ message: res.message, type: "success" });
      setCoordinationModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFeedback({ message: err.message || "Failed to update coordination status", type: "error" });
    } finally {
      setSubmittingCoord(false);
    }
  };

  const handleScheduleSiteVisit = async () => {
    if (!selectedExchange || !siteVisitDate) {
      setFeedback({ message: "Please specify a site visit date and time.", type: "error" });
      return;
    }
    setSubmittingCoord(true);
    try {
      const res = await api.scheduleSiteVisit(selectedExchange.id, {
        siteVisitDate,
        siteVisitLocation,
        siteVisitNotes
      });
      setFeedback({ message: res.message, type: "success" });
      setCoordinationModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFeedback({ message: err.message || "Failed to schedule site visit", type: "error" });
    } finally {
      setSubmittingCoord(false);
    }
  };

  const handleAddCoordNote = async () => {
    if (!selectedExchange || !coordNote.trim()) return;
    setSubmittingCoord(true);
    try {
      const res = await api.addExchangeCoordinationNote(selectedExchange.id, coordNote);
      setFeedback({ message: res.message, type: "success" });
      setCoordNote("");
      const updatedList = await api.getAdminAcceptedExchanges();
      setAcceptedExchanges(updatedList);
      const updatedItem = updatedList.find((e: any) => e.id === selectedExchange.id);
      if (updatedItem) setSelectedExchange(updatedItem);
    } catch (err: any) {
      setFeedback({ message: err.message || "Failed to add note", type: "error" });
    } finally {
      setSubmittingCoord(false);
    }
  };

  const handleMarkAllNotifsRead = async () => {
    try {
      await api.markAllAdminNotificationsRead();
      setUnreadNotifs(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: 1 })));
    } catch (err: any) {
      console.error(err);
    }
  };

  const navItems: NavItem[] = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "users", label: "Users", icon: Users },
    { id: "brokers", label: "Broker Applications", icon: ShieldCheck, badge: pendingBrokerCount > 0 ? pendingBrokerCount : undefined },
    { id: "listings", label: "Property Listings", icon: Building2 },
    { id: "proposals", label: "Accepted Exchanges", icon: ArrowLeftRight, badge: awaitingCoordCount > 0 ? awaitingCoordCount : undefined },
    { id: "activity", label: "Platform Activity", icon: Activity },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  const adminHeaderNotification = (
    <div className="relative">
      <button
        onClick={() => setShowNotifMenu(!showNotifMenu)}
        className="relative p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
        title="Admin Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadNotifs > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
        )}
      </button>

      {showNotifMenu && (
        <div className="absolute right-0 top-11 w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-50 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 font-bold text-slate-900">
            <span>Admin Alerts ({unreadNotifs} unread)</span>
            <div className="flex items-center gap-2">
              {unreadNotifs > 0 && (
                <button
                  onClick={handleMarkAllNotifsRead}
                  className="text-[10px] text-blue-600 hover:underline"
                >
                  Mark all read
                </button>
              )}
              <button onClick={() => setShowNotifMenu(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
          </div>
          {notifications.length === 0 ? (
            <p className="text-slate-400 py-4 text-center">No notifications at this time.</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto py-1">
              {notifications.slice(0, 8).map((n) => (
                <div key={n.id} className={`py-2 space-y-0.5 ${!n.isRead ? "bg-blue-50/40 p-1.5 rounded" : ""}`}>
                  <div className="font-semibold text-slate-900 flex items-center justify-between">
                    <span>{n.title}</span>
                    {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                  </div>
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
    </div>
  );

  return (
    <DashboardLayout
      role="admin"
      title="Administrator Control Center"
      subtitle="Platform-wide governance, user management, broker verification, and exchange activity monitoring"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      navItems={navItems}
      headerRight={adminHeaderNotification}
    >
      <div className="space-y-6">
        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 1: OVERVIEW DASHBOARD */}
        {/* ============================================================ */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Users</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">
                  {metrics?.users?.totalUsers ?? userList.length}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {metrics?.users?.totalOwners ?? 0} owners, {metrics?.users?.totalBrokers ?? 0} brokers
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Broker Applications</span>
                <span className="text-2xl font-bold text-amber-600 mt-1 block">
                  {metrics?.users?.pendingBrokers ?? pendingBrokerCount}
                </span>
                <span className="text-[10px] text-amber-700 mt-1 block">
                  Pending review and approval
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Listings</span>
                <span className="text-2xl font-bold text-blue-700 mt-1 block">
                  {metrics?.listings?.totalListings ?? listings.length}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">
                  {metrics?.listings?.approvedListings ?? 0} broker-reviewed
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Swap Proposals</span>
                <span className="text-2xl font-bold text-teal-700 mt-1 block">
                  {metrics?.exchanges?.activeProposals ?? 0}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {metrics?.exchanges?.completedTrades ?? 0} accepted exchanges
                </span>
              </div>
            </div>

            {/* Quick Actions & High Priority Queue */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Broker Applications Preview */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <h3 className="text-sm font-bold text-slate-900">Pending Broker Applications</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab("brokers")}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    View All ({pendingBrokerCount})
                  </button>
                </div>

                {brokerList.filter((b) => b.status === "pending").length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No pending broker applications at this time.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {brokerList.filter((b) => b.status === "pending").slice(0, 3).map((b) => (
                      <div key={b.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <button
                            onClick={() => setSelectedBrokerId(b.id)}
                            className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-left"
                          >
                            {b.name}
                          </button>
                          <div className="text-[11px] text-slate-500">{b.agency || "Independent"} • {b.licenseNumber || "License Not provided"}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedBrokerId(b.id)}
                            className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors"
                            title="View Complete Application Details"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Details</span>
                          </button>
                          <button
                            onClick={() => handleApproveBroker(b.id)}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-[11px] hover:bg-emerald-700 shadow-xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleOpenRejectBroker(b.id)}
                            className="px-2.5 py-1 bg-red-600 text-white rounded-lg font-bold text-[11px] hover:bg-red-700 shadow-xs"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* System Audit Preview */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-slate-900">Recent Platform Activity</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab("activity")}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    View All Logs
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {activityLogs.slice(0, 4).map((log) => (
                    <div key={log.id} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800 capitalize">{log.action.replace(/_/g, " ")}</span>
                        <div className="text-[11px] text-slate-400">By {log.performedBy} on #{log.entityId}</div>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: USER MANAGEMENT */}
        {/* ============================================================ */}
        {activeTab === "users" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Registered Platform Users</h2>
                <p className="text-xs text-slate-500">Manage user accounts, monitor account status, and enforce access privileges.</p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">All Roles</option>
                  <option value="owner">Property Owners</option>
                  <option value="broker">Brokers</option>
                  <option value="admin">Administrators</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-2.5 text-left">User</th>
                    <th className="px-4 py-2.5 text-left">Role</th>
                    <th className="px-4 py-2.5 text-left">Status</th>
                    <th className="px-4 py-2.5 text-left">Contact</th>
                    <th className="px-4 py-2.5 text-left">Registered Date</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {userList.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            {u.name}
                            {isSelf && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded font-bold">You</span>}
                          </div>
                          <div className="text-[11px] text-slate-500">{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase border ${
                              u.role === "admin"
                                ? "bg-purple-100 text-purple-800 border-purple-200"
                                : u.role === "broker"
                                ? "bg-teal-100 text-teal-800 border-teal-200"
                                : "bg-blue-100 text-blue-800 border-blue-200"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                              u.status === "active"
                                ? "bg-emerald-100 text-emerald-800"
                                : u.status === "pending"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">
                          {u.phone || "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!isSelf && (
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
                                u.status === "active"
                                  ? "bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-700 border border-slate-200"
                                  : "bg-emerald-600 text-white hover:bg-emerald-700"
                              }`}
                            >
                              {u.status === "active" ? "Suspend" : "Activate"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: BROKER APPLICATIONS */}
        {/* ============================================================ */}
        {activeTab === "brokers" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden space-y-4 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Broker Onboarding & Verification</h2>
                <p className="text-xs text-slate-500">
                  Verify professional licenses and manage authorization for property valuation reviews.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={brokerStatusFilter}
                  onChange={(e) => setBrokerStatusFilter(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-600"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending Approval</option>
                  <option value="active">Approved (Active)</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Broker & Firm</th>
                    <th className="px-4 py-2.5 text-left">License & Jurisdiction</th>
                    <th className="px-4 py-2.5 text-left">Experience</th>
                    <th className="px-4 py-2.5 text-left">Status</th>
                    <th className="px-4 py-2.5 text-right">Review Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {brokerList.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedBrokerId(b.id)}
                          className="font-bold text-slate-900 hover:text-blue-600 transition-colors text-left flex items-center gap-1.5 group"
                          title="Click to view complete application details"
                        >
                          <span>{b.name}</span>
                          <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 opacity-60 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <div className="text-[11px] text-slate-500">{b.agency || "Independent"} • {b.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-[11px] font-bold text-slate-800">{b.licenseNumber || "—"}</div>
                        <div className="text-[11px] text-slate-500">{b.jurisdiction || "Karnataka"}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-semibold">
                        {b.experienceYears ? `${b.experienceYears} Years` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            b.status === "active"
                              ? "bg-emerald-100 text-emerald-800"
                              : b.status === "pending"
                              ? "bg-amber-100 text-amber-800 animate-pulse"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedBrokerId(b.id)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs shadow-xs flex items-center gap-1 transition-colors"
                            title="View Complete Application Details"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Details</span>
                          </button>
                          {b.status === "pending" ? (
                            <>
                              <button
                                onClick={() => handleApproveBroker(b.id)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-xs"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleOpenRejectBroker(b.id)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs shadow-xs"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-400 text-[11px] ml-1">
                              {b.status === "active" ? "Active" : "Rejected"}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: PROPERTY LISTINGS */}
        {/* ============================================================ */}
        {activeTab === "listings" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <h2 className="text-base font-bold text-slate-900">Platform Property Listings</h2>
                <p className="text-xs text-slate-500">Monitor all 112+ real estate listings across Karnataka districts.</p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={listingStatusFilter}
                  onChange={(e) => setListingStatusFilter(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">All Statuses ({listings.length})</option>
                  <option value="reviewed">Approved (Reviewed)</option>
                  <option value="submitted">Under Review</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listings.map((l) => (
                <PropertyCard key={l.id} listing={l} showWants={true} />
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: ACCEPTED EXCHANGES & COORDINATION */}
        {/* ============================================================ */}
        {activeTab === "proposals" && (
          <div className="space-y-6">
            {/* Coordination Console Header */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-wider">
                    Post-Consensus Operations
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {acceptedExchanges.length} Accepted Exchanges
                  </span>
                </div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Accepted Exchanges Facilitation Queue
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage administrative coordination, schedule verified site inspections, and record operational logs for unanimously accepted proposals.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => navigate("/proposals")}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Proposals Explorer
                </button>
                <button
                  onClick={loadData}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  <span>Refresh Queue</span>
                </button>
              </div>
            </div>

            {/* Filter Tabs & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                {[
                  { id: "all", label: "All Accepted", count: acceptedExchanges.length },
                  { id: "awaiting_coordination", label: "Awaiting Action", count: acceptedExchanges.filter((e) => e.coordinationStatus === "awaiting_coordination").length },
                  { id: "site_visit_scheduled", label: "Site Visit Scheduled", count: acceptedExchanges.filter((e) => e.coordinationStatus === "site_visit_scheduled").length },
                  { id: "coordination_in_progress", label: "In Progress", count: acceptedExchanges.filter((e) => e.coordinationStatus === "coordination_in_progress").length },
                  { id: "completed", label: "Completed", count: acceptedExchanges.filter((e) => e.coordinationStatus === "completed" || e.coordinationStatus === "closed").length }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setExchangeStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      exchangeStatusFilter === tab.id
                        ? "bg-slate-900 text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      exchangeStatusFilter === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by ref, owner or asset..."
                  value={exchangeSearch}
                  onChange={(e) => setExchangeSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            {/* Exchanges Queue */}
            {isLoading ? (
              <div className="py-20 text-center bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs font-semibold text-slate-600">Retrieving accepted exchange files...</p>
              </div>
            ) : acceptedExchanges.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs space-y-3">
                <ArrowLeftRight className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-900">No Accepted Exchanges in this Queue</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  When all participating property owners unanimously accept an exchange proposal, it automatically transitions here for administrative facilitation.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {acceptedExchanges.map((item) => {
                  const statusColors: Record<string, string> = {
                    awaiting_coordination: "bg-blue-50 text-blue-800 border-blue-200",
                    coordination_in_progress: "bg-amber-50 text-amber-800 border-amber-200",
                    site_visit_scheduled: "bg-purple-50 text-purple-800 border-purple-300 font-bold",
                    site_visit_pending: "bg-purple-50 text-purple-700 border-purple-200",
                    legal_review_in_progress: "bg-indigo-50 text-indigo-700 border-indigo-200",
                    completed: "bg-emerald-50 text-emerald-800 border-emerald-300",
                    closed: "bg-slate-100 text-slate-600 border-slate-300"
                  };
                  const badgeClass = statusColors[item.coordinationStatus] || "bg-slate-100 text-slate-700 border-slate-200";

                  return (
                    <div
                      key={item.id}
                      className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition-all"
                    >
                      {/* Card Header */}
                      <div className="bg-slate-50 border-b border-slate-200 p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-blue-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                              Ref: {item.ref}
                            </span>
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200/80 text-slate-700">
                              {item.partyCount === 2 ? "2-Party Direct Exchange" : "3-Party Circular Exchange"}
                            </span>
                            <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${badgeClass}`}>
                              {item.coordinationStatus.replace(/_/g, " ")}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-900">{item.explanation}</h3>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400">
                            Accepted: {new Date(item.acceptedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          <button
                            onClick={() => handleOpenCoordination(item)}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Manage Coordination</span>
                          </button>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 sm:p-6 space-y-4">
                        {/* Site Visit Banner if scheduled */}
                        {item.siteVisitDate && (
                          <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl flex items-center justify-between text-xs text-purple-900">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                              <span>
                                <strong>Site Visit Inspection:</strong>{" "}
                                {new Date(item.siteVisitDate).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                {item.siteVisitLocation && ` • ${item.siteVisitLocation}`}
                              </span>
                            </div>
                            <span className="font-bold text-purple-700 uppercase text-[10px] bg-purple-100 px-2 py-0.5 rounded">
                              Scheduled
                            </span>
                          </div>
                        )}

                        {/* Participants & Properties Breakdown */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="bg-slate-100/70 px-4 py-2 text-[11px] font-bold text-slate-600 uppercase tracking-wider grid grid-cols-12 gap-2">
                            <div className="col-span-4">Owner & Property</div>
                            <div className="col-span-3">Contact (Staff Only)</div>
                            <div className="col-span-3">Asset Valuation</div>
                            <div className="col-span-2 text-right">Cash Boot</div>
                          </div>

                          <div className="divide-y divide-slate-100 text-xs">
                            {item.participants.map((p: any) => (
                              <div key={p.listingId} className="px-4 py-3 grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-4">
                                  <div className="font-bold text-slate-900">{p.ownerName}</div>
                                  <div className="text-[11px] text-slate-500 font-mono">
                                    Asset #{p.listingId} ({p.givesPropertyType.replace(/_/g, " ")})
                                  </div>
                                </div>

                                <div className="col-span-3 text-slate-600 space-y-0.5">
                                  <div className="flex items-center gap-1 font-mono text-[11px]">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    <span>{p.ownerPhone || "No phone"}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-[11px] truncate">
                                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate">{p.ownerEmail || "No email"}</span>
                                  </div>
                                </div>

                                <div className="col-span-3 space-y-0.5">
                                  <div>Gives: <strong className="text-slate-800">{formatCurrency(p.givesValue)}</strong></div>
                                  <div>Receives: <strong className="text-slate-800">{formatCurrency(p.receivesValue)}</strong></div>
                                </div>

                                <div className="col-span-2 text-right">
                                  {p.action === "pay" || p.action === "pays" ? (
                                    <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                                      Pays {formatCurrency(p.amount)}
                                    </span>
                                  ) : p.action === "receive" || p.action === "receives" ? (
                                    <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 text-[11px]">
                                      Receives {formatCurrency(p.amount)}
                                    </span>
                                  ) : (
                                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                                      ₹0 Pure Swap
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* COORDINATION MANAGEMENT MODAL */}
        {/* ============================================================ */}
        {coordinationModalOpen && selectedExchange && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-blue-400 bg-blue-900/60 px-2 py-0.5 rounded">
                      Ref: {selectedExchange.ref}
                    </span>
                    <span className="text-xs text-slate-400">
                      Accepted {new Date(selectedExchange.acceptedAt).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">
                    Administrative Exchange Facilitation
                  </h3>
                </div>
                <button
                  onClick={() => setCoordinationModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {/* Modal Subtabs */}
              <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2 text-xs font-bold">
                {[
                  { id: "status", label: "Coordination Status", icon: CheckCircle2 },
                  { id: "site_visit", label: "Schedule Site Visit", icon: Calendar },
                  { id: "notes", label: "Staff Notes", icon: MessageSquare },
                  { id: "timeline", label: "Timeline & Audit", icon: Activity }
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setCoordTab(t.id as any)}
                      className={`flex items-center gap-1.5 pb-2.5 px-3 border-b-2 transition-all ${
                        coordTab === t.id
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="p-6 space-y-4">
                {/* TAB A: Status Update */}
                {coordTab === "status" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Operational Facilitation Status
                      </label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="awaiting_coordination">Awaiting Administrative Coordination</option>
                        <option value="coordination_in_progress">Coordination in Progress</option>
                        <option value="site_visit_pending">Site Visit Pending</option>
                        <option value="site_visit_scheduled">Site Visit Scheduled</option>
                        <option value="legal_review_in_progress">Title & Document Review in Progress</option>
                        <option value="completed">Coordination Facilitation Completed</option>
                        <option value="closed">Concluded / Archived</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Status Update Remarks (Optional)
                      </label>
                      <textarea
                        rows={3}
                        value={statusNotes}
                        onChange={(e) => setStatusNotes(e.target.value)}
                        placeholder="e.g. Spoke with both owners; preliminary survey records verified with tahsildar office."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        onClick={() => setCoordinationModalOpen(false)}
                        className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleUpdateStatus}
                        disabled={submittingCoord}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                      >
                        {submittingCoord ? "Updating..." : "Save Status Update"}
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB B: Site Visit Scheduling */}
                {coordTab === "site_visit" && (
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                      Scheduling a site inspection records the appointment on the exchange file and automatically dispatches alerts to all participating property owners.
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Site Visit Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={siteVisitDate}
                        onChange={(e) => setSiteVisitDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Inspection Meeting Location / Property Address
                      </label>
                      <input
                        type="text"
                        value={siteVisitLocation}
                        onChange={(e) => setSiteVisitLocation(e.target.value)}
                        placeholder="e.g. Asset ASSET-001 Site, Koramangala 4th Block"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Inspection Notes & Instructions for Owners
                      </label>
                      <textarea
                        rows={3}
                        value={siteVisitNotes}
                        onChange={(e) => setSiteVisitNotes(e.target.value)}
                        placeholder="e.g. Please bring original RTC/Pahani extract and certified encumbrance certificate."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        onClick={() => setCoordinationModalOpen(false)}
                        className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleScheduleSiteVisit}
                        disabled={submittingCoord || !siteVisitDate}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                      >
                        {submittingCoord ? "Scheduling..." : "Schedule & Notify Owners"}
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB C: Staff Notes */}
                {coordTab === "notes" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Add Administrative Coordination Note
                      </label>
                      <textarea
                        rows={4}
                        value={coordNote}
                        onChange={(e) => setCoordNote(e.target.value)}
                        placeholder="Record staff phone conversations, lawyer notes, document status, or owner requests..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleAddCoordNote}
                        disabled={submittingCoord || !coordNote.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs"
                      >
                        {submittingCoord ? "Saving..." : "Save Note"}
                      </button>
                    </div>

                    {selectedExchange.coordinationNotes && (
                      <div className="pt-3 border-t border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Latest Logged Notes</span>
                        <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 whitespace-pre-wrap">
                          {selectedExchange.coordinationNotes}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB D: Timeline & Audit */}
                {coordTab === "timeline" && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Coordination Audit Log
                    </h4>

                    {selectedExchange.timeline?.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center">No coordination timeline events recorded yet.</p>
                    ) : (
                      <div className="divide-y divide-slate-100 text-xs max-h-64 overflow-y-auto">
                        {selectedExchange.timeline?.map((event: any) => (
                          <div key={event.id} className="py-2.5 space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 capitalize">
                                {event.action.replace(/_/g, " ")}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(event.createdAt).toLocaleString()}
                              </span>
                            </div>
                            {event.notes && (
                              <p className="text-slate-600 text-[11px]">{event.notes}</p>
                            )}
                            <div className="text-[10px] text-slate-400">
                              By {event.performedBy}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 6: ACTIVITY LOGS */}
        {/* ============================================================ */}
        {activeTab === "activity" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 space-y-3">
            <h3 className="text-base font-bold text-slate-900">Platform Audit Trail & Security Events</h3>
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {activityLogs.map((log) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{log.action.replace(/_/g, " ")}</span>
                    <span className="ml-2 font-mono text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      #{log.entityId}
                    </span>
                    <div className="text-[11px] text-slate-500">Performed by {log.performedBy}</div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 7: SETTINGS */}
        {/* ============================================================ */}
        {activeTab === "settings" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs max-w-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Administrator Account Settings</h3>
            <div className="text-xs space-y-2 text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div><strong className="text-slate-800">Admin Name:</strong> {currentUser?.name}</div>
              <div><strong className="text-slate-800">Email:</strong> {currentUser?.email}</div>
              <div><strong className="text-slate-800">Role:</strong> Platform Administrator</div>
              <div><strong className="text-slate-800">Status:</strong> Active & Verified</div>
            </div>
          </div>
        )}
      </div>

      {/* Rejection Reason Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reject Broker Application</h3>
            <p className="text-xs text-slate-500">
              Provide a clear reason for rejecting this broker application. The reason will be recorded in the audit trail.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRejectBroker}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Broker Application Details Modal */}
      <BrokerDetailModal
        brokerId={selectedBrokerId}
        onClose={() => setSelectedBrokerId(null)}
        onStatusUpdated={loadData}
      />
    </DashboardLayout>
  );
};
