import React, { useState, useEffect } from 'react';
import { LogOut } from 'lucide-react';

export default function Header({ loggedInUser, handleLogout }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const dateString = currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const displayName = loggedInUser?.fName || 'System Admin';

  return (
    <div className="flex justify-between items-center bg-slate-400/10 border border-slate-400/20 px-6 py-4 rounded-3xl backdrop-blur-md shadow-lg w-full">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          Hello, {displayName} <span className="text-3xl animate-bounce">👋</span>
        </h1>
        <p className="text-blue-300 text-sm mt-1 font-medium tracking-wide">
          {dateString} <span className="text-white mx-1">|</span> <span className="text-gray-200">{timeString}</span>
        </p>
      </div>
      
      <button 
        onClick={handleLogout} 
        className="px-6 py-2.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
      >
        <LogOut size={18} /> Logout
      </button>
    </div>
  );
}