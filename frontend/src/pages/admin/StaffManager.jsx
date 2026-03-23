import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { UserPlus, Search, Edit2, Trash2, Loader2, X, Shield, Briefcase, Users, UserCircle, DollarSign } from 'lucide-react';
import api from '../../api/axios';

export default function StaffManager() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [editingStaff, setEditingStaff] = useState(null);
  const [newStaff, setNewStaff] = useState({
    fName: '', lName: '', phone: '', nic: '', role: 'Coordinator', password: ''
  });

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

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/staff/add', newStaff); 
      toast.success("Staff registered successfully!");
      setNewStaff({ fName: '', lName: '', phone: '', nic: '', role: 'Coordinator', password: '' });
      fetchStaff();
    } catch (error) {
      toast.error("Failed to register staff.");
    }
  };

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

  // 🔴 Finance කියන අලුත් Role එක ඇතුළත් කළා
  const knownRoles = ["System Admin", "Director", "Manager", "Ass Manager", "Coordinator", "Finance"];
  
  const rolesGroups = [
    { title: "System Admins", role: "System Admin", icon: <Shield size={16} className="text-red-400" /> },
    { title: "Directors", role: "Director", icon: <Briefcase size={16} className="text-yellow-400" /> },
    { title: "Managers", role: "Manager", icon: <UserCircle size={16} className="text-blue-400" /> },
    { title: "Assistant Managers", role: "Ass Manager", icon: <UserCircle size={16} className="text-purple-400" /> },
    { title: "Finance Department", role: "Finance", icon: <DollarSign size={16} className="text-emerald-400" /> }, // 🔴 Finance Group
    { title: "Coordinators", role: "Coordinator", icon: <Users size={16} className="text-cyan-400" /> },
    { title: "Other Staff", role: "Other", icon: <Users size={16} className="text-slate-400" /> }
  ];

  return (
    <div className="w-full text-slate-200 animate-in fade-in duration-300 relative h-full flex flex-col">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white drop-shadow-md">Staff Portal</h2>
          <p className="text-slate-300 text-sm mt-1">Register and manage staff access across departments.</p>
        </div>
        <div className="relative w-64">
          <Search size={16} className="absolute left-3 top-2.5 text-slate-300" />
          <input 
            type="text" placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-400/10 border border-slate-400/20 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:border-blue-400 outline-none backdrop-blur-md placeholder-slate-400 transition-all"
          />
        </div>
      </div>

      <div className="flex gap-6 flex-1 items-start">
        
        {/* LEFT SIDE: REGISTRATION FORM */}
        <div className="w-1/3 bg-slate-800/40 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl p-6 sticky top-0">
          <div className="flex gap-2 mb-6">
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-inner"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-inner"></div>
            <div className="w-3 h-3 rounded-full bg-green-500 shadow-inner"></div>
          </div>

          <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
            <UserPlus size={18} className="text-blue-400"/> New Registration
          </h3>

          <form onSubmit={handleCreateStaff} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <input required type="text" placeholder="First Name" value={newStaff.fName} onChange={e => setNewStaff({...newStaff, fName: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-400 transition-all placeholder-slate-400" />
              <input required type="text" placeholder="Last Name" value={newStaff.lName} onChange={e => setNewStaff({...newStaff, lName: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-400 transition-all placeholder-slate-400" />
            </div>
            <input required type="text" placeholder="Contact Number" value={newStaff.phone} onChange={e => setNewStaff({...newStaff, phone: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-400 transition-all placeholder-slate-400" />
            <input required type="text" placeholder="NIC Number" value={newStaff.nic} onChange={e => setNewStaff({...newStaff, nic: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-400 transition-all placeholder-slate-400" />
            
            {/* 🔴 Dropdown එකට Finance එකතු කළා */}
            <select value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-400 transition-all cursor-pointer">
              <option value="System Admin" className="bg-slate-800">System Admin</option>
              <option value="Director" className="bg-slate-800">Director</option>
              <option value="Manager" className="bg-slate-800">Manager</option>
              <option value="Ass Manager" className="bg-slate-800">Ass Manager</option>
              <option value="Finance" className="bg-slate-800">Finance Department</option>
              <option value="Coordinator" className="bg-slate-800">Coordinator</option>
              <option value="teacher" className="bg-slate-800">Teacher</option>
            </select>
            
            <input required type="password" placeholder="Assign Password" value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-400 transition-all placeholder-slate-400" />
            
            <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 rounded-xl mt-2 shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all">
              Register Staff
            </button>
          </form>
        </div>

        {/* RIGHT SIDE: CATEGORIZED LIST */}
        <div className="w-2/3 space-y-6 overflow-y-auto custom-scrollbar pr-2 pb-10">
          {loading ? (
             <div className="flex items-center justify-center p-10"><Loader2 className="animate-spin text-blue-400" size={40}/></div>
          ) : (
            rolesGroups.map((group, idx) => {
              let groupStaff = [];
              if (group.role === "Other") {
                groupStaff = filteredStaff.filter(s => !knownRoles.includes(s.role));
              } else {
                groupStaff = filteredStaff.filter(s => s.role === group.role);
              }
              
              if(groupStaff.length === 0) return null;

              return (
                <div key={idx} className="bg-slate-400/10 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-xl">
                  <div className="bg-black/20 px-5 py-3 border-b border-white/5 flex items-center gap-3">
                    {group.icon}
                    <h4 className="font-bold text-white text-sm tracking-wide">{group.title}</h4>
                    <span className="ml-auto bg-white/10 text-xs px-2 py-0.5 rounded-md text-slate-300">{groupStaff.length}</span>
                  </div>

                  <div className="p-2">
                    {groupStaff.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-2xl transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-600 flex items-center justify-center text-white font-bold shadow-inner border border-white/10">
                            {s.fName?.charAt(0) || 'U'}{s.lName?.charAt(0) || ''}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">{s.fName} {s.lName}</p>
                            <p className="text-xs text-slate-400">{s.phone} &bull; {s.nic} <span className="text-blue-400 ml-2">[{s.role}]</span></p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingStaff(s)} className="p-2 text-blue-300 hover:text-white bg-blue-500/10 hover:bg-blue-500/30 rounded-xl transition-all">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(s.id)} className="p-2 text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/40 rounded-xl transition-all">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800/80 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl w-full max-w-md p-6 relative">
             <div className="flex gap-2 absolute top-5 left-5">
              <div className="w-3 h-3 rounded-full bg-red-500 cursor-pointer" onClick={() => setEditingStaff(null)}></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>

            <h3 className="text-xl font-bold text-white mb-6 text-center mt-2">Edit Details</h3>
            
            <form onSubmit={handleUpdate} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={editingStaff.fName || ''} onChange={e => setEditingStaff({...editingStaff, fName: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-400 transition-all" placeholder="First Name" />
                <input type="text" value={editingStaff.lName || ''} onChange={e => setEditingStaff({...editingStaff, lName: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-400 transition-all" placeholder="Last Name" />
              </div>
              <input type="text" value={editingStaff.phone || ''} onChange={e => setEditingStaff({...editingStaff, phone: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-400 transition-all" placeholder="Phone" />
              <input type="text" value={editingStaff.nic || ''} onChange={e => setEditingStaff({...editingStaff, nic: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-400 transition-all" placeholder="NIC" />
              <select value={editingStaff.role || ''} onChange={e => setEditingStaff({...editingStaff, role: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-400 transition-all cursor-pointer">
                <option value="System Admin" className="bg-slate-800">System Admin</option>
                <option value="Director" className="bg-slate-800">Director</option>
                <option value="Manager" className="bg-slate-800">Manager</option>
                <option value="Ass Manager" className="bg-slate-800">Ass Manager</option>
                <option value="Finance" className="bg-slate-800">Finance Department</option> {/* 🔴 Edit Modal එකටත් දැම්මා */}
                <option value="Coordinator" className="bg-slate-800">Coordinator</option>
              </select>
              <input type="password" onChange={e => setEditingStaff({...editingStaff, password: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-blue-400 transition-all" placeholder="New Password (leave blank to keep current)" />
              <button type="submit" className="w-full bg-blue-600/80 hover:bg-blue-500 border border-blue-400/30 text-white font-bold py-3 rounded-xl mt-4 shadow-lg backdrop-blur-md transition-all">Save Changes</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}