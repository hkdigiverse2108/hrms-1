"use client";

import { DailyProgressView } from "@/components/hrms/DailyProgressView";

export default function DailyProgressPage() {
  return (
    <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
      <DailyProgressView />
    </div>
  );
}
