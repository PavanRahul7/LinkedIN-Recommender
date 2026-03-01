
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router } from 'react-router-dom';
import { Profile, EnrichmentProgress, ColumnMapping, FieldType } from './types';
import { parseRawCSV, detectMappings, finalizeProfiles, parseEnrichedCSV, exportToCSV, exportToJSON, downloadXLSX, downloadFile } from './services/csv';
import { enrichWithGemini, inferFromTitle, identifyRole, recommendProfiles } from './services/gemini';
import ProfileCard from './components/ProfileCard';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function UploadPage({ 
  onRawLoad, 
  onEnrichedLoad 
}: { 
  onRawLoad: (headers: string[], rows: string[][]) => void,
  onEnrichedLoad: (profiles: Profile[]) => void
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File, isRestore: boolean) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (isRestore) {
        if (file.name.endsWith('.json')) {
          try {
            const profiles = JSON.parse(text);
            onEnrichedLoad(profiles);
          } catch (err) {
            alert("Error parsing JSON file. Please ensure it is a valid export from this tool.");
          }
        } else if (file.name.endsWith('.csv')) {
          try {
            const { headers, rows } = parseRawCSV(text);
            const profiles = parseEnrichedCSV(headers, rows);
            if (profiles.length > 0) {
              onEnrichedLoad(profiles);
            } else {
              alert("No valid data found in CSV. Ensure it follows the expected enriched format.");
            }
          } catch (err) {
            alert("Error parsing CSV file.");
          }
        }
      } else {
        const { headers, rows } = parseRawCSV(text);
        onRawLoad(headers, rows);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 animate-fadeIn">
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-black text-slate-50 mb-4 tracking-tighter">
          LinkedIn <span className="text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">Recommender</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-lg mx-auto font-light italic">
          High-fidelity networking intelligence.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
        {/* NEW EXTRACTION */}
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0], false); }}
          onClick={() => fileInputRef.current?.click()}
          className={`p-12 border-2 border-dashed rounded-[2.5rem] cursor-pointer transition-all duration-500 flex flex-col items-center gap-6 group ${
            isDragging ? 'border-blue-500 bg-blue-500/5 scale-[1.02]' : 'border-slate-800 bg-slate-900/30 hover:border-slate-600 hover:bg-slate-900/50'
          }`}
        >
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-4xl shadow-[0_0_30px_rgba(37,99,235,0.4)] group-hover:scale-110 transition-transform">➕</div>
          <div className="text-center">
            <p className="text-xl font-bold text-slate-100">New Extraction</p>
            <p className="text-slate-500 mt-2 text-sm font-light">Upload raw attendee list (CSV)</p>
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], false)} />
        </div>

        {/* RESTORE SESSION */}
        <div 
          onClick={() => restoreInputRef.current?.click()}
          className="p-12 border-2 border-slate-800 bg-slate-900/10 hover:bg-slate-900/40 hover:border-slate-600 rounded-[2.5rem] cursor-pointer transition-all duration-500 flex flex-col items-center gap-6 group"
        >
          <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center text-slate-400 text-4xl group-hover:scale-110 transition-transform">📂</div>
          <div className="text-center">
            <p className="text-xl font-bold text-slate-100">Import Enriched Data</p>
            <p className="text-slate-500 mt-2 text-sm font-light">Load previously processed .json or .csv</p>
          </div>
          <input type="file" ref={restoreInputRef} className="hidden" accept=".json,.csv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0], true)} />
        </div>
      </div>
    </div>
  );
}

