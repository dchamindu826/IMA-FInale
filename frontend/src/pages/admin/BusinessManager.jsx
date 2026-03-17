import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Building2, Plus, Loader2 } from 'lucide-react';
import api from '../../api/axios';

export default function BusinessManager() {
  const [businesses, setBusinesses] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const busRes = await api.get('/admin/businesses');
      setBusinesses(busRes.data?.data || busRes.data || []);

      const staffRes = await api.get('/admin/staff');
      const staffList = staffRes.data?.data || staffRes.data?.staff || [];
      setManagers(staffList.filter(s => s.role?.includes('Manager') || s.role === 'System Admin'));
    } catch (error) {
      toast.error("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAssignManager = async (businessId, type, managerId) => {
    // Local state update immediately for smooth UI
    const updatedBusinesses = businesses.map(b => {
        if(b.id === businessId) {
            return type === 'head' ? {...b, head_manager_id: Number(managerId)} : {...b, ass_manager_id: Number(managerId)};
        }
        return b;
    });
    setBusinesses(updatedBusinesses);

    try {
      await api.put(`/admin/businesses/${businessId}/assign`, { type, staff_id: managerId });
      toast.success("Manager assigned successfully!");
    } catch (error) {
      toast.error("Failed to assign manager.");
      fetchData(); // Revert on fail
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-blue-500" /></div>;

  return (
    <div className="w-full text-slate-200 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white">Businesses</h2>
          <p className="text-slate-400 mt-1 text-sm">Manage educational institutes and assign authority.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2">
          <Plus size={18} /> Add Business
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {businesses.map((bus) => (
          <div key={bus.id} className="bg-[#1E293B] border border-slate-700/50 p-6 rounded-2xl shadow-xl flex flex-col">
            <div className="flex items-center gap-4 mb-6 border-b border-slate-700/50 pb-4">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700">
                <Building2 size={20} className="text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-tight">{bus.name}</h3>
                <span className="text-xs text-slate-400">{bus.category} | {bus.status === 1 ? 'Active' : 'Disabled'}</span>
              </div>
            </div>

            <div className="space-y-4 flex-1">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Head Manager</label>
                <select 
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500"
                  value={bus.head_manager_id || ""}
                  onChange={(e) => handleAssignManager(bus.id, 'head', e.target.value)}
                >
                  <option value="">-- Unassigned --</option>
                  {managers.map(m => <option key={m.id} value={m.id}>{m.fName} {m.lName} ({m.role})</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Assistant Manager</label>
                <select 
                  className="w-full bg-[#0F172A] border border-slate-700 rounded-lg p-2.5 text-sm text-white outline-none focus:border-blue-500"
                  value={bus.ass_manager_id || ""}
                  onChange={(e) => handleAssignManager(bus.id, 'assistant', e.target.value)}
                >
                  <option value="">-- Unassigned --</option>
                  {managers.map(m => <option key={m.id} value={m.id}>{m.fName} {m.lName}</option>)}
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}