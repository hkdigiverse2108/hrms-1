"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldHalf, ShieldCheck, Mail, Lock, KeyRound, Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { API_URL } from "@/lib/config";
import { useUserContext } from "@/context/UserContext";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const { login } = useUserContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleStep1Login = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch(`${API_URL}/super-admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Invalid Super Admin credentials.");
      }

      setIsOtpSent(true);
      setSuccessMsg("Security OTP sent to your registered email address.");
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/super-admin/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "OTP Verification failed.");
      }

      // Save user session & redirect
      login({ ...data.user, token: data.token });
      router.push("/super-admin/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid OTP code.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* Left Panel - Mint HRMS Branding */}
      <div className="hidden lg:flex w-1/2 bg-[#EAF7F6] relative flex-col justify-center items-center overflow-hidden border-r border-[#09A08A]/10">
        <div className="absolute top-8 left-8 flex items-center gap-3">
          <img src="/logo.png" alt="HariKrushn DigiVerse Logo" className="h-10 w-auto object-contain" />
          <span className="text-[10px] px-2.5 py-0.5 bg-[#09A08A]/10 text-[#09A08A] border border-[#09A08A]/20 rounded-md font-bold uppercase tracking-wider">Super Admin</span>
        </div>

        {/* Graphic */}
        <div className="relative z-10 w-full max-w-lg mt-16 px-8 flex justify-center">
          <img src="/login-page.png" alt="Super Admin Login Graphic" className="w-full h-auto object-contain drop-shadow-xl" />
        </div>
        
        <div className="absolute bottom-16 left-16 max-w-sm z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#09A08A]/10 border border-[#09A08A]/20 rounded-full text-[#09A08A] font-semibold text-xs mb-3">
            <ShieldCheck className="w-4 h-4" /> Master Governance System
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-3 tracking-tight">Super Admin Panel</h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Multi-Tenant governance, company onboarding, system subscriptions, and master security control center.
          </p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex w-full lg:w-1/2 justify-center items-center p-8 bg-white">
        <div className="w-full max-w-md px-4 sm:px-8">
          {/* Mobile Logo Only */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <img src="/logo.png" alt="HariKrushn DigiVerse Logo" className="h-9 w-auto object-contain" />
            <span className="text-[10px] px-2.5 py-0.5 bg-[#09A08A]/10 text-[#09A08A] border border-[#09A08A]/20 rounded-md font-bold uppercase tracking-wider">Super Admin</span>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">
              {isOtpSent ? "Verify Security OTP" : "Super Admin Login"}
            </h1>
            <p className="text-slate-500 text-sm">
              {isOtpSent 
                ? "Enter the 6-digit code sent to your registered master email." 
                : "Please enter your master super admin credentials to continue."}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 font-medium">
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-3.5 bg-[#EAF7F6] border border-[#09A08A]/30 rounded-xl text-[#09A08A] text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#09A08A]" />
              <p>{successMsg}</p>
            </div>
          )}

          {!isOtpSent ? (
            <form onSubmit={handleStep1Login} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Super Admin Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="superadmin@hkdigiverse.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#09A08A] focus:ring-1 focus:ring-[#09A08A] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Master Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#09A08A] focus:ring-1 focus:ring-[#09A08A] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-[#09A08A] hover:bg-[#07806e] text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#09A08A]/20 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying Credentials...
                  </>
                ) : (
                  <>
                    Send Security OTP
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 text-center">
                  6-Digit OTP Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-center text-xl font-mono tracking-widest text-[#09A08A] placeholder-slate-300 focus:outline-none focus:border-[#09A08A] focus:ring-1 focus:ring-[#09A08A] transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-[#09A08A] hover:bg-[#07806e] text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#09A08A]/20 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Verify OTP & Access Panel
                    <ShieldCheck className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsOtpSent(false)}
                className="w-full text-xs text-slate-500 hover:text-slate-800 transition-colors text-center"
              >
                ← Back to login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
