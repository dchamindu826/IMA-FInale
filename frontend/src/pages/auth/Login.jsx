import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { Loader2, Lock, User } from 'lucide-react';

export default function Login({ setLoggedInUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 🔥 මෙතන '/auth/login' කියලා දැම්මා (Backend එකේ Route එක මේක වෙන්න ඕනේ)
      const res = await api.post('/auth/login', { username, password }); 
      
      if (res.data.token && res.data.user) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        
        setLoggedInUser(res.data.user);
        toast.success(`Welcome back, ${res.data.user.fName}!`);
        
        // Role-based Redirect
        if(res.data.user.role === 'user' || res.data.user.role === 'student') {
            navigate('/student/dashboard');
        } else {
            navigate('/admin/dashboard');
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0A0F1C] flex items-center justify-center p-4 font-sans overflow-hidden">
      
      {/* 🔥 EXACT BACKGROUND GLOWS MATCHING YOUR SCREENSHOT 🔥 */}
      <div className="absolute top-0 left-0 w-[50rem] h-[50rem] bg-blue-600/20 rounded-full blur-[130px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[50rem] h-[50rem] bg-red-600/20 rounded-full blur-[130px] translate-x-1/3 translate-y-1/3 pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-[400px] bg-[#111827]/80 backdrop-blur-xl border border-white/5 p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.5)]">
        
        <div className="text-center mb-10">
          <img src="/logo.png" alt="Logo" className="h-55 mx-auto -mb-10 drop-shadow-lg" />
          <h2 className="text-xl font-bold text-white tracking-wide">System Login</h2>
          <p className="text-gray-400 text-xs mt-2">Enter your credentials to continue</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Phone / NIC</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User size={16} className="text-gray-500" />
              </div>
              <input 
                type="text" 
                required 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#030712]/50 border border-white/5 rounded-xl pl-11 pr-4 py-3.5 text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm"
                placeholder="Enter your username"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock size={16} className="text-gray-500" />
              </div>
              <input 
                type="password" 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#030712]/50 border border-white/5 rounded-xl pl-11 pr-4 py-3.5 text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-50 flex items-center justify-center gap-2 mt-4 text-sm"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Login'}
          </button>
        </form>
        
        <div className="mt-8 text-center text-xs text-gray-500">
            Don't have a student account? <Link to="/register" className="text-blue-400 font-bold hover:underline">Create an account</Link>
        </div>
      </div>
    </div>
  );
}