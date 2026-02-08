
export interface TimeEntry {
  id: string;
  person_name: string;
  job_name: string;
  date: string; // YYYY-MM-DD in Toronto Time
  clock_in: string; // HH:mm
  clock_out: string; // HH:mm
  lunch_30_min: boolean;
  notes: string;
  created_at: number;
  duration_mins: number; // Stored for accurate accumulation
}

export interface ActiveSession {
  person_name: string;
  job_name: string;
  startTime: number; // Timestamp
  accumulatedMsBeforeThisSession: number;
}

export type TabType = 'dashboard' | 'report' | 'list';
