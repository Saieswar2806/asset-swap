import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Building, ShieldCheck, Mail, Lock, Phone, User, Award, MapPin, CheckCircle2, ShieldAlert, ArrowRight, Clock } from "lucide-react";
import { api } from "../api.js";
import { AssetSwapLogo } from "../components/AssetSwapLogo.js";

export const BrokerApplyPage: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [agency, setAgency] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [jurisdiction, setJurisdiction] = useState("Bengaluru, Ramanagara");
  const [experienceYears, setExperienceYears] = useState(5);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedBrokerId, setSubmittedBrokerId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.applyBroker({
        name,
        email,
        phone,
        password,
        agency,
        licenseNumber,
        jurisdiction,
        experienceYears
      });
      setSubmittedBrokerId(res.brokerId);
    } catch (err: any) {
      setError(err.message || "Failed to submit broker application.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <Link to="/" className="inline-flex items-center justify-center group mb-4">
          <AssetSwapLogo size="lg" subtitle="Professional Broker Onboarding" />
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Apply for Broker Valuation Privileges
        </h2>
        <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
          Asset Swap relies on certified real estate professionals to assess and review property valuations. Apply below to join our verified valuation network.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          {submittedBrokerId ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto border border-teal-200 shadow-sm animate-pulse">
                <Clock className="w-8 h-8" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 mb-2">
                  Status: Pending Administrator Verification
                </span>
                <h3 className="text-xl font-bold text-slate-900">Application Submitted!</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto mt-2 leading-relaxed">
                  Thank you, <span className="font-bold text-slate-900">{name}</span>. Your broker application (Reference: <span className="font-mono font-bold text-slate-900">#{submittedBrokerId}</span>) has been queued for verification.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl text-left border border-slate-200 text-xs space-y-2 text-slate-600">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  What happens next:
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-600">
                  <li>Platform administrators will review your RERA/Broker license: <strong className="font-mono">{licenseNumber}</strong>.</li>
                  <li>Once approved, your account will be activated with broker review privileges.</li>
                  <li>You will then be able to log in and evaluate submitted properties in your jurisdiction.</li>
                </ul>
              </div>

              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-colors"
                >
                  Return to Sign In
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
                  <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Legal Name
                    </label>
                    <div className="relative rounded-lg shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Suresh Rao"
                        className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Professional Email
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
                        placeholder="suresh@realtyfirm.com"
                        className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Phone Number
                    </label>
                    <div className="relative rounded-lg shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 98450 00000"
                        className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Password
                    </label>
                    <div className="relative rounded-lg shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Agency / Firm Name
                    </label>
                    <div className="relative rounded-lg shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Building className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={agency}
                        onChange={(e) => setAgency(e.target.value)}
                        placeholder="e.g. Karnataka Valuation Partners"
                        className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      RERA / Broker License #
                    </label>
                    <div className="relative rounded-lg shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Award className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        placeholder="e.g. KAR-REV-2020-4421"
                        className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Operating Jurisdiction
                    </label>
                    <div className="relative rounded-lg shadow-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={jurisdiction}
                        onChange={(e) => setJurisdiction(e.target.value)}
                        placeholder="e.g. Bengaluru, Mysuru, Mandya"
                        className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Years of Valuation Experience
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={50}
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(Number(e.target.value))}
                      className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 text-xs text-teal-800 leading-relaxed">
                  <span className="font-bold">Verification Notice:</span> Broker accounts undergo administrator review before property valuation privileges are unlocked. You will be notified upon account approval.
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors disabled:opacity-50"
                >
                  {loading ? "Submitting Application..." : "Submit Broker Application"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-slate-500 pt-4 border-t border-slate-100">
                Already approved?{" "}
                <Link to="/login" className="font-bold text-teal-600 hover:text-teal-800">
                  Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
