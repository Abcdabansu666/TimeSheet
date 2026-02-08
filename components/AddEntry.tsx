
import React, { useState, useEffect } from 'react';
import { Save, X, UserPlus, Clock, Calendar } from 'lucide-react';
import { TimeEntry } from '../types';
import { validateEntry, getDurationMinutes, formatMinutesToHMM } from '../utils';

interface AddEntryProps {
  onSave: (entry: TimeEntry) => void;
  onCancel?: () => void;
  people: string[];
  editingEntry: TimeEntry | null;
}

const AddEntry: React.FC<AddEntryProps> = ({ onSave, onCancel, people, editingEntry }) => {
  const initialState: TimeEntry = {
    id: '',
    person_name: '',
    job_name: 'Manual Entry',
    date: new Date().toISOString().split('T')[0],
    clock_in: '08:00',
    clock_out: '17:00',
    lunch_30_min: true,
    notes: '',
    created_at: Date.now(),
    duration_mins: 510
  };

  const [formData, setFormData] = useState<TimeEntry>(initialState);
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingEntry) {
      setFormData(editingEntry);
    } else {
      setFormData(initialState);
    }
  }, [editingEntry]);

  useEffect(() => {
    const mins = getDurationMinutes(formData.clock_in, formData.clock_out, formData.lunch_30_min);
    if (formData.duration_mins !== mins) {
      setFormData(prev => ({ ...prev, duration_mins: mins }));
    }
  }, [formData.clock_in, formData.clock_out, formData.lunch_30_min]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateEntry(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    onSave({
      ...formData,
      id: formData.id || crypto.randomUUID(),
      created_at: formData.created_at || Date.now()
    });

    if (!editingEntry) {
      setFormData({
        ...initialState,
        person_name: formData.person_name,
        date: formData.date
      });
    }
    setError(null);
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transition-all animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-[#1f2a44] px-8 py-5 flex justify-between items-center text-white">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2 uppercase tracking-tight">
            {editingEntry ? <Clock className="w-5 h-5 text-[#ff9559]" /> : <Save className="w-5 h-5 text-[#8eba2b]" />}
            {editingEntry ? 'Edit Shift Record' : 'Create Shift'}
          </h2>
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Timesheet Management</p>
        </div>
        {onCancel && (
          <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        {error && (
          <div className="bg-red-50 border-l-4 border-[#ff9559] p-4 text-red-700 text-xs font-bold uppercase tracking-wide">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-[10px] font-black text-[#1f2a44] uppercase tracking-widest">Worker Selection</label>
          {!isAddingPerson ? (
            <div className="flex gap-2">
              <select
                className="flex-grow block w-full rounded-2xl border-slate-200 shadow-sm focus:ring-[#1f2a44] focus:border-[#1f2a44] py-3 px-5 border text-sm font-bold"
                value={formData.person_name}
                onChange={(e) => setFormData(prev => ({ ...prev, person_name: e.target.value }))}
                required
              >
                <option value="">Select worker...</option>
                {people.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsAddingPerson(true)}
                className="px-5 py-3 bg-[#1f2a44]/5 text-[#1f2a44] font-black rounded-2xl hover:bg-[#1f2a44]/10 transition-colors border border-[#1f2a44]/10 text-xs uppercase"
              >
                New
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                autoFocus
                placeholder="Name..."
                className="flex-grow block w-full rounded-2xl border-slate-200 py-3 px-5 border text-sm font-bold"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
              />
              <button
                type="button"
                onClick={() => {
                  if (newPersonName.trim()) {
                    setFormData(prev => ({ ...prev, person_name: newPersonName.trim() }));
                    setIsAddingPerson(false);
                    setNewPersonName('');
                  }
                }}
                className="px-5 py-3 bg-[#8eba2b] text-white font-black rounded-2xl hover:opacity-90 transition-all text-xs uppercase"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setIsAddingPerson(false)}
                className="px-5 py-3 text-slate-400 font-bold hover:bg-slate-50 rounded-2xl text-xs uppercase"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-[#1f2a44] uppercase tracking-widest">Shift Date</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                className="block w-full pl-12 pr-4 py-3 rounded-2xl border-slate-200 border text-sm font-bold focus:ring-[#1f2a44]"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="flex items-end pb-1">
             <div className="flex-grow flex items-center justify-between bg-slate-50 rounded-2xl px-5 py-3 border border-slate-100">
               <span className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Calculated Total</span>
               <span className="text-xl font-mono font-black text-[#1f2a44]">{formatMinutesToHMM(formData.duration_mins)}</span>
             </div>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-[#1f2a44] uppercase tracking-widest">Time In</label>
            <input
              type="time"
              className="block w-full rounded-2xl border-slate-200 py-3 px-5 border text-sm font-bold focus:ring-[#1f2a44]"
              value={formData.clock_in}
              onChange={(e) => setFormData(prev => ({ ...prev, clock_in: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-[#1f2a44] uppercase tracking-widest">Time Out</label>
            <input
              type="time"
              className="block w-full rounded-2xl border-slate-200 py-3 px-5 border text-sm font-bold focus:ring-[#1f2a44]"
              value={formData.clock_out}
              onChange={(e) => setFormData(prev => ({ ...prev, clock_out: e.target.value }))}
              required
            />
          </div>
        </div>

        <div 
          className="flex items-center space-x-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer group"
          onClick={() => setFormData(p => ({...p, lunch_30_min: !p.lunch_30_min}))}
        >
          <input
            type="checkbox"
            className="w-5 h-5 text-[#1f2a44] border-slate-300 rounded focus:ring-[#1f2a44]"
            checked={formData.lunch_30_min}
            onChange={(e) => setFormData(prev => ({ ...prev, lunch_30_min: e.target.checked }))}
            onClick={(e) => e.stopPropagation()}
          />
          <div>
            <p className="text-xs font-black text-[#1f2a44] uppercase tracking-wide">30-Min Lunch Break</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Auto-subtracts from daily total</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-black text-[#1f2a44] uppercase tracking-widest">Notes / Job Site</label>
          <input
            className="block w-full rounded-2xl border-slate-200 py-3 px-5 border text-sm font-bold focus:ring-[#1f2a44]"
            placeholder="Describe the job or location..."
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          />
        </div>

        <div className="flex gap-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-4 px-4 border border-slate-200 rounded-2xl text-xs font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              Discard
            </button>
          )}
          <button
            type="submit"
            className="flex-[2] py-4 px-4 border border-transparent rounded-2xl shadow-xl text-xs font-black text-white bg-[#1f2a44] hover:opacity-90 transition-all transform active:scale-95 uppercase tracking-[0.2em]"
          >
            {editingEntry ? 'Save Changes' : 'Confirm Entry'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddEntry;
