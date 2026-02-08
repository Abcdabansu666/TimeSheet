
import { TimeEntry } from './types';

/**
 * Gets the current date/time in Toronto (America/Toronto)
 */
export const getTorontoDate = (): Date => {
  const now = new Date();
  const torontoString = now.toLocaleString("en-US", { timeZone: "America/Toronto" });
  return new Date(torontoString);
};

export const getTorontoISODate = (): string => {
  const d = getTorontoDate();
  return d.toISOString().split('T')[0];
};

/**
 * Returns 24h time for internal storage
 */
export const getTorontoTimeString = (): string => {
  const d = getTorontoDate();
  return d.toTimeString().split(' ')[0].substring(0, 5); // HH:mm
};

/**
 * Returns 12h formatted time for UI display
 */
export const getTorontoTime12h = (): string => {
  const d = getTorontoDate();
  return d.toLocaleTimeString("en-US", { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true, 
    timeZone: "America/Toronto" 
  });
};

/**
 * Formats an HH:mm string (24h) to h:mm AM/PM (12h)
 */
export const formatTimeTo12h = (time24: string): string => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  let h = parseInt(hours, 10);
  const m = minutes;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12; // the hour '0' should be '12'
  return `${h}:${m} ${ampm}`;
};

export const formatMinutesToHMM = (totalMinutes: number): string => {
  const isNegative = totalMinutes < 0;
  const absMinutes = Math.floor(Math.abs(totalMinutes));
  const hours = Math.floor(absMinutes / 60);
  const mins = absMinutes % 60;
  return `${isNegative ? '-' : ''}${hours}:${mins.toString().padStart(2, '0')}`;
};

export const calculateDailyMinutes = (entry: TimeEntry): number => {
  return entry.duration_mins;
};

export const validateEntry = (entry: Partial<TimeEntry>): string | null => {
  if (!entry.person_name) return "Worker name is required";
  if (!entry.date) return "Date is required";
  if (!entry.clock_in) return "Clock-in time is required";
  if (!entry.clock_out) return "Clock-out time is required";
  
  const start = new Date(`2000-01-01T${entry.clock_in}`);
  const end = new Date(`2000-01-01T${entry.clock_out}`);
  
  if (isNaN(start.getTime())) return "Invalid clock-in time";
  if (isNaN(end.getTime())) return "Invalid clock-out time";
  if (end <= start) return "Clock-out must be after clock-in";
  
  return null;
};

export const getDurationMinutes = (clockIn: string, clockOut: string, lunch30: boolean): number => {
  try {
    const start = new Date(`2000-01-01T${clockIn}`);
    const end = new Date(`2000-01-01T${clockOut}`);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    
    let diffMins = (end.getTime() - start.getTime()) / (1000 * 60);
    if (lunch30) diffMins -= 30;
    return Math.max(0, diffMins);
  } catch (e) {
    return 0;
  }
};
