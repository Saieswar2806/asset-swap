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
  Building
} from "lucide-react";
import { DashboardLayout, type NavItem } from "../components/DashboardLayout.js";
import { api } from "../api.js";
import { useUser } from "../context/UserContext.js";
import { PropertyCard, formatCurrency } from "../components/PropertyCard.js";
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

  // Rejection modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [targetBrokerId, setTargetBrokerId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

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
      const [m, u, b, l, a] = await Promise.all([
        api.getAdminMetrics().catch(() => null),
        api.getAdminUsers({ role: userRoleFilter === "all" ? undefined : userRoleFilter, search: userSearch || undefined }).catch(() => []),
        api.getAdminBrokers({ status: brokerStatusFilter === "all" ? undefined : brokerStatusFilter }).catch(() => []),
        api.getListings({ status: listingStatusFilter === "all" ? undefined : listingStatusFilter }).catch(() => []),
        api.getActivityLogs({ limit: 50 }).catch(() => [])
      ]);

      setMetrics(m);
      setUserList(u);
      setBrokerList(b);
      setListings(l);
      setActivityLogs(a);
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
  }, [isAdmin, userRoleFilter, brokerStatusFilter, listingStatusFilter]);

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

  const navItems: NavItem[] = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "users", label: "Users", icon: Users },
    { id: "brokers", label: "Broker Applications", icon: ShieldCheck, badge: pendingBrokerCount > 0 ? pendingBrokerCount : undefined },
    { id: "listings", label: "Property Listings", icon: Building2 },
    { id: "proposals", label: "Swap Proposals", icon: ArrowLeftRight },
    { id: "activity", label: "Platform Activity", icon: Activity },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  return (
    <DashboardLayout
      role="admin"
      title="Administrator Control Center"
      subtitle="Platform-wide governance, user management, broker verification, and exchange activity monitoring"
      activeTab={activeTab}
      onTabChange={setActiveTab}
      navItems={navItems}
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
                          <div className="font-bold text-slate-900">{b.name}</div>
                          <div className="text-[11px] text-slate-500">{b.agency || "Independent"} • {b.licenseNumber}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
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
                    <tr key={b.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{b.name}</div>
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
                        {b.status === "pending" ? (
                          <div className="flex items-center justify-end gap-1.5">
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
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">
                            {b.status === "active" ? "Valuation Privileges Active" : "Rejected"}
                          </span>
                        )}
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
        {/* TAB 5: SWAP PROPOSALS */}
        {/* ============================================================ */}
        {activeTab === "proposals" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-center space-y-3">
            <ArrowLeftRight className="w-12 h-12 text-blue-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">Platform Swap Proposals Registry</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Monitor active bilateral proposals and 3-way exchange cycles.
            </p>
            <div className="pt-2">
              <button
                onClick={() => navigate("/proposals")}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
              >
                Open Full Proposals Explorer
              </button>
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
    </DashboardLayout>
  );
};
