import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'

dayjs.extend(customParseFormat)

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime12h(timeStr: string | null | undefined): string {
  if (!timeStr) return '--:--';
  const trimmed = timeStr.trim();
  if (
    trimmed === '' ||
    trimmed === '--' ||
    trimmed === '--:--' ||
    trimmed === '-' ||
    trimmed.toLowerCase() === 'active' ||
    trimmed.toLowerCase() === 'not started' ||
    trimmed.toLowerCase() === 'not punched in' ||
    trimmed.toLowerCase() === 'leave' ||
    trimmed.toLowerCase() === 'absent'
  ) {
    return timeStr;
  }

  // If it's a relative/dayjs friendly ISO format or contains a date, parse it directly
  if (trimmed.includes('T') || (trimmed.includes('-') && trimmed.includes(':') && trimmed.length > 10)) {
    const d = dayjs(trimmed);
    if (d.isValid()) {
      return d.format('hh:mm A');
    }
  }

  // Treat it as a time-only string (e.g. HH:mm:ss or HH:mm)
  // Let's prepend a dummy date so dayjs parses it correctly
  const formats = [
    'YYYY-MM-DD HH:mm:ss',
    'YYYY-MM-DD HH:mm',
    'YYYY-MM-DD hh:mm:ss A',
    'YYYY-MM-DD hh:mm A',
    'YYYY-MM-DD h:mm A',
    'HH:mm:ss',
    'HH:mm',
    'hh:mm:ss A',
    'hh:mm A'
  ];

  const dummyDateStr = `2000-01-01 ${trimmed}`;
  for (const fmt of formats) {
    const parsed = dayjs(dummyDateStr, fmt, true);
    if (parsed.isValid()) {
      return parsed.format('hh:mm A');
    }
  }

  // Fallback direct parsing of the time string itself
  const parsedDirect = dayjs(`2000-01-01 ${trimmed}`);
  if (parsedDirect.isValid()) {
    return parsedDirect.format('hh:mm A');
  }

  return timeStr;
}

export interface CalculatedTimes {
  productionMinutes: number;
  totalWorkingMinutes: number;
  breakMinutes: number;
}

