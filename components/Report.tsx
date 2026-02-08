
import React, { useState, useMemo } from 'react';
import { Download, FileDown, Copy, Check, User, Calendar, Clock, Printer, Briefcase, CheckCircle, AlertCircle } from 'lucide-react';
import { TimeEntry } from '../types';
import { calculateDailyMinutes, formatMinutesToHMM } from '../utils';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface DailySummary {
  date: string;
  duration_mins: number;
  job_names: string[];
  entryIds: string[];
}

interface PersonReport {
  person_name: string;
  dailySummaries: DailySummary[];
  totalMins: number;
  allIds: string[];
}

interface ReportProps {
  entries: TimeEntry[];
  people: string[];
  onApprove: (ids: string[]) => void;
}

const Report: React.FC<ReportProps> = ({ entries, people, onApprove }) => {
  const [filterPerson, setFilterPerson] = useState('All');
  const [filterDateStart, setFilterDateStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [filterDateEnd, setFilterDateEnd] = useState(new Date().toISOString().split('T')[0]);
  const [copied, setCopied] = useState(false);

  const reportData = useMemo(() => {
    const filtered = entries.filter(entry => {
      const matchesPerson = filterPerson === 'All' || entry.person_name === filterPerson;
      const entryDate = new Date(entry.date).getTime();
      const matchesStart = !filterDateStart || entryDate >= new Date(filterDateStart).getTime();
      const matchesEnd = !filterDateEnd || entryDate <= new Date(filterDateEnd).getTime();
      return matchesPerson && matchesStart && matchesEnd;
    });

    const personMap: Record<string, Record<string, DailySummary>> = {};
    
    filtered.forEach(entry => {
      if (!personMap[entry.person_name]) {
        personMap[entry.person_name] = {};
      }
      
      if (!personMap[entry.person_name][entry.date]) {
        personMap[entry.person_name][entry.date] = {
          date: entry.date,
          duration_mins: 0,
          job_names: [],
          entryIds: []
        };
      }
      
      const day = personMap[entry.person_name][entry.date];
      day.duration_mins += entry.duration_mins;
      day.entryIds.push(entry.id);
      if (!day.job_names.includes(entry.job_name)) {
        day.job_names.push(entry.job_name);
      }
    });

    const results: PersonReport[] = Object.entries(personMap).map(([name, days]) => {
      const dailySummaries = Object.values(days).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const totalMins = dailySummaries.reduce((acc, curr) => acc + curr.duration_mins, 0);
      const allIds = dailySummaries.flatMap(d => d.entryIds);
      
      return {
        person_name: name,
        dailySummaries,
        totalMins,
        allIds
      };
    });

    return results.sort((a, b) => a.person_name.localeCompare(b.person_name));
  }, [entries, filterPerson, filterDateStart, filterDateEnd]);

  const formatDateShort = (dateStr: string) => {
    try {
      const date = new Date(dateStr + 'T12:00:00');
      return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    reportData.forEach((personReport) => {
      const rows = personReport.dailySummaries.map(d => ({
        'Date': d.date,
        'Job Sites': d.job_names.join(', '),
        'Total Hours': formatMinutesToHMM(d.duration_mins)
      }));

      rows.push({
        'Date': 'TOTAL', 
        'Job Sites': '', 
        'Total Hours': formatMinutesToHMM(personReport.totalMins)
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, personReport.person_name.substring(0, 31));
    });
    XLSX.writeFile(wb, `Timesheet_Daily_${filterDateStart}_${filterDateEnd}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF() as any;
    let first = true;

    reportData.forEach((personReport) => {
      if (!first) doc.addPage();
      first = false;

      doc.setFontSize(22);
      doc.setTextColor(31, 42, 68);
      doc.text('Daily Timesheet Report', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Employee: ${personReport.person_name}`, 14, 30);
      doc.text(`Range: ${filterDateStart} to ${filterDateEnd}`, 14, 35);

      const tableData = personReport.dailySummaries.map(d => [
        d.date, d.job_names.join(', '), formatMinutesToHMM(d.duration_mins)
      ]);

      tableData.push(['GRAND TOTAL', '', formatMinutesToHMM(personReport.totalMins)]);

      doc.autoTable({
        startY: 45,
        head: [['Date', 'Job Sites', 'Total Hours']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [31, 42, 68], textColor: [255, 255, 255] },
        footStyles: { fontStyle: 'bold', fillColor: [243, 244, 246] }
      });
    });
    doc.save(`Timesheet_Daily_${filterDateStart}_${filterDateEnd}.pdf`);
  };

  const copyAsTableText = () => {
    let text = `Daily Timesheet Report (${filterDateStart} - ${filterDateEnd})\n\n`;
    reportData.forEach((personReport) => {
      text += `Employee: ${personReport.person_name}\n`;
      text += `DATE       | JOB SITES            | TOTAL\n`;
      text += `-----------|----------------------|-------\n`;
      personReport.dailySummaries.forEach(d => {
        text += `${d.date.padEnd(10)} | ${d.job_names.join(', ').padEnd(20).substring(0, 20)} | ${formatMinutesToHMM(d.duration_mins)}\n`;
      });
      text += `-----------|----------------------|-------\n`;
      text += `TOTAL: ${formatMinutesToHMM(personReport.totalMins)}\n\n`;
    });
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApprovePerson = (name: string, ids: string[]) => {
    if (confirm(`Finalize and clear records for ${name}? This will remove approved entries from the database.`)) {
      onApprove(ids);
    }
  };

  return (
    <div className="space-y-6 md:space-y-10">
      {/* Config Panel */}
      <div className="bg-white p-5 md:p-8 rounded-[2rem] shadow-sm border border-slate-200">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Report Filter</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-[#1f2a44] uppercase tracking-widest">Worker</label>
            <select
              className="w-full py-2.5 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1f2a44] text-xs font-bold"
              value={filterPerson}
              onChange={(e) => setFilterPerson(e.target.value)}
            >
              <option value="All">All Workers</option>
              {people.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-[#1f2a44] uppercase tracking-widest">From</label>
            <input
              type="date"
              className="w-full py-2.5 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1f2a44] text-xs font-bold"
              value={filterDateStart}
              onChange={(e) => setFilterDateStart(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black text-[#1f2a44] uppercase tracking-widest">To</label>
            <input
              type="date"
              className="w-full py-2.5 px-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#1f2a44] text-xs font-bold"
              value={filterDateEnd}
              onChange={(e) => setFilterDateEnd(e.target.value)}
            />
          </div>
          <div className="flex gap-2 h-[42px]">
            <button
              onClick={copyAsTableText}
              className="flex-grow flex items-center justify-center gap-2 px-3 py-2 bg-[#1f2a44] rounded-xl text-[9px] font-black text-white uppercase hover:opacity-90 shadow-lg shadow-[#1f2a44]/10 transition-all active:scale-95"
            >
              {copied ? <Check className="w-3 h-3 text-[#8eba2b]" /> : <Copy className="w-3 h-3" />}
              COPY
            </button>
            <button onClick={exportExcel} className="p-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 hover:text-[#8eba2b] transition-colors"><FileDown className="w-4 h-4" /></button>
            <button onClick={exportPDF} className="p-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 hover:text-[#ff9559] transition-colors"><Download className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Reports Section */}
      <div className="space-y-8 pb-20">
        {reportData.length > 0 ? (
          reportData.map((personReport) => (
            <div key={personReport.person_name} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden group hover:border-[#1f2a44]/20 transition-all duration-300">
              
              {/* Header */}
              <div className="bg-[#1f2a44] p-5 md:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-[#ff9559] rounded-2xl flex items-center justify-center font-black text-xl md:text-2xl text-white shadow-xl">
                    {personReport.person_name[0]}
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-black leading-tight tracking-tight">{personReport.person_name}</h3>
                    <p className="text-[9px] text-white/40 uppercase font-black tracking-widest">{personReport.dailySummaries.length} Working Days</p>
                  </div>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto flex sm:flex-col justify-between items-end gap-2 border-t sm:border-t-0 border-white/5 pt-4 sm:pt-0">
                  <div>
                    <p className="text-[8px] uppercase font-black text-[#8eba2b] tracking-widest mb-0.5">Report Total</p>
                    <p className="text-2xl md:text-3xl font-mono font-black">{formatMinutesToHMM(personReport.totalMins)}</p>
                  </div>
                </div>
              </div>

              {/* Mobile Card Layout / Desktop Table Layout */}
              <div className="block md:hidden divide-y divide-slate-50 px-5">
                {personReport.dailySummaries.map(d => (
                  <div key={d.date} className="py-4 flex justify-between items-center gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-[#1f2a44]">{formatDateShort(d.date)}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {d.job_names.map(job => (
                          <span key={job} className="text-[8px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded uppercase">{job}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-mono font-black text-[#1f2a44]">{formatMinutesToHMM(d.duration_mins)}</p>
                      <p className="text-[7px] font-bold text-slate-300 uppercase tracking-widest">Shift Total</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="px-8 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Sites / Jobs</th>
                      <th className="px-8 py-4 text-[9px] font-black text-[#1f2a44] uppercase tracking-widest text-right">Daily Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {personReport.dailySummaries.map(d => (
                      <tr key={d.date} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-8 py-5 text-sm font-black text-[#1f2a44]">{formatDateShort(d.date)}</td>
                        <td className="px-8 py-5">
                          <div className="flex flex-wrap gap-1.5">
                            {d.job_names.map(job => (
                              <span key={job} className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 text-[10px] font-bold text-slate-500">
                                {job}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-8 py-5 text-sm font-black text-[#1f2a44] text-right font-mono">{formatMinutesToHMM(d.duration_mins)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Action Footer */}
              <div className="p-5 md:p-8 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <p className="text-[9px] font-bold uppercase tracking-widest leading-none">Review data before approving</p>
                </div>
                <button
                  onClick={() => handleApprovePerson(personReport.person_name, personReport.allIds)}
                  className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-[#8eba2b] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 shadow-lg shadow-[#8eba2b]/20 active:scale-95 transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  Finalize & Approve {personReport.person_name}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-[3rem] p-12 md:p-24 text-center border-2 border-dashed border-slate-200 flex flex-col items-center">
             <div className="bg-slate-50 p-6 rounded-full mb-6 text-slate-200">
                <Clock className="w-12 h-12" />
             </div>
             <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">No entries for this period</h3>
             <p className="text-slate-300 mt-2 font-bold max-w-xs text-xs">When employees clock out, their data will appear here aggregated by day.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Report;
