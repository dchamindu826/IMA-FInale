import React, { useState, useEffect } from 'react';
import { Search, Filter, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../api/axios';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  // 🔥 Backend Data Fetching 🔥
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // ඔයාගේ Backend එකේ Dashboard API එකට මේක හදාගන්න.
        // උදාහරණයක් විදිහට: /api/admin/overview
        const response = await api.get('/admin/overview'); 
        setStats(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch overview data", error);
        // Error ආවොත් Crash වෙන්නේ නැති වෙන්න Fallback State එකක්
        setStats({
          grossRevenue: 0, pendingSync: 0, verifiedSales: 0, failed: 0,
          pieData: [{ name: 'Empty', value: 100 }], barData: []
        });
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Pie Chart Colors
  const COLORS = ['#F59E0B', '#10B981', '#EF4444'];

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center text-blue-500">
        <Loader2 size={40} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full text-white animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-3xl font-black tracking-wide text-white">Overview</h2>
        
        <div className="flex gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-3 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="bg-[#1e293b]/60 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-gray-300 focus:border-blue-500 outline-none w-64"
            />
          </div>
          <button className="flex items-center gap-2 bg-[#1e293b]/60 border border-white/5 px-4 py-2.5 rounded-xl text-sm text-gray-300 hover:text-white transition-all">
            <Filter size={16} /> All Batches
          </button>
        </div>
      </div>

      {/* 4 STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard title="GROSS REVENUE" value={`Rs. ${stats?.grossRevenue?.toLocaleString() || '0'}`} color="text-white" />
        <StatCard title="PENDING AI SYNC" value={stats?.pendingSync || '0'} color="text-yellow-500" />
        <StatCard title="VERIFIED SALES" value={stats?.verifiedSales || '0'} color="text-emerald-400" />
        <StatCard title="FAILED / MISMATCH" value={stats?.failed || '0'} color="text-rose-500" />
      </div>

      {/* REVENUE TARGET PROGRESS */}
      <div className="bg-[#1e293b]/60 border border-white/5 p-6 rounded-2xl mb-8 flex justify-between items-center shadow-lg">
        <div className="w-full">
          <div className="flex justify-between text-xs font-bold text-gray-400 tracking-wider mb-3">
            <span>REVENUE TARGET (LKR 500K)</span>
            <span className="text-white text-lg">24.8%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2.5">
            <div className="bg-gradient-to-r from-blue-500 to-emerald-400 h-2.5 rounded-full" style={{ width: '24.8%' }}></div>
          </div>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Verification Status (Pie Chart) */}
        <div className="bg-[#1e293b]/60 border border-white/5 p-6 rounded-2xl shadow-lg flex flex-col">
          <h3 className="text-xs font-bold text-gray-400 tracking-wider mb-6">VERIFICATION STATUS</h3>
          <div className="flex-1 min-h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats?.pieData || []} innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" stroke="none">
                  {(stats?.pieData || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '10px' }} itemStyle={{ color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Course (Bar Chart) */}
        <div className="lg:col-span-2 bg-[#1e293b]/60 border border-white/5 p-6 rounded-2xl shadow-lg flex flex-col">
          <h3 className="text-xs font-bold text-gray-400 tracking-wider mb-6">REVENUE BY COURSE</h3>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.barData || []} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '10px' }} />
                <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}

// Reusable Very Dark Glass Card
function StatCard({ title, value, color }) {
  return (
    <div className="bg-[#1e293b]/60 border border-white/5 p-6 rounded-2xl shadow-lg relative overflow-hidden group">
      <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-3">{title}</p>
      <h4 className={`text-4xl font-black ${color}`}>{value}</h4>
    </div>
  );
}