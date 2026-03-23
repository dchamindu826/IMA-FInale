import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { Loader2, Eye, EyeOff } from 'lucide-react';

// 🔴 Fix: DarkInput එක Main function එකෙන් එළියට ගත්තා (Lock වෙන එක නැති කරන්න) 🔴
const DarkInput = ({ label, name, required, type = "text", placeholder, options, value, onChange }) => (
  <div>
    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">
      {label} {required && <span className="text-blue-500">*</span>}
    </label>
    {options ? (
      <select name={name} required={required} value={value} onChange={onChange} className="w-full bg-[#030712]/50 border border-white/5 rounded-xl p-3.5 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm">
        <option value="" disabled className="bg-slate-900">Select a District</option>
        {options.map(opt => <option key={opt} value={opt} className="bg-slate-900">{opt}</option>)}
      </select>
    ) : (
      <input type={type} name={name} required={required} value={value} onChange={onChange} placeholder={placeholder} className="w-full bg-[#030712]/50 border border-white/5 rounded-xl p-3.5 text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm" />
    )}
  </div>
);

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    fName: '', lName: '', phone: '', directPhone: '', nic: '',
    houseNoVal: '', streetNameVal: '', villageVal: '', townVal: '', districtVal: '', password: ''
  });

  const districts = ["Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha", "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", "Mannar", "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya", "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/register', formData); 
      toast.success("Account created successfully! Please login.");
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed. Please check details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#0A0F1C] flex items-center justify-center p-4 py-10 font-sans overflow-hidden">
      
      <div className="absolute top-0 left-0 w-[50rem] h-[50rem] bg-blue-600/20 rounded-full blur-[130px] -translate-x-1/2 -translate-y-1/2 pointer-events-none fixed"></div>
      <div className="absolute bottom-0 right-0 w-[50rem] h-[50rem] bg-red-600/20 rounded-full blur-[130px] translate-x-1/3 translate-y-1/3 pointer-events-none fixed"></div>

      <div className="relative z-10 w-full max-w-4xl bg-[#111827]/80 backdrop-blur-xl border border-white/5 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.5)] p-8 md:p-12">
        
        <div className="text-center mb-10">
          <img src="/logo.png" alt="Logo" className="h-16 mx-auto mb-4 drop-shadow-lg" />
          <h2 className="text-2xl font-bold text-white tracking-wide">Create an account</h2>
          <p className="text-gray-400 text-xs mt-2">Fill in your details to join the portal</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DarkInput label="First Name" name="fName" required placeholder="John" value={formData.fName} onChange={handleChange} />
            <DarkInput label="Second Name" name="lName" required placeholder="Doe" value={formData.lName} onChange={handleChange} />
            <DarkInput label="Phone Number" name="phone" type="tel" required placeholder="07********" value={formData.phone} onChange={handleChange} />
            <DarkInput label="Secondary Number" name="directPhone" type="tel" placeholder="07********" value={formData.directPhone} onChange={handleChange} />
            
            <div className="md:col-span-2">
              <DarkInput label="NIC" name="nic" required placeholder="991922757V / 199919202757" value={formData.nic} onChange={handleChange} />
            </div>

            <DarkInput label="House Number" name="houseNoVal" placeholder="123/A" value={formData.houseNoVal} onChange={handleChange} />
            <DarkInput label="Street Name" name="streetNameVal" required placeholder="Main Street" value={formData.streetNameVal} onChange={handleChange} />
            
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                <DarkInput label="Village" name="villageVal" required placeholder="Your Village" value={formData.villageVal} onChange={handleChange} />
                <DarkInput label="Town" name="townVal" required placeholder="Your Town" value={formData.townVal} onChange={handleChange} />
                <DarkInput label="District" name="districtVal" required options={districts} value={formData.districtVal} onChange={handleChange} />
            </div>

            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Password <span className="text-blue-500">*</span></label>
              <div className="relative">
                <input 
                    type={showPassword ? "text" : "password"} 
                    name="password" required value={formData.password} onChange={handleChange} 
                    className="w-full bg-[#030712]/50 border border-white/5 rounded-xl p-3.5 pr-12 text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm" 
                    placeholder="Enter your password" 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-4 flex items-center text-gray-500 hover:text-gray-300">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col items-center">
            <button type="submit" disabled={loading} className="w-full md:w-auto px-16 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2 text-sm">
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'Create Account'}
            </button>
            <p className="mt-6 text-xs text-gray-500">
                Already have an account? <Link to="/login" className="text-blue-400 font-bold hover:underline">Log in</Link>
            </p>
          </div>
        </form>

      </div>
    </div>
  );
}