import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "./context/UserContext.js";
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

export const App: React.FC = () => {
  return (
    <UserProvider>
      <BrowserRouter>
        <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/my-properties" element={<MyPropertiesPage />} />
              <Route path="/matches" element={<MatchesPage />} />
              <Route path="/matches/:id" element={<MatchDetailsPage />} />
              <Route path="/proposals" element={<ProposalsPage />} />
              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/register" element={<RegisterPropertyPage />} />
              <Route path="/admin" element={<AdminReviewPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </UserProvider>
  );
};
