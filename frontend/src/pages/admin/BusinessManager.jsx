import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Building2, Plus, Loader2, Edit2, Trash2, Ban, CheckCircle, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function BusinessManager() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  
  // 🔥 මැනේජර්ලා වර්ග දෙකට වෙන් කරලා තියාගන්නවා
  const [headManagers, setHeadManagers] = useState([]);
  const [assManagers, setAssManagers] = useState([]);
  
  const [loading, setLoading] = useState(true);

  // Modals States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState(null);

  // Add Form State
  const [formData, setFormData] = useState({
    name: '', description: '', businessType: '', medium: '0', 
    min_course_count: '', discount_amount: '', 
    isDiscountEnabledForInstallments: true, isDeliveryAndCoordinationEnabled: true, logo: null
  });

  const fetchData = async () => {
    try {
      const busRes = await api.get('/admin/businesses');
      const rawBusData = busRes.data;
      const actualBusinesses = Array.isArray(rawBusData) ? rawBusData : (rawBusData?.data || rawBusData?.businesses || []);
      setBusinesses(Array.isArray(actualBusinesses) ? actualBusinesses : []);

      const staffRes = await api.get('/admin/staff');
      const staffList = Array.isArray(staffRes.data?.data) ? staffRes.data.data : (Array.isArray(staffRes.data?.staff) ? staffRes.data.staff : []);
      
      // 🔥 අදාළ අයට අදාළ Dropdown එකට යන්න Filter කිරීම 🔥
      setHeadManagers(staffList.filter(s => s.role === 'Manager' || s.role === 'System Admin'));
      setAssManagers(staffList.filter(s => s.role === 'Ass Manager'));

    } catch (error) {
      toast.error("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- Inline Manager Assignment (On Card) ---
  const handleAssignManager = async (businessId, type, managerId) => {
    const updatedBusinesses = businesses.map(b => {
        if(b.id === businessId) {
            return type === 'head' ? {...b, head_manager_id: Number(managerId)} : {...b, ass_manager_id: Number(managerId)};
        }
        return b;
    });
    setBusinesses(updatedBusinesses);

    try {
      await api.put(`/admin/businesses/${businessId}/assign`, { type, staff_id: managerId });
      toast.success("Manager assigned successfully!");
    } catch (error) {
      toast.error("Failed to assign manager.");
      fetchData();
    }
  };

  // --- Change Status (Enable / Disable) ---
  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 1 ? 0 : 1;
    if(!window.confirm(`Are you sure you want to ${newStatus === 1 ? 'Enable' : 'Disable'} this business?`)) return;
    try {
      await api.put('/admin/business/status', { business_id: id, status: newStatus });
      toast.success(`Business ${newStatus === 1 ? 'Enabled' : 'Disabled'}!`);
      fetchData();
    } catch (error) { toast.error("Status update failed."); }
  };

  // --- Add New Business (With File Upload) ---
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== '') {
            data.append(key, formData[key]);
        }
    });

    try {
      await api.post('/admin/business/add', data, { headers: { 'Content-Type': 'multipart/form-data' }});
      toast.success("Business Created Successfully!");
      setShowAddModal(false);
      setFormData({ name: '', description: '', businessType: '', medium: '0', min_course_count: '', discount_amount: '', isDiscountEnabledForInstallments: true, isDeliveryAndCoordinationEnabled: true, logo: null });
      fetchData();
    } catch (error) { toast.error("Failed to create business."); }
  };

  // --- Edit Business (With File Upload) ---
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('businessId', editingBusiness.id);
    
    // Append all text fields
    Object.keys(editingBusiness).forEach(key => {
        if (key !== 'logo' && editingBusiness[key] !== null) {
            data.append(key, editingBusiness[key]);
        }
    });

    // Append new logo if selected
    if (editingBusiness.newLogoFile) {
        data.append('logo', editingBusiness.newLogoFile);
    }

    try {
      await api.put('/admin/business/update', data, { headers: { 'Content-Type': 'multipart/form-data' }});
      toast.success("Business Updated Successfully!");
      setShowEditModal(false);
      fetchData();
    } catch (error) { toast.error("Failed to update business."); }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-blue-400" /></div>;

  return (
    <div className="w-full text-slate-200 animate-in fade-in duration-300 relative h-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white drop-shadow-md">Businesses</h2>
          <p className="text-slate-300 mt-1 text-sm">Manage educational institutes, categories, and authority.</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-blue-600/80 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 border border-blue-400/30 backdrop-blur-md shadow-lg transition-all">
          <Plus size={18} /> Add Business
        </button>
      </div>

      {/* CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-10">
        {businesses.map((bus) => (
          <div key={bus.id} className="bg-slate-800/40 border border-white/10 backdrop-blur-xl p-6 rounded-3xl shadow-xl flex flex-col group relative overflow-hidden transition-all hover:border-blue-500/30">
            
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-900/60 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner overflow-hidden">
                  {bus.logo ? <img src={`http://localhost:5000/storage/icons/${bus.logo}`} alt="logo" className="w-full h-full object-cover"/> : <Building2 size={24} className="text-blue-300" />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white leading-tight">{bus.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-white/10 px-2 py-0.5 rounded-md text-blue-200 font-medium">{bus.category}</span>
                    {bus.status === 1 
                        ? <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/20">Active</span>
                        : <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-md border border-red-500/20">Disabled</span>
                    }
                  </div>
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-400 mb-6 line-clamp-2">{bus.description}</p>

            {/* MANAGER ASSIGNMENTS (Filtered Dropdowns) */}
            <div className="space-y-3 flex-1 relative z-10 mb-6">
              <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                <label className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-1 block">Head Manager</label>
                <select className="w-full bg-transparent border-none text-sm text-white outline-none cursor-pointer appearance-none" value={bus.head_manager_id || ""} onChange={(e) => handleAssignManager(bus.id, 'head', e.target.value)}>
                  <option value="" className="bg-slate-800 text-slate-400">-- Select Manager --</option>
                  {headManagers.map(m => <option key={m.id} value={m.id} className="bg-slate-800 text-white">{m.fName} {m.lName}</option>)}
                </select>
              </div>
              <div className="bg-black/20 p-2.5 rounded-xl border border-white/5">
                <label className="text-[10px] font-bold text-purple-300 uppercase tracking-widest mb-1 block">Asst. Manager</label>
                <select className="w-full bg-transparent border-none text-sm text-white outline-none cursor-pointer appearance-none" value={bus.ass_manager_id || ""} onChange={(e) => handleAssignManager(bus.id, 'assistant', e.target.value)}>
                  <option value="" className="bg-slate-800 text-slate-400">-- Select Asst. Manager --</option>
                  {assManagers.map(m => <option key={m.id} value={m.id} className="bg-slate-800 text-white">{m.fName} {m.lName}</option>)}
                </select>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-auto">
              <div className="flex gap-2">
                <button onClick={() => { setEditingBusiness(bus); setShowEditModal(true); }} className="p-2 bg-blue-500/10 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-all" title="Edit">
                    <Edit2 size={16} />
                </button>
                <button onClick={() => handleToggleStatus(bus.id, bus.status)} className={`p-2 rounded-lg transition-all ${bus.status === 1 ? 'bg-orange-500/10 hover:bg-orange-500/30 text-orange-400' : 'bg-emerald-500/10 hover:bg-emerald-500/30 text-emerald-400'}`} title={bus.status === 1 ? 'Disable' : 'Enable'}>
                    {bus.status === 1 ? <Ban size={16} /> : <CheckCircle size={16} />}
                </button>
              </div>
              <button onClick={() => navigate(`/admin/batches/${bus.id}`)} className="text-sm font-bold text-white bg-white/10 hover:bg-blue-600 px-4 py-2 rounded-xl transition-all flex items-center gap-2 shadow-sm">
                Batches <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* --- ADD BUSINESS MODAL (Glassmorphism) --- */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800/90 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl w-full max-w-3xl p-8 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white bg-white/5 p-2 rounded-xl transition-all"><X size={20} /></button>
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Plus className="text-blue-400"/> Add New Business</h3>
            
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-slate-300 mb-1 block">Business Name *</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-400 transition-all" />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-300 mb-1 block">Upload Logo *</label>
                    <input required type="file" onChange={e => setFormData({...formData, logo: e.target.files[0]})} className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-sm text-white outline-none focus:border-blue-400 transition-all" />
                </div>
                <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-300 mb-1 block">Description *</label>
                    <textarea required rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-400 transition-all"></textarea>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-300 mb-1 block">Category Type *</label>
                    <select required value={formData.businessType} onChange={e => setFormData({...formData, businessType: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-400 transition-all cursor-pointer">
                        <option value="" className="bg-slate-800">Select Type</option>
                        <option value="AL" className="bg-slate-800">Advanced Level</option>
                        <option value="ALO" className="bg-slate-800">Advanced Level Other</option>
                        <option value="OL" className="bg-slate-800">Ordinary Level</option>
                        <option value="Other" className="bg-slate-800">Other</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-300 mb-1 block">Medium *</label>
                    <select required value={formData.medium} onChange={e => setFormData({...formData, medium: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-400 transition-all cursor-pointer">
                        <option value="0" className="bg-slate-800">Sinhala Medium</option>
                        <option value="1" className="bg-slate-800">English Medium</option>
                    </select>
                </div>

                {/* Conditional Fields for OL */}
                {formData.businessType === 'OL' && (
                    <>
                    <div className="animate-in fade-in zoom-in duration-300">
                        <label className="text-xs font-bold text-emerald-300 mb-1 block">Discount Apply Min Course Count *</label>
                        <input required type="number" value={formData.min_course_count} onChange={e => setFormData({...formData, min_course_count: e.target.value})} className="w-full bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-400 transition-all" />
                    </div>
                    <div className="animate-in fade-in zoom-in duration-300">
                        <label className="text-xs font-bold text-emerald-300 mb-1 block">Discount Amount (LKR) *</label>
                        <input required type="number" step="0.01" value={formData.discount_amount} onChange={e => setFormData({...formData, discount_amount: e.target.value})} className="w-full bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-400 transition-all" />
                    </div>
                    </>
                )}
                
                <div className="md:col-span-2 bg-white/5 p-4 rounded-xl border border-white/10 space-y-3 mt-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={formData.isDiscountEnabledForInstallments} onChange={e => setFormData({...formData, isDiscountEnabledForInstallments: e.target.checked})} className="w-5 h-5 accent-blue-500 bg-black/30 border border-white/10 rounded cursor-pointer" />
                        <span className="text-sm font-medium text-slate-200">Enable Discount for Installments</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={formData.isDeliveryAndCoordinationEnabled} onChange={e => setFormData({...formData, isDeliveryAndCoordinationEnabled: e.target.checked})} className="w-5 h-5 accent-blue-500 bg-black/30 border border-white/10 rounded cursor-pointer" />
                        <span className="text-sm font-medium text-slate-200">Enable Delivery and Coordination</span>
                    </label>
                </div>
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3.5 rounded-xl mt-6 shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all">Create Business</button>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT BUSINESS MODAL (Glassmorphism) --- */}
      {showEditModal && editingBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800/90 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl w-full max-w-3xl p-8 relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={() => setShowEditModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white bg-white/5 p-2 rounded-xl transition-all"><X size={20} /></button>
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Edit2 className="text-blue-400"/> Edit Business Details</h3>
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-slate-300 mb-1 block">Business Name *</label>
                    <input required type="text" value={editingBusiness.name} onChange={e => setEditingBusiness({...editingBusiness, name: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-400 transition-all" />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-300 mb-1 block">Change Logo (Optional)</label>
                    <input type="file" onChange={e => setEditingBusiness({...editingBusiness, newLogoFile: e.target.files[0]})} className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-sm text-white outline-none focus:border-blue-400 transition-all" />
                </div>
                <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-300 mb-1 block">Description *</label>
                    <textarea required rows="3" value={editingBusiness.description} onChange={e => setEditingBusiness({...editingBusiness, description: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-400 transition-all"></textarea>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-300 mb-1 block">Category Type *</label>
                    <select required value={editingBusiness.category} onChange={e => setEditingBusiness({...editingBusiness, category: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-400 transition-all cursor-pointer">
                        <option value="AL" className="bg-slate-800">Advanced Level</option>
                        <option value="ALO" className="bg-slate-800">Advanced Level Other</option>
                        <option value="OL" className="bg-slate-800">Ordinary Level</option>
                        <option value="Other" className="bg-slate-800">Other</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-300 mb-1 block">Medium *</label>
                    <select required value={editingBusiness.isEnglish ? '1' : '0'} onChange={e => setEditingBusiness({...editingBusiness, isEnglish: e.target.value === '1'})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-400 transition-all cursor-pointer">
                        <option value="0" className="bg-slate-800">Sinhala Medium</option>
                        <option value="1" className="bg-slate-800">English Medium</option>
                    </select>
                </div>

                {/* Conditional Fields for OL */}
                {editingBusiness.category === 'OL' && (
                    <>
                    <div className="animate-in fade-in zoom-in duration-300">
                        <label className="text-xs font-bold text-emerald-300 mb-1 block">Discount Apply Min Course Count *</label>
                        <input required type="number" value={editingBusiness.minCourseCount || ''} onChange={e => setEditingBusiness({...editingBusiness, minCourseCount: e.target.value})} className="w-full bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-400 transition-all" />
                    </div>
                    <div className="animate-in fade-in zoom-in duration-300">
                        <label className="text-xs font-bold text-emerald-300 mb-1 block">Discount Amount (LKR) *</label>
                        <input required type="number" step="0.01" value={editingBusiness.discountAmount || ''} onChange={e => setEditingBusiness({...editingBusiness, discountAmount: e.target.value})} className="w-full bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-3 text-sm text-white outline-none focus:border-emerald-400 transition-all" />
                    </div>
                    </>
                )}
                
                <div className="md:col-span-2 bg-white/5 p-4 rounded-xl border border-white/10 space-y-3 mt-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={editingBusiness.isDiscountEnabledForInstallments} onChange={e => setEditingBusiness({...editingBusiness, isDiscountEnabledForInstallments: e.target.checked})} className="w-5 h-5 accent-blue-500 bg-black/30 border border-white/10 rounded cursor-pointer" />
                        <span className="text-sm font-medium text-slate-200">Enable Discount for Installments</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={editingBusiness.isDeliveriesEnabled} onChange={e => setEditingBusiness({...editingBusiness, isDeliveriesEnabled: e.target.checked})} className="w-5 h-5 accent-blue-500 bg-black/30 border border-white/10 rounded cursor-pointer" />
                        <span className="text-sm font-medium text-slate-200">Enable Delivery and Coordination</span>
                    </label>
                </div>
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3.5 rounded-xl mt-6 shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all">Save Changes</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}