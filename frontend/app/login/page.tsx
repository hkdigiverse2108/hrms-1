"use client";
 
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ShieldHalf, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { API_URL } from "@/lib/config";
import { useUserContext } from "@/context/UserContext";
 
export default function LoginPage() {
  const router = useRouter();
  const { login } = useUserContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otp, setOtp] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
 
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
 
    try {
      if (!isOtpSent) {
        const response = await fetch(`${API_URL}/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });
   
        const data = await response.json();
   
        if (!response.ok) {
          throw new Error(data.detail || "Login failed");
        }
        
        if (data.require_otp) {
          setIsOtpSent(true);
        } else {
          // Fallback if OTP is disabled for some reason
          login({ ...data.user, token: data.token });
          router.push("/");
        }
      } else {
        const response = await fetch(`${API_URL}/login/verify-otp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, otp }),
        });
        
        const data = await response.json();
   
        if (!response.ok) {
          throw new Error(data.detail || "OTP verification failed");
        }
        
        login({ ...data.user, token: data.token });
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
 
  return (
    <div className="flex min-h-screen w-full">
      {/* Left Panel - Hidden on mobile */}
      <div className="hidden lg:flex w-1/2 bg-[#EAF7F6] relative flex-col justify-center items-center overflow-hidden border-r border-[#09A08A]/10">
        <div className="absolute top-8 left-8 flex items-center gap-2 text-brand-teal font-bold text-lg">
          <ShieldHalf className="w-8 h-8 text-brand-teal" />
          <div className="flex flex-col text-foreground">
            <span className="leading-tight font-extrabold text-xl">HK <span className="text-brand-teal font-medium text-sm">DigiVerse</span></span>
            <span className="text-[0.6rem] text-muted-foreground uppercase tracking-widest leading-none">& IT Consultancy</span>
          </div>
        </div>
 
        {/* Image Illustration */}
        <div className="relative z-10 w-full max-w-lg mt-16 px-8 flex justify-center">
          <img src="/login-page.png" alt="HK DigiVerse Login Graphic" className="w-full h-auto object-contain drop-shadow-xl" />
        </div>
        
        <div className="absolute bottom-16 left-16 max-w-sm z-10">
           <h2 className="text-3xl font-bold text-foreground mb-4">Welcome in HK DigiVerse</h2>
           <p className="text-muted-foreground leading-relaxed">
             Access your personalized dashboard to manage attendance, track hours, and stay updated with organizational events seamlessly.
           </p>
        </div>
      </div>
 
      {/* Right Panel - Form */}
      <div className="flex w-full lg:w-1/2 justify-center items-center p-8 bg-white">
        <div className="w-full max-w-md px-4 sm:px-8">
           
          {/* Mobile Logo Only */}
          <div className="flex lg:hidden items-center gap-2 text-brand-teal font-bold text-lg mb-12 justify-center">
            <ShieldHalf className="w-8 h-8 text-brand-teal" />
            <div className="flex flex-col text-foreground">
              <span className="leading-tight font-extrabold text-xl">HK <span className="text-brand-teal font-medium text-sm">DigiVerse</span></span>
              <span className="text-[0.6rem] text-muted-foreground uppercase tracking-widest leading-none">& IT Consultancy</span>
            </div>
          </div>
 
          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 whitespace-nowrap tracking-tight">
              {isOtpSent ? "Verify your identity" : "Welcome in HK DigiVerse :)"}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {isOtpSent 
                ? "Enter the 6-digit code sent to your email." 
                : "Please enter your details to sign in to your account."}
            </p>
            {error && (
              <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20 animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}
          </div>
 
          <form className="space-y-6" onSubmit={handleSubmit}>
            {!isOtpSent ? (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      type="email" 
                      placeholder="sarah.jenkins@hkdigiverse.com" 
                      className="pl-10 pb-2 pt-2 h-12 bg-white" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                </div>
     
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••••••" 
                      className="pl-10 pr-10 pb-2 pt-2 h-12 bg-white font-mono tracking-widest placeholder:tracking-normal" 
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">One-Time Password (OTP)</label>
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
              </div>
            )}
 

 
            <Button 
              type="submit" 
              className="w-full h-12 bg-brand-teal hover:bg-brand-teal-light text-white font-medium text-[15px] shadow-sm tracking-wide disabled:opacity-70"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isOtpSent ? "Verifying..." : "Signing in..."}
                </>
              ) : isOtpSent ? (
                "Verify OTP"
              ) : (
                <>
                  Sign In
                </>
              )}
            </Button>
          </form>
 
          <div className="mt-8 text-center text-sm text-muted-foreground">
            {isOtpSent ? (
              <button 
                type="button"
                onClick={() => {
                  setIsOtpSent(false);
                  setOtp("");
                }} 
                className="font-medium text-foreground hover:text-brand-teal transition-colors"
              >
                Back to Login
              </button>
            ) : (
              <span>Don't have an account? <a href="#" className="font-medium text-foreground hover:text-brand-teal transition-colors">Contact HR</a></span>
            )}
          </div>
 
        </div>
      </div>
    </div>
  );
}
