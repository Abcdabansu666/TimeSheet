
import React, { useState, useMemo } from 'react';
import { Search, Trash2, Calendar, User, Clock, Briefcase, Edit2, PlusCircle } from 'lucide-react';
import { TimeEntry } from '../types';
import { formatMinutesToHMM, formatTimeTo12h } from '../utils';

interface EntriesListProps {
  entries: TimeEntry[];
  onDelete: (id: string) => void;
  people: string[];
  onEdit: (entry: TimeEntry) => void;
  onManualAdd: () => void;
}

const EntriesList: React.FC<EntriesListProps> = ({ entries, onDelete, people, onEdit, onManualAdd }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPerson, setFilterPerson] = useState('All');

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesSearch = 
        entry.person_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.job_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.notes.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPerson = filterPerson === 'All' || entry.person_name === filterPerson;
      return matchesSearch && matchesPerson;
    });
  }, [entries, searchTerm, filterPerson]);

  const formatDateLabel = (dateStr: string) => {
    try {
      const date = new Date(dateStr + 'T12:00:00');
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        <div className="flex-grow bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#1f2a44]" />
            <input
              type="text"
              placeholder="Search history..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#1f2a44] text-sm font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="w-full md:w-64 py-3 px-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#1f2a44] text-sm font-bold"
            value={filterPerson}
            onChange={(e) => setFilterPerson(e.target.value)}
          >
            <option value="All">All Workers</option>
            {people.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <button 
          onClick={onManualAdd}
          className="bg-[#1f2a44] text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#1f2a44]/10"
        >
          <PlusCircle className="w-4 h-4" />
          Manual Add
        </button>
      </div>

      <div className="grid gap-4">
        {filteredEntries.map(entry => (
          <div key={entry.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-[#1f2a44]/10 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#1f2a44]/5 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-[#1f2a44]" />
              </div>
              <div>
                <h4 className="font-black text-slate-800 leading-none mb-1">{entry.person_name}</h4>
                <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDateLabel(entry.date)}</span>
                  <span className="flex items-center gap-1 text-[#8eba2b]"><Briefcase className="w-3 h-3" /> {entry.job_name}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right mr-4 hidden sm:block">
                <p className="text-xl font-mono font-black text-[#1f2a44]">{formatMinutesToHMM(entry.duration_mins)}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase">{formatTimeTo12h(entry.clock_in)} - {formatTimeTo12h(entry.clock_out)}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => onEdit(entry)}
                  className="p-3 text-slate-300 hover:text-[#1f2a44] hover:bg-[#1f2a44]/5 rounded-xl transition-all"
                  title="Edit Entry"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => onDelete(entry.id)}
                  className="p-3 text-slate-300 hover:text-[#ff9559] hover:bg-[#ff9559]/5 rounded-xl transition-all"
                  title="Delete Entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredEntries.length === 0 && (
          <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
            <Clock className="w-12 h-12 mx-auto text-slate-200 mb-4" />
            <p className="text-slate-300 font-black uppercase tracking-widest text-xs">No records found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EntriesList;
