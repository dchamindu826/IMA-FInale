import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { UserPlus, Search, Edit2, Trash2, Loader2, X } from 'lucide-react';
import api from '../../api/axios';

export default function StaffManager() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Edit State
  const [editingStaff, setEditingStaff] = useState(null);

  const fetchStaff = async () => {
    try {
      const res = await api.get('/admin/staff');
      let actualData = res.data?.data || res.data?.staff || res.data || [];
      setStaffList(Array.isArray(actualData) ? actualData : []);
    } catch (error) {
      toast.error("Failed to load staff.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const handleDelete = async (id) => {
    if(!window.confirm("Are you sure?")) return;
    try {
      await api.delete(`/admin/staff/${id}`);
      toast.success("Staff deleted.");
      fetchStaff();
    } catch (error) { toast.error("Delete failed."); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/staff/update/${editingStaff.id}`, editingStaff);
      toast.success("Staff updated successfully!");
      setEditingStaff(null);
      fetchStaff();
    } catch (error) {
      toast.error("Failed to update.");
    }
  };

  const safeStaffList = Array.isArray(staffList) ? staffList : [];
  const filteredStaff = safeStaffList.filter(s => 
    s.fName?.toLowerCase().includes(search.toLowerCase()) || 
    s.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full text-slate-200 animate-in fade-in duration-300 relative">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white">User Management</h2>
        <p className="text-slate-400 text-sm mt-1">Manage staff credentials and access roles.</p>
      </div>

      <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-700/50 flex justify-between items-center bg-[#0F172A]">
          <div className="relative w-72">
            <Search size={18} className="absolute left-3 top-2.5 text-slate-500" />
            <input 
              type="text" placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1E293B] border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:border-blue-500 outline-none"
            />
          </div>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
            <UserPlus size={16} /> Add Staff
          </button>
        </div>

        <div className="p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0F172A] text-slate-400 border-b border-slate-700/50">
              <tr>
                <th className="p-4 font-semibold">Name</th>
                <th className="p-4 font-semibold">Contact</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 bg-[#1E293B]">
              {loading ? <tr><td colSpan="4" className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" /></td></tr> : 
               filteredStaff.map((s) => (
                <tr key={s.id} className="hover:bg-[#0F172A]/50 transition-colors">
                  <td className="p-4 font-medium text-white">{s.fName} {s.lName}</td>
                  <td className="p-4 text-slate-400">{s.phone} <br/><span className="text-xs text-slate-500">{s.nic}</span></td>
                  <td className="p-4"><span className="px-2 py-1 bg-slate-800 text-blue-400 rounded-md text-xs font-bold border border-slate-700">{s.role}</span></td>
                  <td className="p-4 text-right">
                    <button onClick={() => setEditingStaff(s)} className="p-2 text-slate-400 hover:text-blue-400 transition"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(s.id)} className="p-2 text-slate-400 hover:text-red-400 transition"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1E293B] border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Edit Staff Details</h3>
              <button onClick={() => setEditingStaff(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleUpdate} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <input type="text" value={editingStaff.fName || ''} onChange={e => setEditingStaff({...editingStaff, fName: e.target.value})} className="w-full bg-[#0F172A] border border-slate-700 rounded-lg p-2.5 text-white outline-none" placeholder="First Name" />
                <input type="text" value={editingStaff.lName || ''} onChange={e => setEditingStaff({...editingStaff, lName: e.target.value})} className="w-full bg-[#0F172A] border border-slate-700 rounded-lg p-2.5 text-white outline-none" placeholder="Last Name" />
              </div>
              <input type="text" value={editingStaff.phone || ''} onChange={e => setEditingStaff({...editingStaff, phone: e.target.value})} className="w-full bg-[#0F172A] border border-slate-700 rounded-lg p-2.5 text-white outline-none" placeholder="Phone" />
              <input type="text" value={editingStaff.nic || ''} onChange={e => setEditingStaff({...editingStaff, nic: e.target.value})} className="w-full bg-[#0F172A] border border-slate-700 rounded-lg p-2.5 text-white outline-none" placeholder="NIC" />
              <select value={editingStaff.role || ''} onChange={e => setEditingStaff({...editingStaff, role: e.target.value})} className="w-full bg-[#0F172A] border border-slate-700 rounded-lg p-2.5 text-white outline-none">
                <option value="Manager">Manager</option><option value="Ass Manager">Ass Manager</option><option value="Coordinator">Coordinator</option><option value="System Admin">System Admin</option>
              </select>
              <input type="password" onChange={e => setEditingStaff({...editingStaff, password: e.target.value})} className="w-full bg-[#0F172A] border border-slate-700 rounded-lg p-2.5 text-white outline-none" placeholder="New Password (leave blank to keep current)" />
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg mt-4">Save Changes</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}