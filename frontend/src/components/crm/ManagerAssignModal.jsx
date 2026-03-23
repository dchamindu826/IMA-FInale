import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function ManagerAssignModal({ onClose, selectedBatch }) {
  const [autoAssignOn, setAutoAssignOn] = useState(false);
  const [staff, setStaff] = useState([]);
  
  // Bulk Assign Form State
  const [agentId, setAgentId] = useState('');
  const [leadCount, setLeadCount] = useState('');
  const [assignType, setAssignType] = useState('first'); 

  // Auto Queue State
  const [autoQueue, setAutoQueue] = useState([{ id: Date.now(), staffId: '', quota: 10 }]);

  useEffect(() => {
    const fetchStaffAndConfig = async () => {
      try {
        // 1. Get Staff List
        const staffRes = await axios.get('http://localhost:5000/api/staff');
        setStaff(staffRes.data.filter(s => s.role === 'Call Center' || s.role === 'Class Cordinator'));

        // 2. Get Auto Assign Config for this batch
        const configRes = await axios.get(`http://localhost:5000/api/auto-assign/${selectedBatch}`);
        if (configRes.data) {
          setAutoAssignOn(configRes.data.is_active);
          if (configRes.data.staff_order && configRes.data.staff_order.length > 0) {
            setAutoQueue(configRes.data.staff_order);
          }
        }
      } catch (error) {
        console.error("Error fetching data", error);
      }
    };
    if (selectedBatch) fetchStaffAndConfig();
  }, [selectedBatch]);

  // --- Bulk Assign Action ---
  const handleBulkAssign = async (e) => {
    e.preventDefault();
    if(!agentId || !leadCount) return toast.error("Please fill all fields");

    const toastId = toast.loading("Assigning leads...");
    try {
      await axios.post('http://localhost:5000/api/leads/bulk-assign', {
        assignType: assignType,
        count: parseInt(leadCount),
        agentId: agentId,
        batchId: selectedBatch
      });
      toast.success("Leads assigned successfully! ✅", { id: toastId });
      // We don't close the modal so they can see success
      setLeadCount('');
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to assign leads", { id: toastId });
    }
  };

  // --- Auto Queue Actions ---
  const handleAddQueueRow = () => {
    setAutoQueue([...autoQueue, { id: Date.now(), staffId: '', quota: 5 }]);
  };

  const handleRemoveQueueRow = (id) => {
    setAutoQueue(autoQueue.filter(q => q.id !== id));
  };

  const handleQueueChange = (id, field, value) => {
    setAutoQueue(autoQueue.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleSaveAutoQueue = async (e) => {
    e.preventDefault();
    
    // Validation
    if (autoAssignOn && autoQueue.some(q => !q.staffId || !q.quota)) {
      return toast.error("Please fill all Agent names and Quotas in the queue.");
    }

    const toastId = toast.loading("Saving Auto-Queue rules...");
    try {
      await axios.post('http://localhost:5000/api/auto-assign', {
        batch_id: selectedBatch,
        is_active: autoAssignOn,
        staff_order: autoQueue
      });
      toast.success("Auto Assign Queue rules updated! 🚀", { id: toastId });
    } catch (error) {
      toast.error("Failed to save rules", { id: toastId });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-600 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/80">
          <div>
            <h2 className="text-xl font-bold text-white">Lead Assignment Rules</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white bg-slate-800 p-2 rounded-xl transition-colors">✕</button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
          
          {/* SECTION 1: AUTO ASSIGN QUEUE */}
          <section className="bg-slate-900/40 p-5 rounded-2xl border border-blue-500/20 shadow-lg">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h3 className="text-blue-400 font-bold text-lg">Auto Assign Queue (Round Robin)</h3>
                <p className="text-gray-400 text-xs mt-1">Automatically assign incoming fresh leads to staff based on a quota.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={autoAssignOn} onChange={() => setAutoAssignOn(!autoAssignOn)} />
                <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>

            {autoAssignOn && (
              <form onSubmit={handleSaveAutoQueue} className="space-y-3 mt-5 border-t border-slate-700 pt-5 animate-fade-in-up">
                <div className="grid grid-cols-12 gap-2 text-[11px] uppercase font-bold text-gray-500 mb-2 px-2 tracking-wider">
                  <div className="col-span-1 text-center">Ord</div>
                  <div className="col-span-6">Staff Member</div>
                  <div className="col-span-3 text-center">Quota</div>
                  <div className="col-span-2 text-center">Action</div>
                </div>
                
                {autoQueue.map((queueItem, index) => (
                  <div key={queueItem.id} className="grid grid-cols-12 gap-3 items-center bg-slate-800 p-2.5 rounded-xl border border-slate-600/50">
                    <div className="col-span-1 text-center text-white font-bold text-xs">{index + 1}</div>
                    
                    <div className="col-span-6">
                      <select 
                        required 
                        className="w-full p-2 bg-slate-900/80 rounded-lg text-white border border-slate-600 outline-none text-sm"
                        value={queueItem.staffId}
                        onChange={(e) => handleQueueChange(queueItem.id, 'staffId', e.target.value)}
                      >
                        <option value="">-- Select Agent --</option>
                        {staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                      </select>
                    </div>
                    
                    <div className="col-span-3">
                      <input 
                        type="number" 
                        required 
                        min="1"
                        className="w-full p-2 bg-slate-900/80 rounded-lg text-white border border-slate-600 outline-none text-sm text-center font-bold" 
                        value={queueItem.quota}
                        onChange={(e) => handleQueueChange(queueItem.id, 'quota', e.target.value)}
                      />
                    </div>
                    
                    <div className="col-span-2 text-center">
                      {autoQueue.length > 1 && (
                        <button type="button" onClick={() => handleRemoveQueueRow(queueItem.id)} className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                <div className="flex justify-between items-center pt-2">
                  <button type="button" onClick={handleAddQueueRow} className="text-blue-400 text-xs font-bold hover:text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20">+ Add Agent to Queue</button>
                  <button type="submit" className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg text-sm">Save Rules</button>
                </div>
              </form>
            )}
            {/* If Auto Assign is turned OFF but they click save */}
            {!autoAssignOn && (
               <div className="text-right pt-4">
                 <button type="button" onClick={handleSaveAutoQueue} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-xl font-bold transition-all text-sm">Save (Queue OFF)</button>
               </div>
            )}
          </section>

          {/* SECTION 2: BULK ASSIGN */}
          <section className="bg-slate-900/40 p-5 rounded-2xl border border-purple-500/20 shadow-lg">
            <h3 className="text-purple-400 font-bold text-lg mb-1">Bulk Assign 'New' Leads</h3>
            <p className="text-gray-400 text-xs mb-5">Manually assign unassigned leads from the current batch to a specific agent.</p>
            
            <form onSubmit={handleBulkAssign} className="flex gap-4 items-end bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Order</label>
                <select value={assignType} onChange={(e) => setAssignType(e.target.value)} className="w-32 p-2.5 bg-slate-900 border border-slate-600 rounded-xl text-white outline-none focus:border-purple-500 text-sm">
                  <option value="first">Oldest First</option>
                  <option value="last">Newest First</option>
                </select>
              </div>

              <div className="w-24">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Count *</label>
                <input type="number" required min="1" value={leadCount} onChange={e => setLeadCount(e.target.value)} placeholder="e.g. 50" className="w-full p-2.5 bg-slate-900 border border-slate-600 rounded-xl text-white outline-none text-center focus:border-purple-500 text-sm font-bold" />
              </div>

              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Assign To Agent *</label>
                <select required value={agentId} onChange={e => setAgentId(e.target.value)} className="w-full p-2.5 bg-slate-900 border border-slate-600 rounded-xl text-white outline-none focus:border-purple-500 text-sm">
                  <option value="">-- Select Agent --</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                </select>
              </div>
              
              <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg text-sm h-[42px]">
                Execute
              </button>
            </form>
          </section>

        </div>
      </div>
    </div>
  );
}