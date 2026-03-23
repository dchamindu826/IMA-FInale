import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { BookOpen, ChevronRight, Building2, GraduationCap, ArrowRight, Loader2, PlayCircle, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StudentDashboard() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    // 🔴 බොරු Data නෙවෙයි, අපි Landing page එකට හදපු ඇත්තම Data ටික මෙතනට ගන්නවා (ළමයින්ට Enroll වෙන්න)
    const fetchCatalog = async () => {
      try {
        const res = await api.get('/public/landing-data');
        setBusinesses(res.data?.businesses || res.data || []);
      } catch (error) {
        console.error("Failed to fetch catalog");
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex justify-center items-center bg-[#0A0F1C]">
        <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin"></div>
            <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-blue-500/20 border-b-blue-500 animate-spin animate-reverse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full bg-[#0A0F1C] text-slate-200 font-sans pb-12 relative overflow-hidden">
      
      {/* 🔴 PREMIUM BACKGROUND GLOWS (Red & Blue Glassmorphism) 🔴 */}
      <div className="fixed top-0 left-0 w-[50rem] h-[50rem] bg-blue-600/10 rounded-full blur-[120px] -translate-x-1/3 -translate-y-1/3 pointer-events-none z-0"></div>
      <div className="fixed bottom-0 right-0 w-[50rem] h-[50rem] bg-red-600/10 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3 pointer-events-none z-0"></div>

      <div className="relative z-10 max-w-screen-2xl mx-auto px-6 lg:px-10 pt-8">
        
        {/* 🔴 WELCOME BANNER (Glassmorphic) 🔴 */}
        <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/[0.08] rounded-[2rem] p-8 md:p-12 mb-12 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 via-transparent to-blue-600/10 pointer-events-none"></div>
          
          <div className="relative z-10 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[10px] font-black tracking-widest uppercase mb-4 shadow-inner">
              Student Portal
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-blue-400">{user.fName}</span>
            </h2>
            <p className="text-slate-400 font-medium text-sm md:text-base max-w-xl">
              Explore our premium educational streams, select your desired batches, and enroll seamlessly to start learning.
            </p>
          </div>

          <Link to="/student/classroom" className="relative z-10 group bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-8 py-4 rounded-2xl font-black shadow-[0_0_30px_rgba(37,99,235,0.3)] transition-all flex items-center gap-3 border border-blue-400/20">
            <PlayCircle size={20} /> Go to My Classroom <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform"/>
          </Link>
        </div>

        {/* 🔴 STEP 1: CHOOSE BUSINESS (Stream) 🔴 */}
        <div className="mb-8 flex items-center gap-4">
           <div className="w-1.5 h-8 bg-red-500 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>
           <h3 className="text-2xl font-black text-white">Select Your Stream</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {businesses.map((business) => (
            <button 
              key={business.id}
              onClick={() => setSelectedBusiness(business)}
              className={`text-left p-6 rounded-[2rem] backdrop-blur-xl border transition-all duration-300 relative overflow-hidden group ${
                selectedBusiness?.id === business.id 
                  ? 'bg-blue-600/10 border-blue-500/50 shadow-[0_0_30px_rgba(37,99,235,0.15)]' 
                  : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05] hover:border-white/20 hover:shadow-2xl'
              }`}
            >
              {selectedBusiness?.id === business.id && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-red-500"></div>}
              
              <div className={`w-16 h-16 rounded-2xl mb-6 flex items-center justify-center border transition-colors ${
                selectedBusiness?.id === business.id ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/10 text-slate-400 group-hover:text-white'
              }`}>
                {business.logo ? (
                  <img src={`${api.defaults.baseURL.replace('/api','')}/storage/icons/${business.logo}`} alt={business.name} className="w-10 h-10 object-contain" />
                ) : (
                  <Building2 size={28} />
                )}
              </div>
              <h4 className="text-xl font-black text-white mb-2">{business.name}</h4>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{business.batches.length} Active Batches</p>
            </button>
          ))}
        </div>

        {/* 🔴 STEP 2: AVAILABLE BATCHES & COURSES (Appears when business is clicked) 🔴 */}
        {selectedBusiness && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="mb-8 flex items-center gap-4 border-t border-white/10 pt-10">
               <div className="w-1.5 h-8 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)]"></div>
               <h3 className="text-2xl font-black text-white">Available Batches for {selectedBusiness.name}</h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {selectedBusiness.batches.map((batch) => (
                <div key={batch.id} className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 shadow-2xl flex flex-col relative overflow-hidden group hover:border-white/20 transition-all">
                  
                  {/* Subtle Red Glow for cards */}
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-500/10 rounded-full blur-3xl group-hover:bg-red-500/20 transition-colors"></div>

                  <div className="relative z-10 flex items-start gap-6 mb-8 border-b border-white/5 pb-6">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shadow-inner">
                       {batch.logo ? (
                         <img src={`${api.defaults.baseURL.replace('/api','')}/storage/icons/${batch.logo}`} alt="logo" className="w-10 h-10 object-contain" />
                       ) : (
                         <GraduationCap size={30} />
                       )}
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-white mb-2">{batch.name}</h4>
                      <p className="text-sm text-slate-400 leading-relaxed">{batch.description || 'Premium learning path designed for ultimate success.'}</p>
                    </div>
                  </div>

                  <div className="relative z-10 mt-auto bg-black/40 border border-white/5 rounded-2xl p-5">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Included Courses</span>
                      <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-[10px] font-black">{batch.courseCount} Courses</span>
                    </div>

                    {/* Pay Button - Goes to Payment Gateway/Slip upload (to be implemented next) */}
                    <button className="w-full bg-white/5 hover:bg-red-600 border border-white/10 hover:border-red-500 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 mt-2 shadow-lg">
                      <Wallet size={18} /> Select Payment Plan (Full/Monthly)
                    </button>
                  </div>

                </div>
              ))}
            </div>

            {selectedBusiness.batches.length === 0 && (
               <div className="bg-white/5 border border-white/10 rounded-[2rem] p-12 text-center">
                  <p className="text-slate-400 font-medium">No active batches available right now for this stream.</p>
               </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}