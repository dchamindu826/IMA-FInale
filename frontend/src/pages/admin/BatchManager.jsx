import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Building2, Plus, ArrowRight, Shield, UserCircle, Loader2 } from 'lucide-react';
import api from '../../api/axios';

export default function BusinessManager() {
  const [businesses, setBusinesses] = useState([]);
  const [managers, setManagers] = useState([]); // System එකේ ඉන්න Managers ලා
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // 1. Business ටික ගන්නවා
      const busRes = await api.get('/admin/businesses');
      setBusinesses(busRes.data || []);

      // 2. Managers ලව ගන්නවා (Dropdown එකට)
      const staffRes = await api.get('/admin/staff');
      const filteredManagers = staffRes.data.filter(s => s.role.includes('Manager') || s.role === 'System Admin');
      setManagers(filteredManagers);
      
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Manager Assign කරන Function එක
  const handleAssignManager = async (businessId, type, managerId) => {
    try {
      // Backend Endpoint එකට යවනවා 
      // payload ex: { role: 'head_manager', staffId: 10 }
      await api.put(`/admin/businesses/${businessId}/assign`, {
        type: type, // 'head' or 'assistant'
        staff_id: managerId
      });
      toast.success(`${type === 'head' ? 'Head Manager' : 'Asst. Manager'} assigned!`);
      fetchData(); // Refresh UI
    } catch (error) {
      toast.error("Failed to assign manager.");
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="w-full text-white animate-in fade-in duration-500">
      
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black tracking-wide">Businesses</h2>
          <p className="text-gray-400 mt-1 text-sm">Manage educational institutes and assign authority.</p>
        </div>
        <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center gap-2 text-sm">
          <Plus size={18} /> Create Business
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {businesses.map((bus) => (
          <div key={bus.id} className="bg-[#1e293b]/40 border border-white/5 p-6 rounded-3xl backdrop-blur-xl shadow-2xl hover:border-blue-500/20 transition-all flex flex-col group relative overflow-hidden">
            
            {/* Soft internal glow on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/0 to-purple-600/0 group-hover:from-blue-600/5 group-hover:to-purple-600/5 transition-colors z-0 pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-5">
                <div className="w-14 h-14 bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-2xl flex items-center justify-center border border-white/5 shadow-inner">
                  <Building2 size={24} className="text-blue-400" />
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {bus.status === 1 ? 'Active' : 'Disabled'}
                </span>
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-1">{bus.name}</h3>
              <p className="text-gray-400 text-xs font-medium tracking-wide">Category: {bus.category} &bull; {bus.isEnglish ? 'English Med.' : 'Sinhala Med.'}</p>
            </div>
            
            <hr className="border-white/5 my-6 relative z-10" />

            {/* MANAGER ASSIGNMENT SECTION */}
            <div className="space-y-4 relative z-10 flex-1">
              
              {/* Head Manager */}
              <div className="bg-[#030712]/40 p-3 rounded-xl border border-white/5">
                <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <Shield size={12} /> Head Manager
                </label>
                <select 
                  className="w-full bg-transparent border-none text-gray-200 text-sm outline-none appearance-none cursor-pointer"
                  value={bus.head_manager_id || ""}
                  onChange={(e) => handleAssignManager(bus.id, 'head', e.target.value)}
                >
                  <option value="" className="bg-slate-900">-- Unassigned --</option>
                  {managers.map(m => <option key={m.id} value={m.id} className="bg-slate-900">{m.fName} {m.lName} ({m.role})</option>)}
                </select>
              </div>

              {/* Assistant Manager */}
              <div className="bg-[#030712]/40 p-3 rounded-xl border border-white/5">
                <label className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                  <UserCircle size={12} /> Asst. Manager
                </label>
                <select 
                  className="w-full bg-transparent border-none text-gray-200 text-sm outline-none appearance-none cursor-pointer"
                  value={bus.ass_manager_id || ""}
                  onChange={(e) => handleAssignManager(bus.id, 'assistant', e.target.value)}
                >
                  <option value="" className="bg-slate-900">-- Unassigned --</option>
                  {managers.map(m => <option key={m.id} value={m.id} className="bg-slate-900">{m.fName} {m.lName}</option>)}
                </select>
              </div>

            </div>

            <button className="w-full mt-6 py-3.5 bg-white/5 hover:bg-blue-600 text-blue-400 hover:text-white border border-white/5 hover:border-transparent rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 text-sm relative z-10">
              Manage Batches <ArrowRight size={18} />
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}