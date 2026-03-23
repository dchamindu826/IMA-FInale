import React, { useState, useEffect } from 'react';
import axios from 'axios';

// 🔴 loggedInUser props එකට ආවා
export default function LeadSidebar({ selectedBatch, activeSection, onSelectLead, activeLeadId, loggedInUser }) {
  const [activeTab, setActiveTab] = useState('New'); // New, Assigned, Imported
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Backend එකෙන් Leads ගන්නවා
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true);
        // 🔴 Backend එකට user_id සහ role එක යවනවා
        const { data } = await axios.get(`http://localhost:5000/api/leads?batch_id=${selectedBatch}&section_type=${activeSection}&user_id=${loggedInUser.id}&role=${loggedInUser.role}`);
        setLeads(data || []);
      } catch (error) {
        console.error("Error fetching leads", error);
      } finally {
        setLoading(false);
      }
    };
    if (selectedBatch && loggedInUser) fetchLeads();
  }, [selectedBatch, activeSection, loggedInUser]);

  const filteredLeads = leads.filter(lead => {
      const matchesTab = lead.status === activeTab;
      const matchesSearch = (lead.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) || lead.phone_number?.includes(searchQuery));
      return matchesTab && matchesSearch;
  });
  
  const newLeadsCount = leads.filter(l => l.status === 'New').length;

  return (
    <div className="bg-slate-400/10 border border-slate-400/20 rounded-3xl p-4 backdrop-blur-xl h-full flex flex-col shadow-xl">
      <input 
        type="text" 
        placeholder="Search leads by name or number..." 
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full p-2.5 mb-4 bg-slate-900/50 rounded-xl text-white text-sm outline-none border border-slate-500/30 focus:border-blue-500 transition-colors" 
      />
      
      <div className="flex bg-slate-900/40 rounded-xl p-1 mb-4 border border-slate-500/20">
        {['New', 'Assigned', 'Imported'].map(tab => (
          <button 
            key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
          >
            {tab === 'Imported' ? 'Import' : tab} 
            {tab === 'New' && newLeadsCount > 0 && <span className="bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[9px] shadow-sm">{newLeadsCount}</span>}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
        {loading ? (
           <p className="text-gray-500 text-center text-sm mt-10 animate-pulse">Loading leads...</p>
        ) : filteredLeads.length === 0 ? (
          <p className="text-gray-500 text-center text-sm mt-10">No leads in this category.</p>
        ) : (
          filteredLeads.map(lead => (
            <div 
              key={lead.id} 
              onClick={() => onSelectLead(lead)}
              className={`p-3 rounded-2xl cursor-pointer transition-colors relative group border ${activeLeadId === lead.id ? 'bg-slate-800 border-blue-500' : 'bg-slate-900/40 hover:bg-slate-800 border-slate-500/10'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <h4 className="text-white font-bold text-sm truncate pr-4">{lead.customer_name || lead.phone_number}</h4>
                <span className="text-gray-500 text-[10px] whitespace-nowrap">
                  {lead.last_message_time ? new Date(lead.last_message_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                </span>
              </div>
              <p className="text-gray-400 text-xs truncate">Click to view messages</p>
              
              {lead.unread_count > 0 && (
                <div className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center shadow-lg">
                  {lead.unread_count}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}