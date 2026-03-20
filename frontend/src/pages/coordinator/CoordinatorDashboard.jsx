import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Building2, Layers, BookOpen, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../api/axios';

export default function CoordinatorDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        // 🔥 මෙන්න මේ පේළියේ /admin/ වෙනුවට /tasks/ කියලා වෙනස් කලා 🔥
        const res = await api.get('/tasks/coordinator/overview'); 
        setData(res.data);
        setError(false);
      } catch (error) {
        console.error("Error fetching overview:", error);
        setError(true); 
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, []);

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-blue-400" /></div>;

  if (error || !data?.batch) {
      return (
          <div className="flex h-full flex-col items-center justify-center text-center p-10 animate-in fade-in zoom-in duration-500">
            <AlertCircle size={80} className="text-red-500 mb-6 drop-shadow-lg opacity-50" />
            <h2 className="text-3xl font-bold text-white mb-2">No Batch Assigned</h2>
            <p className="text-slate-400">You haven't been assigned to a batch yet. Please contact your Manager.</p>
          </div>
      );
  }

  return (
    <div className="w-full text-slate-200 animate-in fade-in duration-500 relative h-full overflow-y-auto pb-10 custom-scrollbar pr-2">
      
      {/* Top Header: Business & Batch Info */}
      <div className="bg-slate-800/40 border border-white/10 backdrop-blur-xl p-6 rounded-3xl shadow-xl flex items-center gap-6 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        
        <div className="w-24 h-24 bg-slate-900/60 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner overflow-hidden p-2 z-10">
            {data?.business?.logo ? (
                <img src={`http://localhost:5000/storage/icons/${data.business.logo}`} alt="Logo" className="w-full h-full object-contain drop-shadow-md"/>
            ) : (
                <Building2 size={40} className="text-blue-300" />
            )}
        </div>
        <div className="z-10">
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1 block">{data?.business?.name || 'Institute'}</span>
          <h2 className="text-4xl font-black text-white drop-shadow-md tracking-wide">{data.batch.name}</h2>
          <p className="text-slate-400 mt-1 text-sm font-medium">Assigned Coordinator: {data.user.fName} {data.user.lName}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-500/20 backdrop-blur-xl p-6 rounded-3xl shadow-xl flex items-center gap-5">
            <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400"><Layers size={28}/></div>
            <div>
                <p className="text-[11px] font-bold text-blue-300 uppercase tracking-widest mb-1">Total Groups</p>
                <h3 className="text-3xl font-bold text-white">{data.groups.length}</h3>
            </div>
        </div>
        <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-500/20 backdrop-blur-xl p-6 rounded-3xl shadow-xl flex items-center gap-5">
            <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400"><BookOpen size={28}/></div>
            <div>
                <p className="text-[11px] font-bold text-purple-300 uppercase tracking-widest mb-1">Classes Today</p>
                <h3 className="text-3xl font-bold text-white">{data.todayClasses.length}</h3>
            </div>
        </div>
        <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/20 border border-orange-500/20 backdrop-blur-xl p-6 rounded-3xl shadow-xl flex items-center gap-5">
            <div className="w-14 h-14 bg-orange-500/20 rounded-2xl flex items-center justify-center text-orange-400"><AlertCircle size={28}/></div>
            <div>
                <p className="text-[11px] font-bold text-orange-300 uppercase tracking-widest mb-1">Pending Tasks</p>
                <h3 className="text-3xl font-bold text-white">{data.pendingTasksCount}</h3>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Classes List */}
          <div className="bg-slate-800/40 border border-white/10 rounded-3xl shadow-xl flex flex-col p-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 border-b border-white/10 pb-3">Classes Scheduled for Today</h3>
              <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1 max-h-[300px]">
                  {data.todayClasses.length === 0 ? <p className="text-xs text-slate-400 text-center mt-5">No classes today.</p> : 
                      data.todayClasses.map(cls => (
                          <div key={cls.id} className="p-4 bg-black/20 border border-white/5 rounded-2xl flex items-center justify-between">
                              <div>
                                  <h4 className="text-sm font-bold text-white">{cls.subject}</h4>
                                  <p className="text-xs text-slate-400">{cls.content}</p>
                              </div>
                              <div className="text-right">
                                  <span className="text-[10px] text-blue-300 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20 font-bold flex items-center gap-1">
                                      <Clock size={12}/> {cls.start_time} - {cls.end_time}
                                  </span>
                              </div>
                          </div>
                      ))
                  }
              </div>
          </div>

          {/* Batch Groups List */}
          <div className="bg-slate-800/40 border border-white/10 rounded-3xl shadow-xl flex flex-col p-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 border-b border-white/10 pb-3">Batch Groups</h3>
              <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1 max-h-[300px]">
                  {data.groups.length === 0 ? <p className="text-xs text-slate-400 text-center mt-5">No groups created for this batch.</p> : 
                      data.groups.map(grp => (
                          <div key={grp.id} className="p-4 bg-black/20 border border-white/5 rounded-2xl flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                                  {grp.name.charAt(0)}
                              </div>
                              <div>
                                  <h4 className="text-sm font-bold text-white">{grp.name}</h4>
                                  <span className="text-[9px] text-slate-500 uppercase tracking-widest">Status: Active</span>
                              </div>
                          </div>
                      ))
                  }
              </div>
          </div>
      </div>

    </div>
  );
}