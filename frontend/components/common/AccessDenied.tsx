"use client";

import React from "react";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-4 px-4 py-12">
      <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center shadow-inner">
        <Wrench className="w-10 h-10 text-red-600 animate-pulse" />
      </div>
      <h2 className="text-3xl font-bold text-foreground tracking-tight">Access Denied</h2>
      <p className="text-muted-foreground text-center max-w-md">
        This section is restricted to Admin and HR personnel only. Please contact your administrator if you believe this is an error.
      </p>
      <Button 
        className="bg-brand-teal hover:bg-brand-teal/90 text-white font-semibold py-2.5 px-6 rounded-lg transition-all"
        onClick={() => window.location.href = "/"}
      >
        Return to Dashboard
      </Button>
    </div>
  );
}