function MappingPage({ headers, rows, onComplete }: { headers: string[], rows: string[][], onComplete: (profiles: Profile[]) => void }) {
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState('');

  useEffect(() => {
    setMappings(detectMappings(headers, rows));
  }, [headers, rows]);

  const updateMapping = (idx: number, field: FieldType) => {
    setMappings(prev => prev.map((m, i) => i === idx ? { ...m, mappedTo: field } : m));
  };

  const handleFinalize = async () => {
    setIsProcessing(true);
    const initialProfiles = finalizeProfiles(mappings, rows);
    const missingRoles = initialProfiles.filter(p => !p.title || !p.company);

    if (missingRoles.length > 0) {
      setProcessStatus(`Identifying ${missingRoles.length} missing roles...`);
      const updatedProfiles = [...initialProfiles];
      for (let i = 0; i < updatedProfiles.length; i++) {
        const p = updatedProfiles[i];
        if (!p.title || !p.company) {
          setProcessStatus(`Discovering ${p.name}...`);
          try {
            const roleInfo = await identifyRole(p.name, p.linkedin_url);
            p.title = roleInfo.title || p.title;
            p.company = roleInfo.company || p.company;
            p.region = roleInfo.region || p.region;
          } catch (e) {
            console.error(e);
          }
          await sleep(500); // Slight delay for rate limits
        }
      }
      onComplete(updatedProfiles);
    } else {
      onComplete(initialProfiles);
    }
    setIsProcessing(false);
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-fadeIn">
      {isProcessing && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin text-5xl mb-6">⚡</div>
            <p className="text-xl font-bold text-slate-100 mb-2">Automating Data Fill</p>
            <p className="text-slate-400 italic text-sm">{processStatus}</p>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-50 tracking-tight">Map Your Columns</h2>
          <p className="text-slate-400 font-light mt-1">Identify which column is which. We'll auto-fill missing info next.</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
           <span className="text-emerald-500 text-xs font-bold uppercase tracking-wider">Ready to import</span>
        </div>
      </div>

      <div className="space-y-4 mb-10">
        {mappings.map((m, i) => (
          <div key={i} className="bg-[#0f172a]/80 border border-slate-800 rounded-2xl p-6 flex items-center justify-between shadow-xl">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-lg font-bold text-slate-50">{m.header}</span>
                {m.autoDetected && (
                  <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-black border border-emerald-500/20">Auto-detected</span>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-slate-600 text-xs truncate max-w-[400px]">
                  {m.preview.join(', ')}
                </span>
                <span className="text-slate-700">›</span>
              </div>
            </div>
            <select 
              value={m.mappedTo}
              onChange={(e) => updateMapping(i, e.target.value as FieldType)}
              className="bg-[#020617] border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-300 focus:border-blue-500 outline-none w-48 cursor-pointer appearance-none"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
            >
              <option value="ignore">Ignore Column</option>
              <option value="name">Name *</option>
              <option value="title">Job Title</option>
              <option value="company">Company</option>
              <option value="linkedin_url">LinkedIn URL</option>
              <option value="email">Email</option>
            </select>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <button onClick={handleFinalize} className="bg-blue-600 text-white px-12 py-4 rounded-2xl font-black shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-all active:scale-95">
          Proceed & Auto-Fill Roles
        </button>
      </div>
    </div>
  );
}

function SelectionPage({ profiles, onStart }: { profiles: Profile[], onStart: (selected: Profile[]) => void }) {
  const [list, setList] = useState(profiles);
  const [roleSearch, setRoleSearch] = useState('');

  const toggle = (id: string) => {
    setList(prev => prev.map(p => p.id === id ? { ...p, selected: !p.selected } : p));
  };

  const selectFiltered = (selected: boolean) => {
    const filteredIds = new Set(filteredList.map(p => p.id));
    setList(prev => prev.map(p => filteredIds.has(p.id) ? { ...p, selected } : p));
  };

  const filteredList = list.filter(p => {
    const search = roleSearch.toLowerCase();
    return (p.title || '').toLowerCase().includes(search) || 
           (p.company || '').toLowerCase().includes(search) || 
           (p.name || '').toLowerCase().includes(search);
  });

  const selectedCount = list.filter(p => p.selected).length;

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-50 tracking-tight">Limit Enrichment Scope</h2>
          <p className="text-slate-400 font-light">Select specific roles or individuals for high-fidelity enrichment.</p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => selectFiltered(true)} className="bg-slate-800 hover:bg-slate-700 text-blue-400 text-[10px] px-3 py-1.5 rounded-lg font-bold border border-slate-700 transition-all">Select Visible</button>
           <button onClick={() => selectFiltered(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] px-3 py-1.5 rounded-lg font-bold border border-slate-700 transition-all">Deselect Visible</button>
        </div>
      </div>

      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <span className="text-slate-500">🔍</span>
        </div>
        <input 
          type="text" 
          placeholder="Filter roles (e.g. CEO, Founder, Engineer)..." 
          className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all placeholder:text-slate-600 font-medium"
          value={roleSearch}
          onChange={(e) => setRoleSearch(e.target.value)}
        />
      </div>

      <div className="bg-[#0f172a]/60 border border-slate-800 rounded-3xl overflow-hidden mb-10 shadow-2xl">
        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-[#0f172a] text-[#475569] text-[10px] uppercase tracking-widest font-black border-b border-slate-800 z-10">
              <tr>
                <th className="p-4 w-12 text-center">Enrich</th>
                <th className="p-4">Attendee</th>
                <th className="p-4">Identified Role</th>
                <th className="p-4">LinkedIn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredList.map(p => (
                <tr key={p.id} className={`hover:bg-slate-800/30 transition-colors ${!p.selected ? 'opacity-40 grayscale' : ''}`}>
                  <td className="p-4 text-center">
                    <input 
                      type="checkbox" 
                      checked={p.selected} 
                      onChange={() => toggle(p.id)} 
                      className="w-5 h-5 rounded-md bg-slate-800 border-slate-700 text-blue-500 focus:ring-blue-500/20 cursor-pointer" 
                    />
                  </td>
                  <td className="p-4 font-bold text-slate-200 truncate max-w-[200px]">{p.name}</td>
                  <td className="p-4">
                    {p.title || p.company ? (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 truncate max-w-[300px]">
                          <span className="text-slate-200 font-medium">{p.title}</span>
                          {p.title && p.company && <span className="text-slate-600">@</span>}
                          <span className="text-slate-400">{p.company}</span>
                        </div>
                        {p.region && <span className="text-[10px] text-slate-500">📍 {p.region}</span>}
                      </div>
                    ) : (
                      <span className="text-amber-500/80 text-[10px] uppercase font-black tracking-widest">Needs Identification Phase</span>
                    )}
                  </td>
                  <td className="p-4 text-xs text-blue-500/70">
                    {p.linkedin_url ? (
                      <span className="opacity-60 truncate block max-w-[150px]">
                        {p.linkedin_url.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//, '')}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-center flex-col items-center gap-4">
        <button 
          onClick={() => onStart(list.filter(p => p.selected))}
          disabled={selectedCount === 0}
          className="bg-blue-600 disabled:bg-slate-800 disabled:text-slate-600 text-white px-12 py-5 rounded-2xl font-black text-lg shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:bg-blue-500 transition-all active:scale-95 flex items-center gap-4 group disabled:shadow-none"
        >
          Enrich {selectedCount} Selected Profiles
          <span className="group-hover:translate-x-1 transition-transform">🚀</span>
        </button>
      </div>
    </div>
  );
}

function ProgressPage({ profiles, onComplete }: { profiles: Profile[], onComplete: (enriched: Profile[]) => void }) {
  const [progress, setProgress] = useState<EnrichmentProgress>({
    current: 0, total: profiles.length, percentage: '0', currentName: '', phase: 'identifying', logs: []
  });
  const isEnriching = useRef(false);

  useEffect(() => {
    if (isEnriching.current) return;
    isEnriching.current = true;

    const startEnrichment = async () => {
      const enriched: Profile[] = [];
      for (let i = 0; i < profiles.length; i++) {
        const p = profiles[i];
        let currentTitle = p.title;
        let currentCompany = p.company;

        setProgress(prev => ({ ...prev, current: i + 1, currentName: p.name, percentage: (((i + 1) / profiles.length) * 100).toFixed(1) }));

        // Role discovery if still missing (last resort)
        if (!currentTitle || !currentCompany) {
          setProgress(prev => ({ ...prev, phase: 'identifying' }));
          const discovered = await identifyRole(p.name, p.linkedin_url);
          currentTitle = discovered.title || currentTitle;
          currentCompany = discovered.company || currentCompany;
        }

        setProgress(prev => ({ ...prev, phase: 'extracting' }));
        try {
          const result = await enrichWithGemini(p.name, currentTitle, currentCompany, p.linkedin_url);
          if (result.is_valid) {
            enriched.push({ 
              ...p, 
              ...result, 
              title: currentTitle, 
              company: currentCompany, 
              enrichment_status: 'success', 
              enrichment_source: 'gemini_web' 
            });
          } else {
            const fallback = await inferFromTitle(currentTitle, currentCompany);
            enriched.push({ 
              ...p, 
              background: `Professional connection.`, 
              what_they_do: fallback.typical_responsibilities, 
              skills: fallback.typical_skills, 
              title: currentTitle, 
              company: currentCompany, 
              enrichment_status: 'fallback', 
              enrichment_source: 'title_inference' 
            });
          }
          setProgress(prev => ({ ...prev, logs: [{ name: p.name, status: 'success' as const, message: 'Extracted' }, ...prev.logs].slice(0, 50) }));
        } catch (e) {
          enriched.push({ ...p, enrichment_status: 'error', enrichment_source: 'none' });
          setProgress(prev => ({ ...prev, logs: [{ name: p.name, status: 'error' as const, message: 'Error' }, ...prev.logs].slice(0, 50) }));
        }
        await sleep(1500);
      }
      onComplete(enriched);
    };
    startEnrichment();
  }, [profiles, onComplete]);

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 animate-fadeIn">
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-slate-800 overflow-hidden">
        <div className="p-10 border-b border-slate-800/50">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-black text-slate-50 tracking-tight">AI Enrichment</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${progress.phase === 'identifying' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' : 'bg-blue-500/20 text-blue-400 border border-blue-500/20'}`}>
                  {progress.phase === 'identifying' ? 'Role Discovery' : 'Intelligence Extraction'}
                </span>
              </div>
            </div>
            <span className="text-5xl font-black text-blue-500">{progress.percentage}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden shadow-inner">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-400 h-full transition-all duration-700" style={{ width: `${progress.percentage}%` }}></div>
          </div>
        </div>
        <div className="p-10 h-[300px] overflow-y-auto custom-scrollbar space-y-2">
          {progress.logs.map((log, i) => (
            <div key={i} className="flex items-center gap-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
              <div className={`w-2 h-2 rounded-full ${log.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
              <span className="font-bold text-slate-200">{log.name}</span>
              <span className="text-slate-500 text-xs ml-auto">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResultsPage({ profiles }: { profiles: Profile[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [results, setResults] = useState(profiles);
  const [selectedRegion, setSelectedRegion] = useState('All Regions');
  const [showExportMenu, setShowExportMenu] = useState(false);

  const regions = ['All Regions', ...Array.from(new Set(profiles.map(p => p.region).filter(Boolean))) as string[]];

  const handleAgentSearch = async () => {
    const q = searchQuery.toLowerCase().trim();
    setIsAgentThinking(true);
    try {
      let filtered = profiles;
      if (selectedRegion !== 'All Regions') {
        filtered = filtered.filter(p => p.region === selectedRegion);
      }

      if (!q) {
        setResults(filtered);
        return;
      }
      
      // If the query is complex or long, use Gemini
      if (q.length > 10) {
        const recommendations = await recommendProfiles(q, filtered);
        if (recommendations.length > 0) {
          const recMap = new Map(recommendations.map(r => [r.id, r]));
          const matchedProfiles = filtered
            .filter(p => recMap.has(p.id))
            .map(p => ({
              ...p,
              score: recMap.get(p.id)?.score,
              match_reason: recMap.get(p.id)?.reason
            }))
            .sort((a, b) => (b.score || 0) - (a.score || 0));
          
          setResults(matchedProfiles);
        } else {
          setResults(filtered.filter(p => {
            const text = `${p.name} ${p.title} ${p.company} ${p.background} ${(p.skills || []).join(' ')}`.toLowerCase();
            return text.includes(q);
          }));
        }
      } else {
        setResults(filtered.filter(p => {
          const text = `${p.name} ${p.title} ${p.company} ${p.background} ${(p.skills || []).join(' ')}`.toLowerCase();
          return text.includes(q);
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAgentThinking(false);
    }
  };

  useEffect(() => {
    handleAgentSearch();
  }, [selectedRegion]);

  useEffect(() => {
    setResults(profiles);
  }, [profiles]);

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 animate-fadeIn">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h2 className="text-4xl font-black text-slate-50 tracking-tight">Intelligence Dashboard</h2>
          <p className="text-slate-500 font-light mt-1">Found {results.length} matching insights.</p>
        </div>
        <div className="relative">
          <button 
            onClick={() => {
              if (profiles.length === 0) return;
              setShowExportMenu(!showExportMenu);
            }}
            className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-500 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
             <span>📤</span> Export Enriched Data
          </button>
          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-[#0f172a] border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-[100]">
              <button 
                onClick={() => { downloadFile(exportToCSV(profiles), 'profiles.csv', 'text/csv'); setShowExportMenu(false); }}
                className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors border-b border-slate-800/50"
              >Export as CSV</button>
              <button 
                onClick={() => { downloadFile(exportToJSON(profiles), 'profiles.json', 'application/json'); setShowExportMenu(false); }}
                className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors border-b border-slate-800/50"
              >Export as JSON (Full session)</button>
              <button 
                onClick={() => { downloadXLSX(profiles, 'profiles.xlsx'); setShowExportMenu(false); }}
                className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >Export as XLSX</button>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 mb-16">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
            {isAgentThinking ? (
              <div className="animate-spin text-2xl">🧠</div>
            ) : (
              <span className="text-2xl">⚡</span>
            )}
          </div>
          <input 
            type="text" 
            placeholder="Ask the Networking Agent: 'Find founders with 5+ years of experience in climate tech'..." 
            className={`w-full bg-slate-900 border ${isAgentThinking ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-800'} rounded-3xl pl-16 pr-40 py-8 text-lg text-slate-100 focus:border-blue-500 outline-none shadow-2xl transition-all placeholder:text-slate-600 font-medium`} 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleAgentSearch()} 
          />
          <button 
            onClick={handleAgentSearch} 
            disabled={isAgentThinking}
            className="absolute right-6 top-4 bottom-4 bg-blue-600 disabled:bg-slate-800 px-10 rounded-2xl text-white font-black hover:bg-blue-500 transition-all shadow-lg active:scale-95 flex items-center gap-2"
          >
            {isAgentThinking ? 'Analyzing...' : 'Ask Agent'}
          </button>
        </div>

        <div className="md:w-64">
          <select 
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-3xl px-6 py-8 text-slate-300 focus:border-blue-500 outline-none appearance-none cursor-pointer font-bold h-full shadow-2xl"
            style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.5rem center', backgroundSize: '1.2em' }}
          >
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {results.map(p => <ProfileCard key={p.id} profile={p} />)}
      </div>
      {results.length === 0 && (
        <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-slate-800 border-dashed">
          <div className="text-5xl mb-4 opacity-30">🕵️‍♂️</div>
          <p className="text-slate-500 text-xl font-light">No matches found for your criteria.</p>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<'upload' | 'mapping' | 'select' | 'enriching' | 'results'>('upload');
  const [rawCSV, setRawCSV] = useState<{ headers: string[], rows: string[][] }>({ headers: [], rows: [] });
  const [profiles, setProfiles] = useState<Profile[]>([]);

  return (
    <Router>
      <div className="min-h-screen flex flex-col text-slate-200 selection:bg-blue-500/30">
        <nav className="p-8 backdrop-blur-md sticky top-0 z-50 border-b border-slate-800/40 bg-slate-950/20 flex justify-between items-center">
          <div className="font-black text-2xl tracking-tighter flex items-center gap-3 cursor-pointer group" onClick={() => setView('upload')}>
            <span className="bg-blue-600 text-white w-10 h-10 flex items-center justify-center rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-transform">L</span>
            <span className="group-hover:text-blue-400 transition-colors">LinkedIn Recommender</span>
          </div>
          <button onClick={() => setView('upload')} className="text-[10px] font-black uppercase text-slate-500 hover:text-blue-400 tracking-widest transition-colors">New Session</button>
        </nav>
        
        <main className="max-w-7xl mx-auto w-full flex-grow pb-12">
          {view === 'upload' && <UploadPage 
            onRawLoad={(h, r) => { setRawCSV({ headers: h, rows: r }); setView('mapping'); }} 
            onEnrichedLoad={(p) => { setProfiles(p); setView('results'); }}
          />}
          {view === 'mapping' && <MappingPage headers={rawCSV.headers} rows={rawCSV.rows} onComplete={(p) => { setProfiles(p); setView('select'); }} />}
          {view === 'select' && <SelectionPage profiles={profiles} onStart={(p) => { setProfiles(p); setView('enriching'); }} />}
          {view === 'enriching' && <ProgressPage profiles={profiles} onComplete={(p) => { setProfiles(p); setView('results'); }} />}
          {view === 'results' && <ResultsPage profiles={profiles} />}
        </main>

        <footer className="py-8 border-t border-slate-800/40 text-center text-slate-500 text-sm bg-slate-950/40 backdrop-blur-md">
          <p className="flex items-center justify-center gap-2 font-medium">
            <span>Built with ❤️ by</span>
            <a
              href="https://www.linkedin.com/in/pavan-rahul-konathala-0b163b378/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 font-bold hover:text-blue-400 transition-colors underline decoration-blue-500/30 underline-offset-4"
            >
              Pavan Rahul K
            </a>
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-widest opacity-40 font-black">AI-Powered Networking Agent • 2024</p>
        </footer>
      </div>
    </Router>
  );
}