export function calculateAttendanceTimes(record: any, now: Date): CalculatedTimes {
  const dateStr = record.date ? (typeof record.date === 'string' ? record.date.split('T')[0].split(' ')[0] : dayjs(record.date).format('YYYY-MM-DD')) : '';
  
  if (!record.checkIn || record.checkIn === '--' || record.checkIn === '--:--' || record.checkIn === '-') {
    return { productionMinutes: 0, totalWorkingMinutes: 0, breakMinutes: 0 };
  }

  const parseTimeToDate = (timeStr: string) => {
    const cleaned = timeStr.trim();
    let hours = 0, minutes = 0, seconds = 0;
    const ampmMatch = cleaned.match(/(\d+):(\d+):?(\d+)?\s*(AM|PM)/i);
    if (ampmMatch) {
      hours = parseInt(ampmMatch[1]);
      minutes = parseInt(ampmMatch[2]);
      seconds = ampmMatch[3] ? parseInt(ampmMatch[3]) : 0;
      const ampm = ampmMatch[4].toUpperCase();
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
    } else {
      const parts = cleaned.split(':');
      hours = parts[0] ? parseInt(parts[0]) : 0;
      minutes = parts[1] ? parseInt(parts[1]) : 0;
      seconds = parts[2] ? parseInt(parts[2]) : 0;
    }
    
    const [year, month, day] = dateStr.split('-');
    const hh = hours.toString().padStart(2, '0');
    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');

    const isoStr = `${year}-${month}-${day}T${hh}:${mm}:${ss}+05:30`;
    return new Date(isoStr);
  };

  const normalizeDate = (d: Date) => {
    if (d.getTime() > now.getTime() + 60000) {
      return new Date(d.getTime() - 24 * 60 * 60 * 1000);
    }
    return d;
  };

  const isToday = dayjs(dateStr).isSame(dayjs(now), 'day');

  // 1. Calculate Total Working Minutes (elapsed time from first check-in to check-out)
  const checkInDate = parseTimeToDate(record.checkIn);
  let checkOutDate = null;
  if (record.checkOut && record.checkOut !== '--' && record.checkOut !== '--:--' && record.checkOut !== '-') {
    checkOutDate = parseTimeToDate(record.checkOut);
  } else if (isToday) {
    checkOutDate = now;
  }
  
  let totalWorkingMinutes = 0;
  if (checkOutDate) {
    let diffSec = (checkOutDate.getTime() - checkInDate.getTime()) / 1000;
    if (diffSec < 0) diffSec += 24 * 3600;
    totalWorkingMinutes = Math.floor(diffSec / 60);
  }

  // 2. Calculate Break Minutes (sum of exact break durations in seconds, converted to minutes)
  let totalBreakSeconds = 0;
  
  (record.breaks || []).forEach((b: any) => {
    if (b.startTime && b.startTime !== '--' && b.startTime !== '-') {
      const bStart = normalizeDate(parseTimeToDate(b.startTime));
      let bEnd = null;
      if (b.endTime && b.endTime !== '--' && b.endTime !== '-') {
        bEnd = normalizeDate(parseTimeToDate(b.endTime));
      } else if (isToday && record.status === 'On Break') {
        bEnd = now;
      }
      
      if (bEnd) {
        let diffSec = (bEnd.getTime() - bStart.getTime()) / 1000;
        if (diffSec < 0) diffSec += 24 * 3600;
        totalBreakSeconds += diffSec;
      }
    }
  });

  // 3. Calculate Production Minutes
  // If record is closed (checkOut exists) and status is not Active/On Break, use accumulatedWorkSeconds if available, else calculate from punches
  let productionSeconds = 0;
  const isClosed = record.checkOut && record.checkOut !== '--' && record.checkOut !== '--:--' && record.checkOut !== '-';

  if (isClosed && record.accumulatedWorkSeconds !== undefined && record.accumulatedWorkSeconds !== null) {
    productionSeconds = record.accumulatedWorkSeconds;
  } else {
    // Calculate from punches
    let totalPunchedSeconds = 0;
    const punchesList = record.punches && record.punches.length > 0 
      ? record.punches 
      : [{ punchIn: record.checkIn, punchOut: record.checkOut }];
      
    punchesList.forEach((p: any) => {
      if (p.punchIn && p.punchIn !== '--' && p.punchIn !== '-') {
        const pIn = parseTimeToDate(p.punchIn);
        let pOut = null;
        if (p.punchOut && p.punchOut !== '--' && p.punchOut !== '-') {
          pOut = parseTimeToDate(p.punchOut);
        } else if (isToday) {
          pOut = now;
        }
        
        if (pOut) {
          let diffSec = (pOut.getTime() - pIn.getTime()) / 1000;
          if (diffSec < 0) diffSec += 24 * 3600;
          totalPunchedSeconds += diffSec;
        }
      }
    });

    // Subtract break seconds
    productionSeconds = Math.max(0, totalPunchedSeconds - totalBreakSeconds);
  }

  // Fallback: if productionSeconds is 0 but we have record.workHours, parse it (for completed records)
  if (productionSeconds === 0 && record.workHours && typeof record.workHours === 'string' && record.workHours !== '--') {
    const hMatch = record.workHours.match(/(\d+)\s*h/i);
    const mMatch = record.workHours.match(/(\d+)\s*m/i);
    if (hMatch || mMatch) {
      const h = hMatch ? parseInt(hMatch[1]) : 0;
      const m = mMatch ? parseInt(mMatch[1]) : 0;
      productionSeconds = (h * 60 + m) * 60;
    }
  }

  return {
    productionMinutes: Math.floor(productionSeconds / 60),
    totalWorkingMinutes: totalWorkingMinutes,
    breakMinutes: Math.floor(totalBreakSeconds / 60)
  };
}

