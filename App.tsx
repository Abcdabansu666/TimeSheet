
import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Users, FileText, List, Plus, Briefcase, UserPlus, X, Calendar as CalendarIcon, Upload } from 'lucide-react';
import { TimeEntry, TabType, ActiveSession } from './types';
import { getTorontoISODate, getTorontoTimeString, getTorontoDate, getTorontoTime12h } from './utils';
import Dashboard from './components/Dashboard';
import EntriesList from './components/EntriesList';
import Report from './components/Report';
import AddEntry from './components/AddEntry';

const App: React.FC = () => {
  const [entries, setEntries] = useState<TimeEntry[]>(() => {
    const saved = localStorage.getItem('timesheet_entries_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [people, setPeople] = useState<string[]>(() => {
    const saved = localStorage.getItem('timesheet_people');
    return saved ? JSON.parse(saved) : [];
  });

  const [jobs, setJobs] = useState<string[]>(() => {
    const saved = localStorage.getItem('timesheet_jobs');
    return saved ? JSON.parse(saved) : ["General Construction", "Maintenance", "Site Survey"];
  });

  const [activeSessions, setActiveSessions] = useState<Record<string, ActiveSession>>(() => {
    const saved = localStorage.getItem('active_sessions');
    return saved ? JSON.parse(saved) : {};
  });

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [currentTime, setCurrentTime] = useState(getTorontoTime12h());

  // Timer for header
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getTorontoTime12h());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Persistence
  useEffect(() => {
    localStorage.setItem('timesheet_entries_v2', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem('timesheet_people', JSON.stringify(people));
  }, [people]);

  useEffect(() => {
    localStorage.setItem('timesheet_jobs', JSON.stringify(jobs));
  }, [jobs]);

  useEffect(() => {
    localStorage.setItem('active_sessions', JSON.stringify(activeSessions));
  }, [activeSessions]);

  useEffect(() => {
    const today = getTorontoISODate();
    localStorage.setItem('last_active_date', today);
  }, []);

  const addPerson = (name: string) => {
    if (name && !people.includes(name)) {
      setPeople(prev => [...prev, name].sort());
    }
  };

  const addJob = (name: string) => {
    if (name && !jobs.includes(name)) {
      setJobs(prev => [...prev, name].sort());
    }
  };

  const handleClockIn = (person: string, job: string) => {
    const today = getTorontoISODate();
    const accumulatedMinsToday = entries
      .filter(e => e.person_name === person && e.date === today)
      .reduce((acc, curr) => acc + curr.duration_mins, 0);

    setActiveSessions(prev => ({
      ...prev,
      [person]: {
        person_name: person,
        job_name: job,
        startTime: Date.now(),
        accumulatedMsBeforeThisSession: accumulatedMinsToday * 60 * 1000
      }
    }));
  };

  const handleClockOut = (person: string) => {
    const session = activeSessions[person];
    if (!session) return;

    const endTime = Date.now();
    const durationMs = endTime - session.startTime;
    const durationMins = durationMs / (1000 * 60);

    const newEntry: TimeEntry = {
      id: crypto.randomUUID(),
      person_name: person,
      job_name: session.job_name,
      date: getTorontoISODate(),
      clock_in: new Date(session.startTime).toLocaleTimeString("en-US", { hour12: false, hour: '2-digit', minute: '2-digit', timeZone: 'America/Toronto' }),
      clock_out: getTorontoTimeString(),
      lunch_30_min: false,
      notes: `Session: ${session.job_name}`,
      created_at: Date.now(),
      duration_mins: durationMins
    };

    setEntries(prev => [newEntry, ...prev]);
    setActiveSessions(prev => {
      const next = { ...prev };
      delete next[person];
      return next;
    });
  };

  const saveEntry = (entry: TimeEntry) => {
    if (editingEntry) {
      setEntries(prev => prev.map(e => e.id === entry.id ? entry : e));
      setEditingEntry(null);
    } else {
      setEntries(prev => [entry, ...prev]);
      setIsCreatingNew(false);
    }
  };

  const deleteEntry = (id: string) => {
    if (confirm('Delete this record?')) {
      setEntries(prev => prev.filter(e => e.id !== id));
    }
  };

  const approveEntries = (ids: string[]) => {
    setEntries(prev => prev.filter(e => !ids.includes(e.id)));
  };

  const formattedDate = getTorontoDate().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <header className="bg-[#1f2a44] text-white shadow-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl">
              <Clock className="w-8 h-8 text-[#ff9559]" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase leading-none">Timesheet Team</h1>
              <p className="text-[10px] font-bold text-[#8eba2b] uppercase tracking-[0.2em] mt-1 flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" /> {formattedDate}
              </p>
            </div>
          </div>
          
          <div className="hidden lg:flex bg-white/5 rounded-2xl p-1 gap-1">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'dashboard' ? 'bg-[#ff9559] text-white' : 'text-white/70 hover:text-white'}`}
            >
              DASHBOARD
            </button>
            <button 
              onClick={() => setActiveTab('list')}
              className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'list' ? 'bg-[#ff9559] text-white' : 'text-white/70 hover:text-white'}`}
            >
              HISTORY
            </button>
            <button 
              onClick={() => setActiveTab('report')}
              className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'report' ? 'bg-[#ff9559] text-white' : 'text-white/70 hover:text-white'}`}
            >
              REPORTS
            </button>
          </div>

          <div className="text-right border-l border-white/10 pl-6">
            <p className="text-[10px] uppercase font-black text-white/40 tracking-widest">Toronto</p>
            <p className="text-lg font-mono font-black uppercase">{currentTime}</p>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full p-4 md:p-8 pb-32 md:pb-8">
        {activeTab === 'dashboard' && (
          <Dashboard 
            people={people} 
            jobs={jobs} 
            activeSessions={activeSessions}
            entries={entries}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            onAddPerson={addPerson}
            onAddJob={addJob}
          />
        )}
        {activeTab === 'list' && (
          <EntriesList 
            entries={entries} 
            onDelete={deleteEntry} 
            people={people}
            onEdit={(e) => setEditingEntry(e)}
            onManualAdd={() => setIsCreatingNew(true)}
          />
        )}
        {activeTab === 'report' && (
          <Report 
            entries={entries} 
            people={people} 
            onApprove={approveEntries}
          />
        )}
      </main>

      {(editingEntry || isCreatingNew) && (
        <div className="fixed inset-0 z-[100] bg-[#1f2a44]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-auto">
             <AddEntry 
               editingEntry={editingEntry} 
               onSave={saveEntry} 
               onCancel={() => {
                 setEditingEntry(null);
                 setIsCreatingNew(false);
               }} 
               people={people}
             />
          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around py-3 pb-6 z-50">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-[#1f2a44]' : 'text-slate-400'}`}>
          <Clock className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">Live</span>
        </button>
        <button onClick={() => setActiveTab('list')} className={`flex flex-col items-center gap-1 ${activeTab === 'list' ? 'text-[#1f2a44]' : 'text-slate-400'}`}>
          <List className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">History</span>
        </button>
        <button onClick={() => setActiveTab('report')} className={`flex flex-col items-center gap-1 ${activeTab === 'report' ? 'text-[#1f2a44]' : 'text-slate-400'}`}>
          <FileText className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">Reports</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
