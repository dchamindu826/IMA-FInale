import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { UserPlus, Search, Edit2, Trash2, Loader2, X, Users, UserCircle } from 'lucide-react';
import api from '../../api/axios';

export default function ManagerStaff() {
  const [staffList, setStaffList] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [editingStaff, setEditingStaff] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    fName: '', lName: '', phone: '', nic: '', role: 'Coordinator', password: '', assigned_batch_id: ''
  });

  const fetchData = async () => {
    try {
      // 1. Staff ටික ගන්නවා
      const res = await api.get('/admin/staff');
      let actualData = res.data?.data || res.data?.staff || res.data || [];
      // Manager ට පේන්න ඕනේ Ass Manager සහ Coordinator විතරයි
      const filteredForManager = actualData.filter(s => s.role === 'Ass Manager' || s.role === 'Coordinator');
      setStaffList(filteredForManager);

      // 2. Manager ගේ Batches ටික ගන්නවා (Dropdown එකට)
      const batchRes = await api.get('/admin/manager/batches');
      setBatches(batchRes.data || []);
      
    } catch (error) { toast.error("Failed to load data."); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingStaff) {
        await api.put(`/admin/staff/update/${editingStaff.id}`, formData);
        toast.success("Staff updated successfully!");
      } else {
        await api.post('/admin/staff/add', formData);
        toast.success("Staff registered successfully!");
      }
      setShowModal(false);
      setFormData({ fName: '', lName: '', phone: '', nic: '', role: 'Coordinator', password: '', assigned_batch_id: '' });
      setEditingStaff(null);
      fetchData();
    } catch (error) {
      toast.error(editingStaff ? "Failed to update." : "Failed to register.");
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Are you sure you want to delete this staff member?")) return;
    try {
      await api.delete(`/admin/staff/${id}`);
      toast.success("Staff deleted.");
      fetchData();
    } catch (error) { toast.error("Delete failed."); }
  };

  const openEditModal = (staff) => {
    setEditingStaff(staff);
    setFormData({
        fName: staff.fName || '', lName: staff.lName || '', phone: staff.phone || '', 
        nic: staff.nic || '', role: staff.role || 'Coordinator', password: '', 
        assigned_batch_id: staff.assigned_batch_id || ''
    });
    setShowModal(true);
  };

  const filteredStaff = staffList.filter(s => s.fName?.toLowerCase().includes(search.toLowerCase()) || s.role?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="w-full text-slate-200 animate-in fade-in duration-300 relative h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white drop-shadow-md">My Team</h2>
          <p className="text-slate-300 text-sm mt-1">Manage Assistant Managers and Coordinators for your institute.</p>
        </div>
        <div className="flex gap-4">
            <div className="relative w-64">
                <Search size={16} className="absolute left-3 top-2.5 text-slate-300" />
                <input type="text" placeholder="Search team..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-slate-400/10 border border-slate-400/20 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:border-blue-400 outline-none backdrop-blur-md placeholder-slate-400 transition-all" />
            </div>
            <button onClick={() => { setEditingStaff(null); setFormData({ fName: '', lName: '', phone: '', nic: '', role: 'Coordinator', password: '', assigned_batch_id: '' }); setShowModal(true); }} className="bg-blue-600/80 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg backdrop-blur-md transition-all">
                <UserPlus size={16} /> Add Staff
            </button>
        </div>
      </div>

      {/* Staff List */}
      <div className="bg-slate-400/10 backdrop-blur-xl border border-slate-400/20 rounded-3xl shadow-2xl overflow-hidden flex-1">
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900/40 text-blue-200 border-b border-white/10">
              <tr>
                <th className="p-5 font-semibold">Name</th>
                <th className="p-5 font-semibold">Contact</th>
                <th className="p-5 font-semibold">Role & Assignment</th>
                <th className="p-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? <tr><td colSpan="4" className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-400" /></td></tr> : 
               filteredStaff.map((s) => (
                <tr key={s.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-5 font-medium text-white flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center font-bold text-xs">{s.fName?.charAt(0)}{s.lName?.charAt(0)}</div>
                      {s.fName} {s.lName}
                  </td>
                  <td className="p-5 text-slate-300">{s.phone} <br/><span className="text-xs text-slate-400">{s.nic}</span></td>
                  <td className="p-5">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold border shadow-sm ${s.role === 'Coordinator' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-purple-500/20 text-purple-300 border-purple-500/30'}`}>
                          {s.role === 'Coordinator' ? <Users size={12} className="inline mr-1"/> : <UserCircle size={12} className="inline mr-1"/>}
                          {s.role}
                      </span>
                      {s.role === 'Coordinator' && s.assigned_batch_id && (
                          <div className="mt-2 text-xs text-blue-300 bg-blue-500/10 px-2 py-1 rounded w-max border border-blue-500/20">
                              Batch Assigned: {batches.find(b => b.id === s.assigned_batch_id?.toString())?.name || `ID: ${s.assigned_batch_id}`}
                          </div>
                      )}
                  </td>
                  <td className="p-5 text-right">
                    <button onClick={() => openEditModal(s)} className="p-2 text-blue-300 hover:text-white transition bg-blue-500/10 hover:bg-blue-500/30 rounded-lg mr-2"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(s.id)} className="p-2 text-red-400 hover:text-white transition bg-red-500/10 hover:bg-red-500/40 rounded-lg"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800/90 backdrop-blur-2xl border border-slate-400/30 rounded-3xl shadow-2xl w-full max-w-lg p-8 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-red-400 bg-white/5 p-1.5 rounded-xl transition-all"><X size={20} /></button>
            <h3 className="text-xl font-bold text-white mb-6">{editingStaff ? 'Edit Staff Member' : 'Register New Staff'}</h3>
            
            <form onSubmit={handleSave} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-slate-300 mb-1 block">First Name</label>
                    <input required type="text" value={formData.fName} onChange={e => setFormData({...formData, fName: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-400 transition-all" />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-300 mb-1 block">Last Name</label>
                    <input required type="text" value={formData.lName} onChange={e => setFormData({...formData, lName: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-400 transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="text-xs font-bold text-slate-300 mb-1 block">Phone Number</label>
                      <input required type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-400 transition-all" />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-300 mb-1 block">NIC Number</label>
                      <input required type="text" value={formData.nic} onChange={e => setFormData({...formData, nic: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-400 transition-all" />
                  </div>
              </div>
              
              <div>
                  <label className="text-xs font-bold text-slate-300 mb-1 block">Staff Role</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-400 transition-all cursor-pointer">
                    <option value="Ass Manager" className="bg-slate-800">Assistant Manager</option>
                    <option value="Coordinator" className="bg-slate-800">Batch Coordinator</option>
                  </select>
              </div>

              {/* 🔥 Coordinator නම් විතරක් Batch Assign කරන්න පෙන්නනවා 🔥 */}
              {formData.role === 'Coordinator' && (
                  <div className="animate-in zoom-in duration-300 p-4 bg-emerald-900/20 border border-emerald-500/20 rounded-xl">
                      <label className="text-xs font-bold text-emerald-300 mb-2 block">Assign a Batch to this Coordinator</label>
                      <select value={formData.assigned_batch_id} onChange={e => setFormData({...formData, assigned_batch_id: e.target.value})} className="w-full bg-black/40 border border-emerald-500/30 rounded-xl p-3 text-white outline-none focus:border-emerald-400 transition-all cursor-pointer">
                          <option value="" className="bg-slate-800 text-slate-400">-- Do Not Assign Yet --</option>
                          {batches.map(b => (
                              <option key={b.id} value={b.id} className="bg-slate-800 text-white">{b.name}</option>
                          ))}
                      </select>
                  </div>
              )}

              <div>
                  <label className="text-xs font-bold text-slate-300 mb-1 block">{editingStaff ? 'New Password (Optional)' : 'Assign Password'}</label>
                  <input type={editingStaff ? "password" : "text"} required={!editingStaff} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-400 transition-all" placeholder={editingStaff ? "Leave blank to keep current" : "Enter password"} />
              </div>
              
              <button type="submit" className="w-full bg-blue-600/80 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl mt-4 shadow-lg backdrop-blur-md transition-all">
                  {editingStaff ? 'Save Changes' : 'Register Staff'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}