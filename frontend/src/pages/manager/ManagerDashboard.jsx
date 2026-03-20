import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Users, Layers, TrendingUp, Building2, UserPlus, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';
import api from '../../api/axios';

export default function ManagerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // --- Staff Assignment States ---
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [allStaff, setAllStaff] = useState([]);
  const [assignedStaff, setAssignedStaff] = useState([]);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        // 1. Fetch Dashboard Stats
        const res = await api.get('/admin/manager/overview');
        setData(res.data);
        setError(false);

        // 2. Fetch Batches & Staff List
        const batchRes = await api.get('/admin/manager/batches');
        setBatches(batchRes.data || []);
        if (batchRes.data && batchRes.data.length > 0) {
            setSelectedBatch(batchRes.data[0].id);
        }

        const staffRes = await api.get('/tasks/manager/staff-list');
        setAllStaff(staffRes.data || []);

      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load dashboard data.");
        setError(true); 
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, []);

  // Fetch assigned staff when selected batch changes
  useEffect(() => {
      if(!selectedBatch) return;
      const fetchAssignedStaff = async () => {
          try {
              const res = await api.get(`/tasks/manager/batch-staff/${selectedBatch}`);
              setAssignedStaff(res.data || []);
          } catch(e) { console.error(e); }
      };
      fetchAssignedStaff();
  }, [selectedBatch]);

  // Handle Staff Assignment
  const handleAssignStaff = async (staffId) => {
      try {
          await api.post('/tasks/manager/batch-staff/assign', { batchId: selectedBatch, staffId });
          toast.success("Staff Assigned to Batch!");
          const res = await api.get(`/tasks/manager/batch-staff/${selectedBatch}`);
          setAssignedStaff(res.data);
      } catch(e) { toast.error("Assignment failed"); }
  };

  // Handle Staff Removal
  const handleRemoveStaff = async (staffId) => {
      if(!window.confirm("Remove this staff from the batch?")) return;
      try {
          await api.delete(`/tasks/manager/batch-staff/remove/${selectedBatch}/${staffId}`);
          setAssignedStaff(assignedStaff.filter(s => s.id !== staffId));
          toast.success("Staff Removed");
      } catch(e) { toast.error("Removal failed"); }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-blue-400" /></div>;
  }

  if (error || !data) {
      return (
          <div className="flex h-full flex-col items-center justify-center text-center p-10 animate-in fade-in zoom-in duration-500">
            <Building2 size={80} className="text-red-500 mb-6 drop-shadow-lg opacity-50" />
            <h2 className="text-3xl font-bold text-white mb-2">Backend Connection Failed</h2>
            <p className="text-slate-400">Could not connect to the Backend API. Please check your Node.js server.</p>
          </div>
        );
  }

  if (data && !data.hasBusiness) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center p-10 animate-in fade-in zoom-in duration-500">
        <Building2 size={80} className="text-slate-600 mb-6 drop-shadow-lg" />
        <h2 className="text-3xl font-bold text-white mb-2">No Business Assigned</h2>
        <p className="text-slate-400">You have not been assigned to manage any business yet. Please contact the System Admin.</p>
      </div>
    );
  }

  return (
    <div className="w-full text-slate-200 animate-in fade-in duration-500 relative h-full overflow-y-auto pb-10 custom-scrollbar pr-2">
      
      {/* Top Header with Logo */}
      <div className="bg-slate-800/40 border border-white/10 backdrop-blur-xl p-6 rounded-3xl shadow-xl flex items-center gap-6 mb-8">
        <div className="w-24 h-24 bg-slate-900/60 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner overflow-hidden p-2">
            {data?.business?.logo ? (
                <img src={`http://localhost:5000/storage/icons/${data.business.logo}`} alt="Logo" className="w-full h-full object-contain drop-shadow-md"/>
            ) : (
                <Building2 size={40} className="text-blue-300" />
            )}
        </div>
        <div>
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1 block">Assigned Institute</span>
          <h2 className="text-4xl font-black text-white drop-shadow-md tracking-wide">{data?.business?.name || 'Unknown Business'}</h2>
          <p className="text-slate-400 mt-1 text-sm font-medium">Category: {data?.business?.category || 'N/A'}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-500/20 backdrop-blur-xl p-6 rounded-3xl shadow-xl flex items-center gap-5">
            <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400"><Layers size={28}/></div>
            <div>
                <p className="text-[11px] font-bold text-blue-300 uppercase tracking-widest mb-1">Total Batches</p>
                <h3 className="text-3xl font-bold text-white">{data?.stats?.totalBatches || 0}</h3>
            </div>
        </div>
        <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-500/20 backdrop-blur-xl p-6 rounded-3xl shadow-xl flex items-center gap-5">
            <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400"><Users size={28}/></div>
            <div>
                <p className="text-[11px] font-bold text-purple-300 uppercase tracking-widest mb-1">Enrolled Students</p>
                <h3 className="text-3xl font-bold text-white">{data?.stats?.totalStudents || 0}</h3>
            </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border border-emerald-500/20 backdrop-blur-xl p-6 rounded-3xl shadow-xl flex items-center gap-5">
            <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400"><TrendingUp size={28}/></div>
            <div>
                <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-widest mb-1">Total Revenue</p>
                <h3 className="text-3xl font-bold text-white">Rs. {data?.stats?.totalRevenue?.toLocaleString() || '0'}</h3>
            </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Bar Chart */}
        <div className="bg-slate-800/40 border border-white/10 backdrop-blur-xl p-6 rounded-3xl shadow-xl flex flex-col">
          <h3 className="text-sm font-bold text-white tracking-wide mb-6">Revenue Generation by Batch</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.revenueData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false}/>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)' }} itemStyle={{ color: '#60A5FA', fontWeight: 'bold' }} />
                <Bar dataKey="revenue" fill="url(#colorRevenue)" radius={[6, 6, 0, 0]} barSize={45} />
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Area Chart */}
        <div className="bg-slate-800/40 border border-white/10 backdrop-blur-xl p-6 rounded-3xl shadow-xl flex flex-col">
          <h3 className="text-sm font-bold text-white tracking-wide mb-6">Student Enrollment Trends</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.revenueData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false}/>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)' }} itemStyle={{ color: '#A78BFA', fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="revenue" stroke="#A78BFA" strokeWidth={3} fill="url(#colorStudents)" />
                <defs>
                  <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#A78BFA" stopOpacity={0}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 🔥 NEW: Batch Staff Assignment Section 🔥 */}
      <div className="bg-slate-800/40 border border-white/10 backdrop-blur-xl rounded-3xl shadow-xl flex flex-col p-6 w-full">
          <div className="flex justify-between items-center bg-black/20 p-4 rounded-2xl border border-white/5 mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Users size={20}/> Batch Workflow Assignment</h3>
              <select className="bg-black/50 border border-blue-500/30 text-white rounded-xl px-4 py-2 outline-none min-w-[250px]" value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Assigned Staff */}
              <div>
                  <h4 className="text-sm font-bold text-emerald-300 uppercase tracking-widest mb-4">Assigned Staff (Coordinators)</h4>
                  <div className="space-y-3 bg-black/10 p-4 rounded-2xl min-h-[300px] border border-white/5">
                      {assignedStaff.length === 0 ? <p className="text-xs text-slate-400 text-center mt-10">No staff assigned to this batch yet.</p> : 
                          assignedStaff.map(staff => (
                              <div key={staff.id} className="flex justify-between items-center bg-black/40 border border-emerald-500/20 p-3 rounded-xl">
                                  <div>
                                      <p className="text-sm font-bold text-white">{staff.fName} {staff.lName}</p>
                                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Coordinator</span>
                                  </div>
                                  <button onClick={() => handleRemoveStaff(staff.id)} className="text-slate-500 hover:text-red-400 bg-white/5 hover:bg-red-500/10 p-2 rounded-lg transition-all"><Trash2 size={16}/></button>
                              </div>
                          ))
                      }
                  </div>
              </div>

              {/* Available Staff List */}
              <div>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Available Staff</h4>
                  <div className="space-y-3 bg-black/10 p-4 rounded-2xl min-h-[300px] border border-white/5 max-h-[400px] overflow-y-auto custom-scrollbar">
                      {allStaff.filter(s => !assignedStaff.find(a => a.id === s.id)).map(staff => (
                          <div key={staff.id} className="flex justify-between items-center bg-black/30 border border-white/10 p-3 rounded-xl hover:border-blue-500/30 transition-all">
                              <div>
                                  <p className="text-sm font-bold text-white">{staff.fName} {staff.lName}</p>
                                  <span className="text-[10px] text-slate-400">{staff.role}</span>
                              </div>
                              <button onClick={() => handleAssignStaff(staff.id)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all">
                                  <UserPlus size={14}/> Assign
                              </button>
                          </div>
                      ))}
                      {allStaff.filter(s => !assignedStaff.find(a => a.id === s.id)).length === 0 && <p className="text-xs text-slate-400 text-center mt-10">All available staff assigned.</p>}
                  </div>
              </div>
          </div>
      </div>

    </div>
  );
}