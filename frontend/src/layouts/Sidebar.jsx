import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Briefcase, Users, PieChart, CalendarDays, ListTodo, MonitorPlay, CreditCard, Bot, FileCheck2, BookOpen, MessageSquare, PhoneCall } from 'lucide-react';

export default function Sidebar({ userRole }) {
  const navLinkClass = ({ isActive }) => 
    isActive 
      ? "flex items-center gap-4 p-3.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-xl font-bold transition-all shadow-lg"
      : "flex items-center gap-4 p-3.5 hover:bg-slate-400/10 rounded-xl font-medium text-gray-300 hover:text-white transition-all border border-transparent";

  const isSystemAdmin = userRole === 'System Admin' || userRole === 'Director';
  const isManager = userRole === 'Manager' || userRole === 'Ass Manager';
  const isCoordinator = userRole === 'Coordinator' || userRole === 'Staff';
  const isFinance = userRole === 'Finance';
  const isStudent = userRole === 'user' || userRole === 'student';

  return (
    <div className="w-[280px] bg-slate-400/10 border-r border-slate-400/20 flex flex-col justify-between relative z-20 backdrop-blur-md">
      <div>
        <div className="flex items-center justify-center pt-8 pb-8 w-full border-b border-slate-400/20">
          <img src="/logo.png" alt="Logo" className="w-32 h-auto object-contain drop-shadow-2xl" />
        </div>
        
        <nav className="flex flex-col gap-3 p-5 overflow-y-auto custom-scrollbar max-h-[80vh]">
          {isSystemAdmin && (
            <>
              <NavLink to="/admin/dashboard" className={navLinkClass}><LayoutDashboard size={20} /> System Overview</NavLink>
              <NavLink to="/admin/businesses" className={navLinkClass}><Briefcase size={20} /> Businesses</NavLink>
              <NavLink to="/admin/staff" className={navLinkClass}><Users size={20} /> Staff Management</NavLink>
            </>
          )}

          {isManager && (
             <>
               <NavLink to="/manager/dashboard" className={navLinkClass}><PieChart size={20} /> My Overview</NavLink>
               <NavLink to="/manager/timetable" className={navLinkClass}><CalendarDays size={20} /> Master Timetable</NavLink>
               <NavLink to="/manager/staff" className={navLinkClass}><Users size={20} /> My Team (Staff)</NavLink>
               <NavLink to="/manager/tasks" className={navLinkClass}><ListTodo size={20} /> Workflow & Tasks</NavLink>
               <NavLink to="/manager/payments" className={navLinkClass}><CreditCard size={20} /> Finance & Payments</NavLink>
               <NavLink to="/manager/content-hub" className={navLinkClass}><MonitorPlay size={20} /> Content Hub</NavLink>
               {/* 🔴 මෙන්න CRM ලින්ක් එක 🔴 */}
               <NavLink to="/manager/crm" className={navLinkClass}><MessageSquare size={20} /> WhatsApp CRM</NavLink>
               
             </>
          )}

          {(isFinance || isSystemAdmin) && (
             <>
               {isSystemAdmin && <div className="text-[10px] uppercase font-bold text-slate-500 mt-4 mb-1 pl-2">Finance Department</div>}
               <NavLink to="/admin/finance" className={navLinkClass}><Bot size={20} /> AI Finance Hub</NavLink>
               <NavLink to="/admin/finance/verify" className={navLinkClass}><FileCheck2 size={20} /> Slip Verification</NavLink>
             </>
          )}

          {isCoordinator && (
             <>
               <NavLink to="/coordinator/dashboard" className={navLinkClass}><LayoutDashboard size={20} /> My Overview</NavLink>
               <NavLink to="/coordinator/my-tasks" className={navLinkClass}><ListTodo size={20} /> My Tasks</NavLink>
               <NavLink to="/coordinator/content-hub" className={navLinkClass}><MonitorPlay size={20} /> Manage Content</NavLink>
               <NavLink to="/staff/crm" className={navLinkClass}><PhoneCall size={20} /> Call Campaign (CRM)</NavLink>
             </>
          )}

          {isStudent && (
             <>
               <NavLink to="/student/dashboard" className={navLinkClass}><LayoutDashboard size={20} /> My Dashboard</NavLink>
               <NavLink to="/student/classroom" className={navLinkClass}><BookOpen size={20} /> My Classroom</NavLink>
             </>
          )}
        </nav>
      </div>
    </div>
  );
}