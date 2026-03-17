import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function MainLayout({ loggedInUser, handleLogout }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 bg-[#0B1120]">
      
      {/* Very Subtle Deep Blue Glow (No messy colors) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[500px] bg-blue-900/20 blur-[150px] pointer-events-none z-0"></div>
      
      {/* Clean Dark Container */}
      <div className="relative z-10 w-full max-w-[100%] xl:max-w-[98%] h-[95vh] bg-[#0F172A] border border-slate-800/80 rounded-2xl shadow-2xl flex overflow-hidden">
        
        <Sidebar userRole={loggedInUser?.role} handleLogout={handleLogout} />
        
        <div className="flex-1 flex flex-col overflow-hidden relative bg-[#0B1120]">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
            <Outlet />
          </div>
        </div>

      </div>
    </div>
  );
}