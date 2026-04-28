"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WorkManagementRoot() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/work-management/projects");
  }, [router]);

  return null;
}
