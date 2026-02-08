
import React, { useState } from 'react';
import { Upload, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { TimeEntry } from '../types';
// Fixed: validateEntry is now correctly imported from utils
import { validateEntry, getDurationMinutes } from '../utils';

interface BulkImportProps {
  onImport: (entries: TimeEntry[]) => void;
}

const BulkImport: React.FC<BulkImportProps> = ({ onImport }) => {
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState<{ entry: TimeEntry; error: string | null }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleParse = () => {
    setIsProcessing(true);
    const lines = inputText.split('\n').filter(line => line.trim());
    const parsed: { entry: TimeEntry; error: string | null }[] = [];

    lines.forEach(line => {
      // Expected: John | 2026-02-01 | 08:00-17:00 | lunch
      const parts = line.split('|').map(p => p.trim());
      
      if (parts.length < 3) {
        parsed.push({
          entry: {} as any,
          error: `Invalid format: "${line.substring(0, 30)}..."`
        });
        return;
      }

      const name = parts[0];
      const date = parts[1];
      const timeRange = parts[2];
      
      const hasLunch = /lunch|break|30|30min|0:30/.test(line.toLowerCase());
      
      const [clockIn, clockOut] = timeRange.split(/[-–—]/).map(t => t.trim());

      // Fixed: Added job_name and duration_mins to match TimeEntry interface requirements
      const entry: TimeEntry = {
        id: crypto.randomUUID(),
        person_name: name,
        job_name: 'Bulk Import',
        date: date,
        clock_in: clockIn || '00:00',
        clock_out: clockOut || '00:00',
        lunch_30_min: hasLunch,
        notes: `Bulk imported line: ${line}`,
        created_at: Date.now(),
        duration_mins: getDurationMinutes(clockIn || '00:00', clockOut || '00:00', hasLunch)
      };

      const error = validateEntry(entry);
      parsed.push({ entry, error });
    });

    setResults(parsed);
    setIsProcessing(false);
  };

  const confirmImport = () => {
    const validEntries = results.filter(r => !r.error).map(r => r.entry);
    if (validEntries.length > 0) {
      onImport(validEntries);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5" />
          Bulk Paste Import
        </h2>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-bold mb-1">How it works:</p>
              <p>Paste lines using the following format:</p>
              <code className="block bg-blue-100 p-2 mt-2 rounded font-mono text-xs">
                Name | YYYY-MM-DD | HH:mm-HH:mm | [lunch]
              </code>
              <p className="mt-2">Example:</p>
              <code className="block bg-blue-100 p-2 mt-1 rounded font-mono text-xs">
                John | 2026-02-01 | 08:00-17:00 | lunch<br/>
                Sarah | 2026-02-01 | 09:00-18:00
              </code>
            </div>
          </div>
        </div>

        <textarea
          className="w-full h-48 p-4 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
          placeholder="Paste your lines here..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleParse}
            disabled={!inputText.trim() || isProcessing}
            className="flex-grow py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95"
          >
            {isProcessing ? 'Processing...' : 'Parse Lines'}
          </button>
          {results.length > 0 && results.some(r => !r.error) && (
            <button
              onClick={confirmImport}
              className="px-8 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-all active:scale-95"
            >
              Import Valid ({results.filter(r => !r.error).length})
            </button>
          )}
        </div>
      </div>

      {results.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-bold text-gray-700">Preview Results</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Parsed Entry</th>
                  <th className="px-6 py-3">Lunch</th>
                  <th className="px-6 py-3">Error Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {results.map((res, i) => (
                  <tr key={i} className={`text-sm ${res.error ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-3">
                      {res.error ? (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {res.error ? (
                        <span className="text-gray-400 italic">Failed</span>
                      ) : (
                        <div>
                          <p className="font-bold text-gray-900">{res.entry.person_name}</p>
                          <p className="text-xs text-gray-500">{res.entry.date} | {res.entry.clock_in}-{res.entry.clock_out}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {res.entry.lunch_30_min ? 'Yes' : 'No'}
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-xs text-red-600">{res.error || '-'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkImport;
