import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header'; // Header එක Layout එක ඇතුලට ගත්තා

export default function MainLayout({ loggedInUser, handleLogout }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-800 to-red-900 flex items-center justify-center p-6 font-sans">
      
      {/* Glassmorphism Main Container */}
      <div className="w-full max-w-[100%] xl:max-w-[98%] h-[95vh] bg-slate-400/10 backdrop-blur-xl border border-slate-400/20 rounded-3xl shadow-2xl flex overflow-hidden">
        
        {/* Sidebar */}
        <Sidebar userRole={loggedInUser?.role} handleLogout={handleLogout} />
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="p-6 pb-2 border-b border-white/5">
            <Header loggedInUser={loggedInUser} handleLogout={handleLogout} />
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <Outlet />
          </div>
        </div>

      </div>
    </div>
  );
}