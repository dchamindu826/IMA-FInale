import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Settings2, Database, Key, UploadCloud, Terminal, Trash2, Power, FileText, CheckCircle, RefreshCw, Square, Play } from 'lucide-react';

export default function CrmSetup() {
  const [activePhase, setActivePhase] = useState('FREE_SEMINAR'); 
  const [config, setConfig] = useState({
    batch_id: '1', meta_number: '', meta_phone_id: '', meta_wa_id: '', meta_access_token: '', gemini_keys: [''], is_gemini_active: true
  });
  
  // Terminal & Upload State
  const [file, setFile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [logs, setLogs] = useState(["[System] Ready to ingest data...", "[System] Waiting for PDF upload..."]);
  const [loading, setLoading] = useState(false);
  const [controller, setController] = useState(null);
  const logsEndRef = useRef(null);

  // Auto-scroll terminal
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Fetch Config & Docs when Phase changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const confRes = await api.get(`/crm/setup/config/${activePhase}`);
        if(confRes.data) setConfig(confRes.data);
        
        const docsRes = await api.get(`/crm/setup/documents/${activePhase}`);
        setDocuments(docsRes.data || []);
        
        setLogs([`[System] Switched to ${activePhase} Phase`, "[System] Waiting for PDF upload..."]);
      } catch (error) {
        toast.error("Failed to load settings");
      }
    };
    fetchData();
  }, [activePhase]);

  // Handlers for Settings
  const handleConfigChange = (e) => setConfig({ ...config, [e.target.name]: e.target.value });
  
  const handleKeyChange = (idx, value) => {
    const newKeys = [...config.gemini_keys];
    newKeys[idx] = value;
    setConfig({ ...config, gemini_keys: newKeys });
  };

  const addGeminiKey = () => {
    if (config.gemini_keys.length < 5) setConfig({ ...config, gemini_keys: [...config.gemini_keys, ''] });
    else toast.error("Maximum 5 keys allowed!");
  };

  const removeGeminiKey = (idx) => {
    setConfig({ ...config, gemini_keys: config.gemini_keys.filter((_, i) => i !== idx) });
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    const tid = toast.loading("Saving...");
    try {
      await api.post('/crm/setup/config', { phase: activePhase, ...config });
      toast.success("Settings Saved!", { id: tid });
    } catch (error) { toast.error("Failed to save", { id: tid }); }
  };

  // 🔴 LIVE STREAMING RAG INGESTION 🔴
  const handleIngest = async (e) => {
    e.preventDefault();
    if(!file) return toast.error("Please select a PDF file");

    setLoading(true);
    setLogs(["🚀 Initializing System...", "📂 Starting Upload..."]);
    const abortCtrl = new AbortController();
    setController(abortCtrl);

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('phase', activePhase);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${api.defaults.baseURL}/crm/setup/ingest`, { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
        signal: abortCtrl.signal,
      });

      if (!response.ok) throw new Error(`Server Error`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter(line => line.trim() !== '');
        setLogs(prev => [...prev, ...lines]);
      }
      
      // Refresh documents list
      const docsRes = await api.get(`/crm/setup/documents/${activePhase}`);
      setDocuments(docsRes.data || []);
      setFile(null);

    } catch (err) {
      if (err.name === 'AbortError') setLogs(prev => [...prev, "🛑 Process Stopped by User."]);
      else setLogs(prev => [...prev, `❌ Error: ${err.message}`]);
    } finally {
      setLoading(false);
      setController(null);
    }
  };

  const deleteDoc = async (id) => {
    try {
      await api.delete(`/crm/setup/documents/${id}`);
      setDocuments(documents.filter(d => d.id !== id));
      toast.success("Document deleted");
    } catch(e) { toast.error("Failed to delete"); }
  };

  return (
    <div className="w-full text-slate-200 animate-in fade-in duration-500 h-[calc(100vh-80px)] flex flex-col font-sans pb-4 max-w-screen-2xl mx-auto px-4 lg:px-8">
      
      {/* HEADER & TABS */}
      <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-3">
            <Settings2 className="text-blue-500" size={32}/> CRM Setup & AI Engine
          </h2>
          <div className="flex gap-3 mt-4 bg-slate-900/50 p-1.5 rounded-xl border border-white/5 w-fit">
            <button onClick={() => setActivePhase('FREE_SEMINAR')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activePhase === 'FREE_SEMINAR' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              FREE SEMINAR PHASE
            </button>
            <button onClick={() => setActivePhase('AFTER_SEMINAR')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activePhase === 'AFTER_SEMINAR' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              AFTER SEMINAR PHASE
            </button>
          </div>
        </div>
        
        {/* Phase Toggle */}
        <div className="bg-white/5 border border-white/10 px-5 py-3 rounded-2xl flex items-center gap-4">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase">{activePhase.replace('_', ' ')} Status</p>
            <p className={`text-sm font-black ${config.is_gemini_active ? 'text-emerald-400' : 'text-red-400'}`}>
              {config.is_gemini_active ? 'ACTIVE (BOT ON)' : 'DISABLED'}
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={config.is_gemini_active} onChange={() => setConfig({...config, is_gemini_active: !config.is_gemini_active})} />
            <div className="w-14 h-7 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
        
        {/* 🔴 LEFT COLUMN: API SETTINGS 🔴 */}
        <div className="col-span-5 h-full overflow-y-auto custom-scrollbar pr-2 pb-10">
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 shadow-xl">
            <form onSubmit={saveSettings} className="space-y-6">
              
              {activePhase === 'FREE_SEMINAR' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Target Batch</label>
                  <select name="batch_id" value={config.batch_id} onChange={handleConfigChange} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-sm">
                    <option value="1">2026 A/L Batch</option>
                    <option value="2">2027 A/L Batch</option>
                  </select>
                </div>
              )}

              <div className="pt-4 border-t border-white/5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Database size={16} className="text-blue-400"/> Meta API Credentials</h3>
                <div className="space-y-4">
                  <input type="text" name="meta_number" placeholder="WhatsApp Number" value={config.meta_number} onChange={handleConfigChange} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-blue-500" />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" name="meta_phone_id" placeholder="Phone ID" value={config.meta_phone_id} onChange={handleConfigChange} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-blue-500" />
                    <input type="text" name="meta_wa_id" placeholder="WA Business ID" value={config.meta_wa_id} onChange={handleConfigChange} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-blue-500" />
                  </div>
                  <textarea name="meta_access_token" placeholder="Permanent Access Token" value={config.meta_access_token} onChange={handleConfigChange} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-blue-500 h-20 custom-scrollbar"></textarea>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2"><Key size={16} className="text-yellow-400"/> Gemini API Keys</h3>
                  <button type="button" onClick={addGeminiKey} className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg font-bold hover:bg-blue-500 hover:text-white transition-colors">+ Add Key</button>
                </div>
                <div className="space-y-3">
                  {config.gemini_keys.map((key, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input type="text" placeholder={`Gemini Key ${idx + 1}`} value={key} onChange={(e) => handleKeyChange(idx, e.target.value)} className="flex-1 bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-yellow-500" />
                      {config.gemini_keys.length > 1 && (
                        <button type="button" onClick={() => removeGeminiKey(idx)} className="bg-red-500/20 text-red-400 p-3 rounded-xl hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={16}/></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className={`w-full text-white font-black py-4 rounded-xl shadow-lg mt-6 transition-all ${activePhase === 'FREE_SEMINAR' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20' : 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20'}`}>
                SAVE {activePhase.replace('_', ' ')} CONFIGURATION
              </button>
            </form>
          </div>
        </div>

        {/* 🔴 RIGHT COLUMN: RAG INGESTION & TERMINAL 🔴 */}
        <div className="col-span-7 h-full flex flex-col space-y-4 pb-4">
          
          {/* Uploader Box */}
          <div className="bg-[#111] p-6 rounded-[2rem] border border-white/10 shadow-2xl">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
                <UploadCloud size={20} className="text-green-500"/> Train AI Brain (PDF Ingestion)
            </h2>
            <form onSubmit={handleIngest} className="flex gap-4 items-center">
                <div className="flex-1 border-2 border-dashed border-white/10 rounded-2xl p-4 text-center hover:border-blue-500/50 transition bg-black/40 relative group">
                    <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    {file ? <div className="text-green-400 font-bold text-sm flex items-center justify-center gap-2"><CheckCircle size={18}/> {file.name}</div> : <div className="text-xs font-bold text-gray-400">Click or Drop PDF (Timetables, Fees, Course Info)</div>}
                </div>
                {!loading ? (
                  <button type="submit" className="bg-green-600 hover:bg-green-500 text-white font-bold px-8 py-4 rounded-2xl flex items-center gap-2 h-full"><Play size={18}/> Ingest</button>
                ) : (
                  <button type="button" onClick={() => controller?.abort()} className="bg-red-600 hover:bg-red-500 text-white font-bold px-8 py-4 rounded-2xl flex items-center gap-2 h-full animate-pulse"><Square size={18}/> STOP</button>
                )}
            </form>
          </div>

          {/* Terminal Box */}
          <div className="flex-1 flex flex-col h-full min-h-0">
             <div className="bg-[#0f0f0f] border border-white/10 rounded-t-3xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2"><Terminal size={18} className="text-amber-500"/> <span className="font-mono text-sm font-bold text-gray-300">Live Ingestion Logs</span></div>
                <button onClick={() => setLogs([])} className="text-xs text-gray-500 hover:text-white flex items-center gap-1"><RefreshCw size={12}/> Clear</button>
             </div>
             <div className="flex-1 bg-[#050505] border-x border-b border-white/10 rounded-b-3xl p-6 overflow-y-auto font-mono text-xs md:text-sm space-y-2 custom-scrollbar shadow-inner">
                {logs.length === 0 && <div className="h-full flex flex-col items-center justify-center text-gray-800"><Terminal size={48} className="opacity-20"/><p className="opacity-40">Ready...</p></div>}
                {logs.map((log, i) => (
                  <div key={i} className={`p-2 rounded border-l-2 break-words ${log.includes('❌') || log.includes('🛑') ? 'bg-red-900/10 text-red-400 border-red-500' : log.includes('✅') || log.includes('🎉') ? 'bg-green-900/10 text-green-400 border-green-500' : 'text-gray-300 border-gray-700'}`}>
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
             </div>
          </div>

          {/* Ingested Documents */}
          <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-xl">
             <h3 className="text-xs font-bold text-white mb-3 uppercase tracking-wider flex items-center gap-2"><FileText size={14} className="text-blue-400"/> Documents Trained for {activePhase.replace('_', ' ')}</h3>
             <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2">
                {documents.length === 0 ? <p className="text-xs text-slate-500">No documents ingested.</p> : documents.map(doc => (
                  <div key={doc.id} className="min-w-[200px] flex items-center justify-between bg-black/40 border border-white/5 p-3 rounded-xl">
                    <div className="truncate pr-3">
                      <p className="text-xs text-white font-bold truncate">{doc.file_name}</p>
                      <p className="text-[9px] text-slate-500">{new Date(doc.created_at).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => deleteDoc(doc.id)} className="text-red-400 hover:text-red-300 bg-red-500/10 p-2 rounded-lg shrink-0"><Trash2 size={14}/></button>
                  </div>
                ))}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}