"use client";

import React, { useState, useEffect } from "react";
import { API_URL } from "@/lib/config";
import { useUserContext } from "@/context/UserContext";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUserContext();
  const [isVerified, setIsVerified] = useState(false);
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isVerified) {
      // Expire session after 30 minutes
      timeoutId = setTimeout(() => {
        setIsVerified(false);
        setOtp("");
        toast.error("Finance session expired. Please verify again.");
      }, 30 * 60 * 1000);
    } else {
      // If we have user, request OTP automatically
      if (user?.email) {
        requestOtp();
      } else {
        // Just wait until user is loaded
        setTimeout(() => setIsInitializing(false), 1000);
      }
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isVerified, user?.email]);

  const requestOtp = async () => {
    if (!user?.email) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/finance-otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      if (res.ok) {
        toast.success("Security OTP sent to company email.");
      } else {
        const data = await res.json();
        toast.error(data.detail || "Failed to send OTP.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error sending OTP");
    } finally {
      setIsLoading(false);
      setIsInitializing(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/finance-otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user?.email, otp }),
      });
      if (res.ok) {
        setIsVerified(true);
        toast.success("Access Granted");
      } else {
        const data = await res.json();
        toast.error(data.detail || "Invalid OTP");
        setOtp("");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error verifying OTP");
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-[50vh] w-full">
        <Loader2 className="w-8 h-8 animate-spin text-brand-teal" />
      </div>
    );
  }

  if (isVerified) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="bg-white border shadow-sm rounded-xl p-8 max-w-md w-full text-center space-y-6">
        <div className="mx-auto bg-amber-50 w-16 h-16 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-amber-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Security Verification</h2>
          <p className="text-sm text-slate-500">
            Access to the Finance module requires an OTP. A code has been sent to the registered company email.
          </p>
        </div>
        
        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-center w-full pt-2">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(val) => setOtp(val)}
              disabled={isLoading}
            >
              <InputOTPGroup className="gap-2 sm:gap-3">
                <InputOTPSlot index={0} className="w-10 h-12 sm:w-12 sm:h-14 text-lg border rounded-md" />
                <InputOTPSlot index={1} className="w-10 h-12 sm:w-12 sm:h-14 text-lg border rounded-md" />
                <InputOTPSlot index={2} className="w-10 h-12 sm:w-12 sm:h-14 text-lg border rounded-md" />
                <InputOTPSlot index={3} className="w-10 h-12 sm:w-12 sm:h-14 text-lg border rounded-md" />
                <InputOTPSlot index={4} className="w-10 h-12 sm:w-12 sm:h-14 text-lg border rounded-md" />
                <InputOTPSlot index={5} className="w-10 h-12 sm:w-12 sm:h-14 text-lg border rounded-md" />
              </InputOTPGroup>
            </InputOTP>
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-brand-teal hover:bg-brand-teal-light text-white"
            disabled={isLoading || otp.length !== 6}
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>
            ) : "Verify & Access"}
          </Button>
          
          <div className="pt-2">
            <button 
              type="button" 
              onClick={requestOtp}
              disabled={isLoading}
              className="text-xs text-brand-teal hover:underline font-medium"
            >
              Resend OTP
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
