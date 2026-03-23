import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LogIn, UserPlus, LayoutDashboard } from 'lucide-react';

export default function Navbar({ loggedInUser }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed w-full top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-sm shadow-lg shadow-black/5 border-b border-gray-100' : 'bg-white'}`}>
      <div className="max-w-screen-2xl mx-auto px-8 py-5 flex justify-between items-center">
        
        {/* Larger Logo, No text title */}
        <Link to="/" className="flex items-center">
          <img src="/logo.png" alt="IMA Campus" className="h-16 w-auto object-contain" />
        </Link>

        {/* Updated Button Styles - Larger & Red Accent */}
        <div className="flex items-center gap-6">
          {loggedInUser ? (
            <Link to={loggedInUser.role === 'user' ? '/student/dashboard' : '/admin/dashboard'} 
              className="bg-red-600 hover:bg-red-700 text-white px-7 py-3.5 rounded-2xl text-base font-extrabold flex items-center gap-2.5 transition-all shadow-lg shadow-red-600/20 transform hover:scale-105">
              <LayoutDashboard size={18} /> My Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="text-slate-800 hover:text-red-600 font-extrabold text-base flex items-center gap-2 transition-colors">
                <LogIn size={18} /> Login
              </Link>
              <Link to="/register" className="bg-red-600 hover:bg-red-700 text-white px-7 py-3.5 rounded-2xl text-base font-extrabold flex items-center gap-2.5 transition-all shadow-lg shadow-red-600/30 transform hover:scale-105">
                <UserPlus size={18} /> Register
              </Link>
            </>
          )}
        </div>

      </div>
    </nav>
  );
}