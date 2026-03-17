import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Users, LogOut } from 'lucide-react';

export default function Sidebar({ userRole, handleLogout }) {
  
  const navLinkClass = ({ isActive }) => 
    isActive 
      ? "flex items-center gap-4 px-5 py-3.5 bg-blue-600/90 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
      : "flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 text-gray-400 hover:text-white rounded-xl font-medium transition-all border border-transparent";

  return (
    <div className="w-[280px] bg-[#0f172a]/80 border-r border-white/5 flex flex-col justify-between relative z-20">
      
      <div>
        {/* LOGO */}
        <div className="flex items-center justify-center pt-10 pb-12 w-full border-b border-white/5">
          <img src="/logo.png" alt="Logo" className="w-32 h-auto object-contain drop-shadow-2xl" />
        </div>
        
        <nav className="flex flex-col gap-2 p-5">
          <NavLink to="/admin/dashboard" className={navLinkClass}>
            <LayoutDashboard size={20} /> Dashboard
          </NavLink>
          
          <NavLink to="/admin/businesses" className={navLinkClass}>
            <Briefcase size={20} /> Businesses
          </NavLink>

          {/* 🔥 හරියටම හදපු Staff Management Link එක 🔥 */}
          <NavLink to="/admin/staff" className={navLinkClass}>
            <Users size={20} /> Staff Management
          </NavLink>
        </nav>
      </div>

      {/* LOGOUT BUTTON */}
      <div className="p-5 border-t border-white/5">
        <button 
          onClick={handleLogout} 
          className="flex items-center gap-4 px-5 py-3.5 w-full text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl font-medium transition-all"
        >
          <LogOut size={20} /> Logout
        </button>
      </div>

    </div>
  );
}