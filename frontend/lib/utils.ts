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

