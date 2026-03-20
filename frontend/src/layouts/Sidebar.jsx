import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Users, PieChart, CalendarDays, ListTodo, MonitorPlay, CreditCard } from 'lucide-react';

export default function Sidebar({ userRole }) {
  
  const navLinkClass = ({ isActive }) => 
    isActive 
      ? "flex items-center gap-4 p-3.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-xl font-bold transition-all shadow-lg"
      : "flex items-center gap-4 p-3.5 hover:bg-slate-400/10 rounded-xl font-medium text-gray-300 hover:text-white transition-all border border-transparent";

  // 🔥 Check roles 🔥
  const isSystemAdmin = userRole === 'System Admin' || userRole === 'Director';
  const isManager = userRole === 'Manager' || userRole === 'Ass Manager';
  const isCoordinator = userRole === 'Coordinator' || userRole === 'Staff';

  return (
    <div className="w-[280px] bg-slate-400/10 border-r border-slate-400/20 flex flex-col justify-between relative z-20 backdrop-blur-md">
      
      <div>
        {/* LOGO */}
        <div className="flex items-center justify-center pt-8 pb-8 w-full border-b border-slate-400/20">
          <img src="/logo.png" alt="Logo" className="w-32 h-auto object-contain drop-shadow-2xl" />
        </div>
        
        <nav className="flex flex-col gap-3 p-5">
          
          {/* --- System Admin / Director Links --- */}
          {isSystemAdmin && (
            <>
              <NavLink to="/admin/dashboard" className={navLinkClass}>
                <LayoutDashboard size={20} /> System Overview
              </NavLink>
              <NavLink to="/admin/businesses" className={navLinkClass}>
                <Briefcase size={20} /> Businesses
              </NavLink>
              <NavLink to="/admin/staff" className={navLinkClass}>
                <Users size={20} /> Staff Management
              </NavLink>
            </>
          )}

          {/* --- Manager / Ass Manager Links --- */}
          {isManager && (
             <>
               <NavLink to="/manager/dashboard" className={navLinkClass}>
                 <PieChart size={20} /> My Overview
               </NavLink>

               <NavLink to="/manager/timetable" className={navLinkClass}>
                 <CalendarDays size={20} /> Master Timetable
               </NavLink>

               <NavLink to="/manager/staff" className={navLinkClass}>
                 <Users size={20} /> My Team (Staff)
               </NavLink>

               <NavLink to="/manager/tasks" className={navLinkClass}>
                 <ListTodo size={20} /> Workflow & Tasks 
               </NavLink>

               {/* 🔥 New Payments Link 🔥 */}
               <NavLink to="/manager/payments" className={navLinkClass}>
                 <CreditCard size={20} /> Finance & Payments
               </NavLink>

               <NavLink to="/manager/content-hub" className={navLinkClass}>
                 <MonitorPlay size={20} /> Content Hub (Manual)
               </NavLink>
             </>
          )}

          {/* --- Coordinator Links --- */}
          {isCoordinator && (
             <>
               <NavLink to="/coordinator/dashboard" className={navLinkClass}>
                 <LayoutDashboard size={20} /> My Overview
               </NavLink>

               <NavLink to="/coordinator/my-tasks" className={navLinkClass}>
                 <ListTodo size={20} /> My Tasks
               </NavLink>

               <NavLink to="/coordinator/content-hub" className={navLinkClass}>
                 <MonitorPlay size={20} /> Manage Content
               </NavLink>
             </>
          )}

        </nav>
      </div>

    </div>
  );
}