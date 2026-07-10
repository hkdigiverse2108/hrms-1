"use client";

import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

export function LiveTimer({ startTime, className }: { startTime: string, className?: string }) {
  const [elapsed, setElapsed] = useState<string>("00:00:00");

  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      const start = dayjs(`2000-01-01 ${startTime}`, [
        'YYYY-MM-DD hh:mm A',
        'YYYY-MM-DD HH:mm:ss',
        'YYYY-MM-DD HH:mm',
        'YYYY-MM-DD h:mm A',
        'hh:mm A',
        'HH:mm:ss',
        'HH:mm'
      ]);
      if (!start.isValid()) return;

      const now = dayjs();
      
      // Calculate diff assuming both are today for simplicity in this display
      const todayStart = dayjs().hour(start.hour()).minute(start.minute()).second(start.second());
      
      let diffSeconds = now.diff(todayStart, 'second');
      if (diffSeconds < 0) diffSeconds = 0;

      const hrs = Math.floor(diffSeconds / 3600);
      const mins = Math.floor((diffSeconds % 3600) / 60);
      const secs = diffSeconds % 60;

      setElapsed(
        `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  if (!startTime) return null;

  return (
    <span className={className || "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[11px] font-bold font-mono tracking-wider shadow-sm"}>
      <span className="relative flex h-1.5 w-1.5">
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
      </span>
      {elapsed}
    </span>
  );
}
