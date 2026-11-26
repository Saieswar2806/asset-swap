import React from "react";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { UserProvider, useUser } from "./context/UserContext.js";
import { Navbar } from "./components/Navbar.js";
import { Footer } from "./components/Footer.js";
import { ProtectedRoute } from "./components/ProtectedRoute.js";
import { MatchesPage } from "./pages/MatchesPage.js";
import { MatchDetailsPage } from "./pages/MatchDetailsPage.js";
import { ProposalsPage } from "./pages/ProposalsPage.js";
import { ActivityPage } from "./pages/ActivityPage.js";
import { RegisterPropertyPage } from "./pages/RegisterPropertyPage.js";
import { MyPropertiesPage } from "./pages/MyPropertiesPage.js";
import { AdminReviewPage } from "./pages/AdminReviewPage.js";
import { LoginPage } from "./pages/LoginPage.js";
import { OwnerRegisterPage } from "./pages/OwnerRegisterPage.js";
import { BrokerApplyPage } from "./pages/BrokerApplyPage.js";
import { AdminDashboardPage } from "./pages/AdminDashboardPage.js";
import { BrokerDashboardPage } from "./pages/BrokerDashboardPage.js";
import { OwnerDashboardPage } from "./pages/OwnerDashboardPage.js";
import { BuyPage } from "./pages/BuyPage.js";
import { SellPage } from "./pages/SellPage.js";
import { SwapPage } from "./pages/SwapPage.js";
import { ProfilePage } from "./pages/ProfilePage.js";

const PublicLayout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

/**
 * Root / redirect:
 * - If unauthenticated: redirects to /login as required.
 * - If authenticated: redirects to appropriate role dashboard.
 */
const EntryPointRedirect: React.FC = () => {
  const { currentUser, isAuthenticated, isAdmin, isBroker } = useUser();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (isBroker) {
    return <Navigate to="/broker/dashboard" replace />;
  }

  return <Navigate to="/owner/dashboard" replace />;
};

/**
 * AuthRedirectRoute:
 * If an already authenticated user visits /login or /register,
 * automatically redirect them to their role dashboard.
 */
const AuthRedirectRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin, isBroker } = useUser();

  if (isAuthenticated) {
    if (isAdmin) return <Navigate to="/admin/dashboard" replace />;
    if (isBroker) return <Navigate to="/broker/dashboard" replace />;
    return <Navigate to="/owner/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          {/* Protected dedicated full-screen Dashboards */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/broker/dashboard"
            element={
              <ProtectedRoute allowedRoles={["broker"]}>
                <BrokerDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/dashboard"
            element={
              <ProtectedRoute allowedRoles={["owner"]}>
                <OwnerDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Standard layout with top Navbar & Footer */}
          <Route element={<PublicLayout />}>
            {/* Root Entry Point: Unauthenticated -> /login; Authenticated -> Dashboard */}
            <Route path="/" element={<EntryPointRedirect />} />
            <Route path="/dashboard" element={<EntryPointRedirect />} />

            {/* Public Authentication Pages (Redirect to dashboard if already logged in) */}
            <Route
              path="/login"
              element={
                <AuthRedirectRoute>
                  <LoginPage />
                </AuthRedirectRoute>
              }
            />
            <Route
              path="/register-owner"
              element={
                <AuthRedirectRoute>
                  <OwnerRegisterPage />
                </AuthRedirectRoute>
              }
            />
            <Route
              path="/broker-apply"
              element={
                <AuthRedirectRoute>
                  <BrokerApplyPage />
                </AuthRedirectRoute>
              }
            />

            {/* Protected Core Platform Sections */}
            <Route
              path="/swap"
              element={
                <ProtectedRoute allowedRoles={["owner", "admin"]}>
                  <SwapPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/buy"
              element={
                <ProtectedRoute>
                  <BuyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sell"
              element={
                <ProtectedRoute allowedRoles={["owner", "admin"]}>
                  <SellPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-properties"
              element={
                <ProtectedRoute allowedRoles={["owner", "admin"]}>
                  <MyPropertiesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/register"
              element={
                <ProtectedRoute allowedRoles={["owner", "admin"]}>
                  <RegisterPropertyPage />
                </ProtectedRoute>
              }
            />

            {/* Protected Swap & Proposal Workflows */}
            <Route path="/matches" element={<Navigate to="/swap" replace />} />
            <Route
              path="/matches/:id"
              element={
                <ProtectedRoute>
                  <MatchDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/proposals"
              element={
                <ProtectedRoute allowedRoles={["owner", "admin"]}>
                  <ProposalsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/activity"
              element={
                <ProtectedRoute>
                  <ActivityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminReviewPage />
                </ProtectedRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
};
