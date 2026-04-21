"use client";

import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ShieldHalf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

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
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 whitespace-nowrap tracking-tight">Welcome in HK DigiVerse :)</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Please enter your details to sign in to your account.</p>
          </div>

          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); window.location.href="/"; }}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  type="email" 
                  placeholder="sarah.jenkins@hkdigiverse.com" 
                  className="pl-10 pb-2 pt-2 h-12 bg-white" 
                  required
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

            <div className="flex items-center">
              <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setRememberMe(!rememberMe)}>
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-brand-teal border-brand-teal' : 'border-gray-300 group-hover:border-brand-teal'}`}>
                  {rememberMe && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-foreground">Remember me</span>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 bg-brand-teal hover:bg-brand-teal-light text-white font-medium text-[15px] shadow-sm tracking-wide">
              Sign in to Dashboard
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            Don't have an account? <a href="#" className="font-medium text-foreground hover:text-brand-teal transition-colors">Contact HR</a>
          </div>

        </div>
      </div>
    </div>
  );
}
