
import React, { useState, useEffect } from 'react';
import { UserPlus, Briefcase, Play, Square, Timer, CheckCircle2, Calendar, User, Zap } from 'lucide-react';
import { ActiveSession, TimeEntry } from '../types';
import { formatMinutesToHMM, getTorontoISODate, getTorontoDate } from '../utils';

interface DashboardProps {
  people: string[];
  jobs: string[];
  activeSessions: Record<string, ActiveSession>;
  entries: TimeEntry[];
  onClockIn: (person: string, job: string) => void;
  onClockOut: (person: string) => void;
  onAddPerson: (name: string) => void;
  onAddJob: (name: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  people, 
  jobs, 
  activeSessions, 
  entries,
  onClockIn, 
  onClockOut, 
  onAddPerson, 
  onAddJob 
}) => {
  const [newPerson, setNewPerson] = useState('');
  const [newJob, setNewJob] = useState('');
  const [selectedJobs, setSelectedJobs] = useState<Record<string, string>>({});
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const getAccumulatedTime = (person: string) => {
    const today = getTorontoISODate();
    const session = activeSessions[person];
    
    const pastMins = entries
      .filter(e => e.person_name === person && e.date === today)
      .reduce((acc, curr) => acc + curr.duration_mins, 0);

    if (session) {
      const sessionMs = Date.now() - session.startTime;
      const totalMs = (pastMins * 60 * 1000) + sessionMs;
      return formatMinutesToHMM(totalMs / (1000 * 60));
    }

    return formatMinutesToHMM(pastMins);
  };

  const handleJobChange = (personName: string, jobName: string) => {
    setSelectedJobs(prev => {
      const next = { ...prev, [personName]: jobName };
      
      // If we are setting a job (not clearing), and other workers have NO job selected,
      // helpfully propagate this job to them as a default.
      if (jobName) {
        people.forEach(p => {
          if (!prev[p] && p !== personName) {
            next[p] = jobName;
          }
        });
      }
      
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats Row */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
           <Zap className="w-5 h-5 text-[#8eba2b] fill-[#8eba2b]" />
           <h2 className="text-sm font-black text-[#1f2a44] uppercase tracking-[0.2em]">Active Workforce</h2>
        </div>
        <div className="bg-[#8eba2b]/10 px-4 py-1.5 rounded-full">
           <p className="text-[10px] font-black text-[#8eba2b] uppercase tracking-widest">
             {Object.keys(activeSessions).length} / {people.length} Working
           </p>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex gap-2 items-center focus-within:border-[#1f2a44] transition-all">
          <UserPlus className="w-4 h-4 text-slate-300 flex-shrink-0" />
          <input 
            type="text" 
            placeholder="Add Employee..." 
            className="flex-grow bg-transparent border-none focus:ring-0 text-sm font-bold p-0"
            value={newPerson}
            onChange={(e) => setNewPerson(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (onAddPerson(newPerson), setNewPerson(''))}
          />
          <button 
            onClick={() => { onAddPerson(newPerson); setNewPerson(''); }}
            className="bg-[#1f2a44] text-white px-3 py-2 rounded-xl font-black text-[9px] uppercase hover:opacity-90 transition-all flex-shrink-0"
          >
            Add
          </button>
        </div>

        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex gap-2 items-center focus-within:border-[#1f2a44] transition-all">
          <Briefcase className="w-4 h-4 text-slate-300 flex-shrink-0" />
          <input 
            type="text" 
            placeholder="Add Job Site..." 
            className="flex-grow bg-transparent border-none focus:ring-0 text-sm font-bold p-0"
            value={newJob}
            onChange={(e) => setNewJob(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (onAddJob(newJob), setNewJob(''))}
          />
          <button 
            onClick={() => { onAddJob(newJob); setNewJob(''); }}
            className="bg-[#1f2a44] text-white px-3 py-2 rounded-xl font-black text-[9px] uppercase hover:opacity-90 transition-all flex-shrink-0"
          >
            Add
          </button>
        </div>
      </div>

      {/* Compact Workers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {people.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
            <User className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">No employees added yet</p>
          </div>
        ) : (
          people.map(person => {
            const isActive = !!activeSessions[person];
            const session = activeSessions[person];
            const currentSelectedJob = selectedJobs[person] || '';
            const hasSelectedJob = !!currentSelectedJob;
            
            return (
              <div 
                key={person} 
                className={`bg-white rounded-2xl p-3 transition-all border-2 flex items-center gap-3 relative overflow-hidden ${
                  isActive 
                    ? 'border-[#8eba2b] shadow-md shadow-[#8eba2b]/5' 
                    : 'border-slate-50 shadow-sm hover:border-slate-200'
                }`}
              >
                {/* Status Indicator Bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isActive ? 'bg-[#8eba2b]' : 'bg-slate-100'}`} />

                {/* Worker Identity & Timer */}
                <div className="flex-grow min-w-0 pl-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-xs font-black text-[#1f2a44] truncate">{person}</h3>
                    {isActive && (
                      <span className="flex h-1.5 w-1.5 relative flex-shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8eba2b] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#8eba2b]"></span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div className={`text-lg font-mono font-black tabular-nums tracking-tighter transition-colors ${isActive ? 'text-[#8eba2b]' : 'text-slate-300'}`}>
                      {getAccumulatedTime(person)}
                    </div>
                    {isActive && (
                      <p className="text-[8px] font-black text-[#8eba2b] uppercase truncate max-w-[80px]">
                        @ {session.job_name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Compact Actions Section */}
                <div className="flex flex-col gap-1.5 w-32 flex-shrink-0">
                  {!isActive && (
                    <div className="relative">
                      <select 
                        className="w-full bg-slate-50 border-none rounded-lg pl-2 pr-6 py-1.5 text-[9px] font-black focus:ring-1 focus:ring-[#1f2a44] appearance-none cursor-pointer text-[#1f2a44]"
                        value={currentSelectedJob}
                        onChange={(e) => handleJobChange(person, e.target.value)}
                      >
                        <option value="">Job site...</option>
                        {jobs.map(j => <option key={j} value={j}>{j}</option>)}
                      </select>
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                        <Briefcase className="w-2.5 h-2.5 text-slate-300" />
                      </div>
                    </div>
                  )}

                  {isActive ? (
                    <button 
                      onClick={() => onClockOut(person)}
                      className="w-full bg-[#ff9559] text-white py-2 rounded-lg font-black text-[9px] uppercase flex items-center justify-center gap-1.5 hover:bg-[#ff8540] transition-all shadow-sm"
                    >
                      <Square className="w-2.5 h-2.5 fill-white" />
                      Clock Out
                    </button>
                  ) : (
                    <button 
                      disabled={!hasSelectedJob}
                      onClick={() => onClockIn(person, currentSelectedJob)}
                      className={`w-full py-2 rounded-lg font-black text-[9px] uppercase flex items-center justify-center gap-1.5 transition-all ${
                        hasSelectedJob 
                        ? 'bg-[#1f2a44] text-white hover:bg-[#2a3a5a] shadow-sm' 
                        : 'bg-slate-50 text-slate-300 grayscale cursor-not-allowed'
                      }`}
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      Clock In
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Dashboard;
