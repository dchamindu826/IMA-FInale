import React, { useState } from 'react';
import { MessageSquare, Bot, Users, Settings } from 'lucide-react';

// අර අපි Components ෆෝල්ඩරේට දාපු කෑලි ටික Import කරගන්නවා
import LeadSidebar from '../../components/crm/LeadSidebar';
import ChatArea from '../../components/crm/ChatArea';
import RightPanel from '../../components/crm/RightPanel';
import ManagerAssignModal from '../../components/crm/ManagerAssignModal';

export default function ManagerCRM({ loggedInUser }) {
  const [activeTab, setActiveTab] = useState('LEADS'); // 'LEADS' or 'BOT_SETTINGS'
  const [selectedBatch, setSelectedBatch] = useState('1'); // Default Batch ID
  const [activeLead, setActiveLead] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  return (
    <div className="w-full text-slate-200 animate-in fade-in duration-500 h-[calc(100vh-80px)] flex flex-col font-sans pb-4 max-w-screen-2xl mx-auto px-4 lg:px-8">
      
      {/* HEADER & TABS */}
      <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-3">
            <MessageSquare className="text-blue-500" size={32}/> WhatsApp CRM Hub
          </h2>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setActiveTab('LEADS')} className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'LEADS' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
              <Users size={16} className="inline mr-2" /> Live Inbox
            </button>
            <button onClick={() => setActiveTab('BOT_SETTINGS')} className={`px-5 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'BOT_SETTINGS' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}>
              <Bot size={16} className="inline mr-2" /> AI Bot Settings
            </button>
          </div>
        </div>

        {/* Manager Tools (Batch Select & Assign Button) */}
        {activeTab === 'LEADS' && (
          <div className="flex items-center gap-4">
            <select 
              value={selectedBatch} 
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-white px-4 py-2.5 rounded-xl outline-none focus:border-blue-500 text-sm font-bold"
            >
              <option value="1">2026 A/L Batch (Free Seminar)</option>
              <option value="2">2027 A/L Batch</option>
            </select>
            <button 
              onClick={() => setIsAssignModalOpen(true)}
              className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl font-bold transition-all border border-white/10 flex items-center gap-2 text-sm"
            >
              <Settings size={16} /> Assign Rules
            </button>
          </div>
        )}
      </div>

      {/* 🔴 THE 3-COLUMN CRM INBOX 🔴 */}
      {activeTab === 'LEADS' && (
        <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
          
          {/* Column 1: Leads List */}
          <div className="col-span-3 h-full overflow-hidden">
            <LeadSidebar 
              selectedBatch={selectedBatch} 
              activeSection="FREE_SEMINAR" 
              onSelectLead={setActiveLead} 
              activeLeadId={activeLead?.id}
              loggedInUser={loggedInUser}
            />
          </div>

          {/* Column 2: Chat Area */}
          <div className="col-span-6 h-full overflow-hidden">
            <ChatArea 
              activeLead={activeLead} 
              loggedInUser={loggedInUser} 
            />
          </div>

          {/* Column 3: LMS Integration (Right Panel) */}
          <div className="col-span-3 h-full overflow-hidden">
            <RightPanel 
              activeLead={activeLead} 
              loggedInUser={loggedInUser} 
            />
          </div>

        </div>
      )}

      {/* 🔴 BOT SETTINGS TAB 🔴 */}
      {activeTab === 'BOT_SETTINGS' && (
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 shadow-xl flex flex-col items-center justify-center py-20 text-center">
           <Bot size={60} className="text-purple-500 mb-6" />
           <h3 className="text-2xl font-black text-white mb-2">Bot Settings Area</h3>
           <p className="text-slate-400 max-w-lg mb-8">Here you can configure Gemini API Keys, Meta Access Tokens, and sequence auto-replies.</p>
        </div>
      )}

      {/* MODALS */}
      {isAssignModalOpen && (
        <ManagerAssignModal 
          onClose={() => setIsAssignModalOpen(false)} 
          selectedBatch={selectedBatch} 
        />
      )}
    </div>
  );
}