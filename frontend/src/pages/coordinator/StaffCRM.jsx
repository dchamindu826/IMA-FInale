import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { MessageSquare, PhoneCall, CheckCircle, Clock } from 'lucide-react';

import LeadSidebar from '../../components/crm/LeadSidebar';
import ChatArea from '../../components/crm/ChatArea';
import RightPanel from '../../components/crm/RightPanel';

export default function StaffCRM({ loggedInUser }) {
  const [activeTab, setActiveTab] = useState('INBOX'); // 'INBOX' or 'CALL_CAMPAIGN'
  const [activePhase, setActivePhase] = useState('FREE_SEMINAR');
  const [activeLead, setActiveLead] = useState(null);
  
  const [callLeads, setCallLeads] = useState([]);
  const [callData, setCallData] = useState({}); // Stores form inputs for each lead

  useEffect(() => {
    if (activeTab === 'CALL_CAMPAIGN') {
      fetchCallLeads();
    }
  }, [activeTab, activePhase]);

  const fetchCallLeads = async () => {
    try {
      const res = await api.get(`/crm/calls/assigned?phase=${activePhase}`);
      setCallLeads(res.data || []);
      
      // Initialize form state
      const initialData = {};
      res.data.forEach(lead => {
        initialData[lead.id] = { method: 'Normal', attempts: '1', remark: 'Answer', note: '' };
      });
      setCallData(initialData);
    } catch (error) {
      toast.error("Failed to load calls");
    }
  };

  const handleCallChange = (leadId, field, value) => {
    setCallData(prev => ({
      ...prev,
      [leadId]: { ...prev[leadId], [field]: value }
    }));
  };

  const submitCallLog = async (lead) => {
    const data = callData[lead.id];
    if (!data.method || !data.attempts || !data.remark) return toast.error("Fill required fields");

    const toastId = toast.loading("Saving call log...");
    try {
      const res = await api.post('/crm/calls/log', {
        lead_id: lead.id,
        current_phase: lead.current_call_phase || 1,
        ...data
      });

      toast.success("Call Logged!", { id: toastId });

      // Update Phase visually based on backend response
      if (res.data.isCompleted) {
        setCallLeads(callLeads.filter(l => l.id !== lead.id)); // Remove from list if done
      } else {
        setCallLeads(callLeads.map(l => 
          l.id === lead.id ? { ...l, current_call_phase: res.data.nextPhase } : l
        ));
      }
    } catch (error) {
      toast.error("Failed to save", { id: toastId });
    }
  };

  return (
    <div className="w-full text-slate-200 animate-in fade-in duration-500 h-[calc(100vh-80px)] flex flex-col font-sans pb-4 max-w-screen-2xl mx-auto px-4 lg:px-8">
      
      {/* HEADER & TABS */}
      <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-3">
            <MessageSquare className="text-blue-500" size={32}/> Staff Workspace
          </h2>
          <div className="flex gap-3 mt-4 bg-slate-900/50 p-1.5 rounded-xl border border-white/5 w-fit">
            <button onClick={() => setActivePhase('FREE_SEMINAR')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activePhase === 'FREE_SEMINAR' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              FREE SEMINAR
            </button>
            <button onClick={() => setActivePhase('AFTER_SEMINAR')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activePhase === 'AFTER_SEMINAR' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
              AFTER SEMINAR
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => setActiveTab('INBOX')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'INBOX' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'}`}>
            <MessageSquare size={18}/> Live Chat Inbox
          </button>
          <button onClick={() => setActiveTab('CALL_CAMPAIGN')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${activeTab === 'CALL_CAMPAIGN' ? 'bg-green-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-white/10'}`}>
            <PhoneCall size={18}/> Call Campaign
          </button>
        </div>
      </div>

      {/* 🔴 TAB 1: LIVE CHAT INBOX (3-Columns) 🔴 */}
      {activeTab === 'INBOX' && (
        <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
          <div className="col-span-3 h-full overflow-hidden">
            <LeadSidebar selectedBatch="1" activeSection={activePhase} onSelectLead={setActiveLead} activeLeadId={activeLead?.id} loggedInUser={loggedInUser}/>
          </div>
          <div className="col-span-6 h-full overflow-hidden">
            <ChatArea activeLead={activeLead} loggedInUser={loggedInUser} />
          </div>
          <div className="col-span-3 h-full overflow-hidden">
            <RightPanel activeLead={activeLead} loggedInUser={loggedInUser} />
          </div>
        </div>
      )}

      {/* 🔴 TAB 2: CALL CAMPAIGN 🔴 */}
      {activeTab === 'CALL_CAMPAIGN' && (
        <div className="flex-1 bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 shadow-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><PhoneCall className="text-green-400"/> Assigned Calls ({activePhase.replace('_', ' ')})</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/40 text-slate-400 text-xs uppercase font-bold sticky top-0 z-10">
                <tr>
                  <th className="p-4 rounded-tl-xl">Student Name & No</th>
                  <th className="p-4 text-center">Phase</th>
                  <th className="p-4">Method</th>
                  <th className="p-4">Attempts</th>
                  <th className="p-4">Remark</th>
                  <th className="p-4 w-[25%]">Note</th>
                  <th className="p-4 rounded-tr-xl text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {callLeads.length === 0 && (
                  <tr><td colSpan="7" className="text-center py-10 text-slate-500">No pending calls assigned.</td></tr>
                )}
                {callLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-white">{lead.customer_name || 'Unknown'}</div>
                      <div className="text-xs text-slate-400">{lead.phone_number}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-black">
                        Phase {lead.current_call_phase || 1}
                      </span>
                    </td>
                    <td className="p-4">
                      <select value={callData[lead.id]?.method || 'Normal'} onChange={(e) => handleCallChange(lead.id, 'method', e.target.value)} className="bg-black/50 border border-white/10 rounded-lg p-2 text-white outline-none text-xs w-full">
                        <option>Normal</option>
                        <option>WhatsApp</option>
                        <option>3CX</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <select value={callData[lead.id]?.attempts || '1'} onChange={(e) => handleCallChange(lead.id, 'attempts', e.target.value)} className="bg-black/50 border border-white/10 rounded-lg p-2 text-white outline-none text-xs w-full">
                        <option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5+</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <select value={callData[lead.id]?.remark || 'Answer'} onChange={(e) => handleCallChange(lead.id, 'remark', e.target.value)} className="bg-black/50 border border-white/10 rounded-lg p-2 text-white outline-none text-xs w-full">
                        <option>Answer</option>
                        <option>No Answer</option>
                        <option>Pending</option>
                        <option>Reject</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <input type="text" placeholder="Type a note..." value={callData[lead.id]?.note || ''} onChange={(e) => handleCallChange(lead.id, 'note', e.target.value)} className="bg-black/50 border border-white/10 rounded-lg p-2 text-white outline-none text-xs w-full" />
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => submitCallLog(lead)} className="bg-green-600 hover:bg-green-500 text-white font-bold px-4 py-2 rounded-lg transition-colors text-xs flex items-center gap-1 mx-auto shadow-lg">
                        <CheckCircle size={14}/> Save
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}