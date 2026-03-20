import React, { useState, useEffect } from 'react';
import { Search, Filter, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api/axios';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/admin/overview'); 
        setStats(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch overview data", error);
        setStats({
          grossRevenue: 0, pendingSync: 0, verifiedSales: 0, failed: 0,
          pieData: [{ name: 'Empty', value: 100 }], barData: []
        });
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const COLORS = ['#3B82F6', '#10B981', '#EF4444'];

  if (loading) {
    return <div className="w-full h-full flex items-center justify-center text-blue-400"><Loader2 size={40} className="animate-spin" /></div>;
  }

  return (
    <div className="w-full text-white animate-in fade-in duration-500">
      
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-3xl font-black tracking-wide text-white drop-shadow-md">Overview</h2>
        <div className="flex gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-3 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-slate-400/10 border border-slate-400/20 backdrop-blur-md rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-200 focus:border-blue-400 outline-none w-64 placeholder-gray-400 transition-all"
            />
          </div>
          <button className="flex items-center gap-2 bg-slate-400/10 border border-slate-400/20 px-4 py-2.5 rounded-xl text-sm text-gray-200 hover:text-white hover:bg-slate-400/20 transition-all backdrop-blur-md">
            <Filter size={16} /> All Batches
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard title="GROSS REVENUE" value={`Rs. ${stats?.grossRevenue?.toLocaleString() || '0'}`} color="text-white" />
        <StatCard title="PENDING AI SYNC" value={stats?.pendingSync || '0'} color="text-yellow-400" />
        <StatCard title="VERIFIED SALES" value={stats?.verifiedSales || '0'} color="text-emerald-400" />
        <StatCard title="FAILED / MISMATCH" value={stats?.failed || '0'} color="text-rose-400" />
      </div>

      <div className="bg-slate-400/10 border border-slate-400/20 backdrop-blur-md p-6 rounded-2xl mb-8 flex justify-between items-center shadow-lg">
        <div className="w-full">
          <div className="flex justify-between text-xs font-bold text-gray-300 tracking-wider mb-3">
            <span>REVENUE TARGET (LKR 500K)</span>
            <span className="text-white text-lg">24.8%</span>
          </div>
          <div className="w-full bg-slate-900/50 rounded-full h-2.5 border border-slate-400/20">
            <div className="bg-gradient-to-r from-blue-400 to-emerald-400 h-2.5 rounded-full" style={{ width: '24.8%' }}></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-400/10 border border-slate-400/20 backdrop-blur-md p-6 rounded-2xl shadow-lg flex flex-col">
          <h3 className="text-xs font-bold text-gray-300 tracking-wider mb-6">VERIFICATION STATUS</h3>
          {/* 🔥 Fix: Recharts වලට height එකක් දුන්නා Warning එක නැති වෙන්න 🔥 */}
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats?.pieData || []} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                  {(stats?.pieData || []).map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '10px', backdropFilter: 'blur(10px)' }} itemStyle={{ color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-slate-400/10 border border-slate-400/20 backdrop-blur-md p-6 rounded-2xl shadow-lg flex flex-col">
          <h3 className="text-xs font-bold text-gray-300 tracking-wider mb-6">REVENUE BY COURSE</h3>
          {/* 🔥 Fix: Recharts වලට height එකක් දුන්නා Warning එක නැති වෙන්න 🔥 */}
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.barData || []} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '10px', backdropFilter: 'blur(10px)' }} />
                <Bar dataKey="revenue" fill="#60A5FA" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div className="bg-slate-400/10 border border-slate-400/20 backdrop-blur-md p-6 rounded-2xl shadow-lg relative overflow-hidden group">
      <p className="text-[10px] font-bold text-gray-300 tracking-widest uppercase mb-3">{title}</p>
      <h4 className={`text-4xl font-black drop-shadow-md ${color}`}>{value}</h4>
    </div>
  );
}