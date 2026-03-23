import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle2, AlertCircle, DollarSign, Bot, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function FinanceDashboard() {
  const [stats, setStats] = useState({ autoApproved: 0, manualPending: 0, todayRevenue: 0 });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // මේ අලුත් API Endpoints ටික අපි Finance Route එකේ හදන්න ඕනේ
        const statRes = await api.get('/admin/finance/overview');
        const logRes = await api.get('/admin/finance/logs');
        
        setStats(statRes.data);
        setLogs(logRes.data);
      } catch (error) {
        toast.error("Failed to load finance data");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const formatCurrency = (val) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(val);

  return (
    <div className="w-full text-slate-200 animate-in fade-in duration-500 h-full flex flex-col font-sans pb-6 max-w-screen-2xl mx-auto px-4">
      <div className="mb-8">
        <h2 className="text-4xl font-black text-white drop-shadow-md flex items-center gap-3 mb-2">
          <Bot className="text-blue-400" size={36}/> AI Finance Hub
        </h2>
        <p className="text-sm text-slate-400 font-medium">Overview of automated and manual slip verifications.</p>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center"><Activity className="animate-spin text-blue-500" size={40}/></div>
      ) : (
        <>
          {/* STATS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-800/60 border border-emerald-500/30 p-6 rounded-3xl shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-20"><CheckCircle2 size={80} className="text-emerald-500"/></div>
              <h3 className="text-emerald-400 text-sm font-bold uppercase tracking-widest mb-1">AI Auto Approved (Today)</h3>
              <p className="text-5xl font-black text-white">{stats.autoApproved}</p>
              <p className="text-xs text-slate-400 mt-2">Slips successfully matched by Gemini AI</p>
            </div>

            <div className="bg-slate-800/60 border border-yellow-500/30 p-6 rounded-3xl shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-20"><AlertCircle size={80} className="text-yellow-500"/></div>
              <h3 className="text-yellow-400 text-sm font-bold uppercase tracking-widest mb-1">Manual Review Queue</h3>
              <p className="text-5xl font-black text-white">{stats.manualPending}</p>
              <Link to="/admin/finance/verify" className="inline-flex items-center gap-2 text-xs font-bold text-yellow-400 mt-3 bg-yellow-500/10 px-3 py-1.5 rounded-lg hover:bg-yellow-500/20 transition-all">
                Review Now <ArrowRight size={14}/>
              </Link>
            </div>

            <div className="bg-slate-800/60 border border-blue-500/30 p-6 rounded-3xl shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-20"><DollarSign size={80} className="text-blue-500"/></div>
              <h3 className="text-blue-400 text-sm font-bold uppercase tracking-widest mb-1">Today's Total Revenue</h3>
              <p className="text-4xl font-black text-white mt-2">{formatCurrency(stats.todayRevenue)}</p>
              <p className="text-xs text-slate-400 mt-2">From all approved payments</p>
            </div>
          </div>

          {/* AI LOGS TABLE */}
          <div className="bg-slate-800/40 border border-white/10 rounded-[2rem] shadow-xl flex-1 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-white/10 bg-black/20">
              <h3 className="text-lg font-black text-white">Recent AI Verifications</h3>
            </div>
            <div className="overflow-x-auto p-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase">Payment ID</th>
                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase">AI Status</th>
                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase">Confidence</th>
                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase">Extracted Amount</th>
                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-3 text-sm font-bold text-white">#{log.payment_id}</td>
                      <td className="p-3">
                        {log.ai_status === 'MATCHED' ? <span className="text-emerald-400 text-xs font-bold bg-emerald-500/20 px-2 py-1 rounded">MATCHED</span> : 
                         log.ai_status === 'MISMATCHED' ? <span className="text-yellow-400 text-xs font-bold bg-yellow-500/20 px-2 py-1 rounded">MISMATCHED</span> : 
                         <span className="text-red-400 text-xs font-bold bg-red-500/20 px-2 py-1 rounded">UNREADABLE</span>}
                      </td>
                      <td className="p-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                            <div className={`h-full ${log.ai_confidence > 80 ? 'bg-emerald-500' : log.ai_confidence > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${log.ai_confidence}%` }}></div>
                          </div>
                          <span className="text-xs text-slate-400">{log.ai_confidence}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-sm font-medium text-slate-300">{log.extracted_amount ? formatCurrency(log.extracted_amount) : 'N/A'}</td>
                      <td className="p-3 text-xs text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}