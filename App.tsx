import React, { useEffect, useState } from "react";
import { Clock, FileText, List, Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { TimeEntry, TabType, ActiveSession } from "./types";
import { getTorontoISODate, getTorontoTimeString, getTorontoDate, getTorontoTime12h } from "./utils";
import Dashboard from "./components/Dashboard";
import EntriesList from "./components/EntriesList";
import Report from "./components/Report";
import AddEntry from "./components/AddEntry";

// ✅ Firebase imports
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "./firebase";

const DEFAULT_JOBS = ["General Construction", "Maintenance", "Site Survey"];

const App: React.FC = () => {
  // ✅ Intro screen (kept)
  const [showIntro, setShowIntro] = useState(true);

  // ✅ Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ✅ Synced app state (Firestore)
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [people, setPeople] = useState<string[]>([]);
  const [jobs, setJobs] = useState<string[]>(DEFAULT_JOBS);
  const [activeSessions, setActiveSessions] = useState<Record<string, ActiveSession>>({});

  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [currentTime, setCurrentTime] = useState(getTorontoTime12h());

  // Intro Screen timer
  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Timer for header
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getTorontoTime12h()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ✅ Track login state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // ✅ Firestore: load settings (people/jobs/activeSessions) realtime
  useEffect(() => {
    if (!user) {
      setPeople([]);
      setJobs(DEFAULT_JOBS);
      setActiveSessions({});
      return;
    }

    const settingsRef = doc(db, "users", user.uid, "app", "settings");
    const unsub = onSnapshot(
      settingsRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as any;

        setPeople(Array.isArray(data.people) ? data.people : []);
        setJobs(Array.isArray(data.jobs) ? data.jobs : DEFAULT_JOBS);
        setActiveSessions(data.activeSessions ?? {});
      },
      (err) => console.error("Settings snapshot error:", err)
    );

    return () => unsub();
  }, [user]);

  // ✅ Firestore: load entries realtime
  useEffect(() => {
    if (!user) {
      setEntries([]);
      return;
    }

    const entriesRef = collection(db, "users", user.uid, "entries");
    const q = query(entriesRef, orderBy("created_at", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as any), id: d.id })) as TimeEntry[];
        setEntries(list);
      },
      (err) => console.error("Entries snapshot error:", err)
    );

    return () => unsub();
  }, [user]);

  // ✅ Firestore: persist settings whenever changed
  useEffect(() => {
    if (!user) return;

    const settingsRef = doc(db, "users", user.uid, "app", "settings");
    void setDoc(
      settingsRef,
      { people, jobs, activeSessions, updatedAt: Date.now() },
      { merge: true }
    ).catch((e) => console.error("Failed saving settings:", e));
  }, [user, people, jobs, activeSessions]);

  // ✅ Auth actions
  const handleLogin = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  // ✅ Entry write helpers
  const upsertEntry = async (entry: TimeEntry) => {
    if (!user) return;
    const ref = doc(db, "users", user.uid, "entries", entry.id);
    await setDoc(ref, entry, { merge: true });
  };

  const removeEntry = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(db, "users", user.uid, "entries", id));
  };

  // Existing app logic (same behavior, now synced)
  const addPerson = (name: string) => {
    if (name && !people.includes(name)) setPeople((prev) => [...prev, name].sort());
  };

  const addJob = (name: string) => {
    if (name && !jobs.includes(name)) setJobs((prev) => [...prev, name].sort());
  };

  const handleClockIn = (person: string, job: string) => {
    const today = getTorontoISODate();
    const accumulatedMinsToday = entries
      .filter((e) => e.person_name === person && e.date === today)
      .reduce((acc, curr) => acc + curr.duration_mins, 0);

    setActiveSessions((prev) => ({
      ...prev,
      [person]: {
        person_name: person,
        job_name: job,
        startTime: Date.now(),
        accumulatedMsBeforeThisSession: accumulatedMinsToday * 60 * 1000,
      },
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
      clock_in: new Date(session.startTime).toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Toronto",
      }),
      clock_out: getTorontoTimeString(),
      lunch_30_min: false,
      notes: `Session: ${session.job_name}`,
      created_at: Date.now(),
      duration_mins: durationMins,
    };

    void upsertEntry(newEntry).catch((e) => console.error("Clock-out save failed:", e));

    setActiveSessions((prev) => {
      const next = { ...prev };
      delete next[person];
      return next;
    });
  };

  const saveEntry = (entry: TimeEntry) => {
    void upsertEntry(entry).catch((e) => console.error("Save entry failed:", e));
    setEditingEntry(null);
    setIsCreatingNew(false);
  };

  const deleteEntry = (id: string) => {
    if (confirm("Delete this record?")) {
      void removeEntry(id).catch((e) => console.error("Delete failed:", e));
    }
  };

  const approveEntries = (ids: string[]) => {
    if (!confirm(`Approve ${ids.length} record(s)? This will remove them from the list.`)) return;
    void Promise.all(ids.map((id) => removeEntry(id))).catch((e) => console.error("Approve failed:", e));
  };

  const formattedDate = getTorontoDate().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  // Intro screen
  if (showIntro) {
    return (
      <div className="fixed inset-0 bg-[#1f2a44] flex flex-col items-center justify-center z-[9999] transition-all duration-700">
        <div className="flex flex-col items-center animate-bounce">
          <div className="bg-white/10 p-5 rounded-3xl mb-6 backdrop-blur-md border border-white/10">
            <Clock className="w-16 h-16 text-[#ff9559]" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Timesheet Team</h1>
          <div className="h-1 w-24 bg-[#ff9559] rounded-full mb-8"></div>
        </div>
        <div className="flex items-center gap-2 opacity-0 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500 fill-mode-forwards">
          <Sparkles className="w-4 h-4 text-[#8eba2b]" />
          <p className="text-sm font-black text-white/60 uppercase tracking-[0.4em]">Created by Finest Painters</p>
          <Sparkles className="w-4 h-4 text-[#8eba2b]" />
        </div>
        <div className="mt-12 flex gap-1">
          <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse"></div>
          <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse delay-75"></div>
          <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse delay-150"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans animate-in fade-in duration-500">
      <header className="bg-[#1f2a44] text-white shadow-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl">
              <Clock className="w-8 h-8 text-[#ff9559]" />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-xl font-black tracking-tighter uppercase leading-none">Timesheet Team</h1>
              </div>
              <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.1em] mt-0.5">
                Created by Finest Painters
              </p>
              <p className="text-[10px] font-bold text-[#8eba2b] uppercase tracking-[0.2em] mt-1 flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" /> {formattedDate}
              </p>
            </div>
          </div>

          <div className="hidden lg:flex bg-white/5 rounded-2xl p-1 gap-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === "dashboard" ? "bg-[#ff9559] text-white" : "text-white/70 hover:text-white"
              }`}
            >
              DASHBOARD
            </button>
            <button
              onClick={() => setActiveTab("list")}
              className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === "list" ? "bg-[#ff9559] text-white" : "text-white/70 hover:text-white"
              }`}
            >
              HISTORY
            </button>
            <button
              onClick={() => setActiveTab("report")}
              className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === "report" ? "bg-[#ff9559] text-white" : "text-white/70 hover:text-white"
              }`}
            >
              REPORTS
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right border-l border-white/10 pl-6">
              <p className="text-[10px] uppercase font-black text-white/40 tracking-widest">Toronto</p>
              <p className="text-lg font-mono font-black uppercase">{currentTime}</p>
            </div>

            <div className="hidden md:flex">
              {authLoading ? (
                <span className="text-xs font-black text-white/60">Loading…</span>
              ) : !user ? (
                <button
                  onClick={handleLogin}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-black"
                >
                  Sign in
                </button>
              ) : (
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-black"
                >
                  Sign out
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full p-4 md:p-8 pb-32 md:pb-8">
        {authLoading ? (
          <div className="p-6 text-slate-600 font-semibold">Loading…</div>
        ) : !user ? (
          <div className="max-w-xl mx-auto mt-10 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-black text-[#1f2a44]">Sign in to sync your timesheets</h2>
            <p className="mt-2 text-sm text-slate-600">
              Your entries will sync across mobile and desktop using your Google account.
            </p>
            <button
              onClick={handleLogin}
              className="mt-4 px-5 py-3 rounded-xl bg-[#ff9559] text-white font-black text-sm hover:opacity-90"
            >
              Sign in with Google
            </button>
          </div>
        ) : (
          <>
            {activeTab === "dashboard" && (
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

            {activeTab === "list" && (
              <EntriesList
                entries={entries}
                onDelete={deleteEntry}
                people={people}
                onEdit={(e) => setEditingEntry(e)}
                onManualAdd={() => setIsCreatingNew(true)}
              />
            )}

            {activeTab === "report" && <Report entries={entries} people={people} onApprove={approveEntries} />}
          </>
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
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex flex-col items-center gap-1 ${
            activeTab === "dashboard" ? "text-[#1f2a44]" : "text-slate-400"
          }`}
        >
          <Clock className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">Live</span>
        </button>
        <button
          onClick={() => setActiveTab("list")}
          className={`flex flex-col items-center gap-1 ${activeTab === "list" ? "text-[#1f2a44]" : "text-slate-400"}`}
        >
          <List className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">History</span>
        </button>
        <button
          onClick={() => setActiveTab("report")}
          className={`flex flex-col items-center gap-1 ${
            activeTab === "report" ? "text-[#1f2a44]" : "text-slate-400"
          }`}
        >
          <FileText className="w-6 h-6" />
          <span className="text-[10px] font-black uppercase tracking-widest">Reports</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
