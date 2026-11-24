import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeftRight, Eye, EyeOff, Lock, Mail, ShieldAlert, CheckCircle2, UserCircle2, ArrowRight } from "lucide-react";
import { useUser } from "../context/UserContext.js";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === "admin") {
        navigate("/admin/dashboard");
      } else if (user.role === "broker") {
        navigate("/broker/dashboard");
      } else {
        navigate("/owner/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to log in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2 group mb-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <div className="text-left">
            <span className="text-2xl font-bold tracking-tight text-slate-900 block leading-tight">
              ASSET<span className="text-blue-600">SWAP</span>
            </span>
            <span className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase block">
              Direct & Multi-Party Asset Exchange
            </span>
          </div>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Sign in to your account
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Access your personalized role dashboard (Admin, Broker, or Property Owner)
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Remember me</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Sign In"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials Panel */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Quick Test Credentials (Local Demo)
            </span>
            <div className="grid grid-cols-1 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => fillDemoAccount("admin@asset-swap.local", "Admin@123")}
                className="text-left px-2.5 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 flex items-center justify-between text-purple-900 transition-colors"
              >
                <div>
                  <span className="font-bold block">Administrator (Kavitha Murthy)</span>
                  <span className="text-[10px] text-purple-700">admin@asset-swap.local</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-purple-200/60 px-1.5 py-0.5 rounded">Admin</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount("suresh.rao@broker.local", "Broker@123")}
                className="text-left px-2.5 py-1.5 rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100 flex items-center justify-between text-teal-900 transition-colors"
              >
                <div>
                  <span className="font-bold block">Approved Broker (Suresh Rao)</span>
                  <span className="text-[10px] text-teal-700">suresh.rao@broker.local</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-teal-200/60 px-1.5 py-0.5 rounded">Broker</span>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount("naveen.hegde@owner.local", "Owner@123")}
                className="text-left px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 flex items-center justify-between text-blue-900 transition-colors"
              >
                <div>
                  <span className="font-bold block">Property Owner (Naveen Hegde)</span>
                  <span className="text-[10px] text-blue-700">naveen.hegde@owner.local</span>
                </div>
                <span className="text-[10px] font-mono font-bold bg-blue-200/60 px-1.5 py-0.5 rounded">Owner</span>
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2 text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
            <div>
              Property owner looking to swap?{" "}
              <Link to="/register-owner" className="font-bold text-blue-600 hover:text-blue-800">
                Register as Owner
              </Link>
            </div>
            <div>
              Professional real estate broker?{" "}
              <Link to="/broker-apply" className="font-bold text-teal-600 hover:text-teal-800">
                Apply for Broker Account
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal Placeholder */}
      {forgotPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-xl border border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Password Reset Demo</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              In this local demonstration environment, demo passwords are listed above. If you forgot your password, contact administration at <span className="font-mono text-blue-600 font-bold">admin@asset-swap.local</span>.
            </p>
            <button
              onClick={() => setForgotPasswordOpen(false)}
              className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
