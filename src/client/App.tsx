import React from "react";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import { UserProvider, useUser } from "./context/UserContext.js";
import { Navbar } from "./components/Navbar.js";
import { Footer } from "./components/Footer.js";
import { DashboardPage } from "./pages/DashboardPage.js";
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

const DashboardRedirect: React.FC = () => {
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

export const App: React.FC = () => {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          {/* Dedicated full-screen Dashboards with their own sidebar + header */}
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/broker/dashboard" element={<BrokerDashboardPage />} />
          <Route path="/owner/dashboard" element={<OwnerDashboardPage />} />
          <Route path="/dashboard" element={<DashboardRedirect />} />

          {/* Standard layout with top Navbar & Footer */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register-owner" element={<OwnerRegisterPage />} />
            <Route path="/broker-apply" element={<BrokerApplyPage />} />
            <Route path="/my-properties" element={<MyPropertiesPage />} />
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="/matches/:id" element={<MatchDetailsPage />} />
            <Route path="/proposals" element={<ProposalsPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/register" element={<RegisterPropertyPage />} />
            <Route path="/admin" element={<AdminReviewPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </UserProvider>
  );
};
