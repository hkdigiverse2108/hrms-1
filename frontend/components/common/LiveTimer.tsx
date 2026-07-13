"use client";

import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

export function LiveTimer({ startTime, className, serverTimeOffset = 0, accumulatedSeconds = 0, isPaused = false }: { startTime?: string, className?: string, serverTimeOffset?: number, accumulatedSeconds?: number, isPaused?: boolean }) {
  const [elapsed, setElapsed] = useState<string>("00:00:00");

  useEffect(() => {
    const calculateTime = () => {
      if (isPaused) {
        const diffSeconds = accumulatedSeconds;
        const hrs = Math.floor(diffSeconds / 3600);
        const mins = Math.floor((diffSeconds % 3600) / 60);
        const secs = diffSeconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }

      if (!startTime) return "00:00:00";

      const start = dayjs(`2000-01-01 ${startTime}`, [
        'YYYY-MM-DD hh:mm A',
        'YYYY-MM-DD HH:mm:ss',
        'YYYY-MM-DD HH:mm',
        'YYYY-MM-DD h:mm A',
        'hh:mm A',
        'HH:mm:ss',
        'HH:mm'
      ]);
      if (!start.isValid()) return "00:00:00";

      const now = dayjs(Date.now() + serverTimeOffset);
      
      // Calculate diff assuming both are today for simplicity in this display
      const todayStart = dayjs().hour(start.hour()).minute(start.minute()).second(start.second());
      
      let diffSeconds = now.diff(todayStart, 'second');
      if (diffSeconds < 0) diffSeconds = 0;

      diffSeconds += accumulatedSeconds;

      const hrs = Math.floor(diffSeconds / 3600);
      const mins = Math.floor((diffSeconds % 3600) / 60);
      const secs = diffSeconds % 60;

      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    setElapsed(calculateTime());

    if (isPaused || !startTime) return;

    const interval = setInterval(() => {
      setElapsed(calculateTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, accumulatedSeconds, serverTimeOffset, isPaused]);

  if (!startTime && !isPaused) return null;

  const defaultClassName = isPaused 
    ? "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-100 text-[11px] font-bold font-mono tracking-wider shadow-sm"
    : "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[11px] font-bold font-mono tracking-wider shadow-sm";

  return (
    <span className={className || defaultClassName}>
      <span className="relative flex h-1.5 w-1.5">
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isPaused ? 'bg-orange-500' : 'bg-emerald-500'}`}></span>
      </span>
      {elapsed}
    </span>
  );
}
