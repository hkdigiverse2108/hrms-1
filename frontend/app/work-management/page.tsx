"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";

export default function WorkManagementRoot() {
  const router = useRouter();
  const { user, isLoading } = useUser();

  useEffect(() => {
    if (isLoading) return;
    
    const timer = setTimeout(() => {
      if (user?.department?.toLowerCase() === "sales") {
        router.replace("/work-management/sales");
      } else {
        router.replace("/work-management/projects");
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [router, user, isLoading]);

  return null;
}
