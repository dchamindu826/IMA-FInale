import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function ChatArea({ activeLead, loggedInUser }) {
  const [message, setMessage] = useState('');
  const [theme, setTheme] = useState('light');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const themes = {
    light: { bg: 'bg-[#efeae2]', bubbleMe: 'bg-[#d9fdd3] text-[#111b21]', bubbleThem: 'bg-white text-[#111b21]', header: 'bg-[#f0f2f5] border-gray-300', text: 'text-[#111b21]', subText: 'text-gray-500', icon: 'text-gray-500 hover:text-gray-700 hover:bg-black/5', inputBg: 'bg-white', patternUrl: 'https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png' },
    whatsapp: { bg: 'bg-[#0b141a]', bubbleMe: 'bg-[#005c4b] text-white', bubbleThem: 'bg-[#202c33] text-gray-100', header: 'bg-[#202c33] border-slate-600/50', text: 'text-white', subText: 'text-gray-400', icon: 'text-gray-400 hover:text-white hover:bg-white/10', inputBg: 'bg-[#2a3942]' },
    blue: { bg: 'bg-slate-900', bubbleMe: 'bg-blue-600 text-white', bubbleThem: 'bg-slate-700 text-gray-100', header: 'bg-slate-800 border-slate-600/50', text: 'text-white', subText: 'text-gray-400', icon: 'text-gray-400 hover:text-white hover:bg-white/10', inputBg: 'bg-slate-800' }
  };
  const currentTheme = themes[theme];

  // Backend එකෙන් Messages ගන්නවා
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`http://localhost:5000/api/messages/${activeLead.id}`);
        setMessages(data || []);
      } catch (error) {
        console.error("Error fetching messages", error);
      } finally {
        setLoading(false);
      }
    };
    if (activeLead) fetchMessages();
  }, [activeLead]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if(!message.trim()) return;
    
    try {
      // මෙය ඇත්තටම Message එක යවන්න Backend API එකට Request එකක් කරනවා
      await axios.post('http://localhost:5000/api/messages/send', {
        lead_id: activeLead.id,
        content: message,
        agent_id: loggedInUser.id
      });
      
      // UI එක Update කරනවා
      setMessages([...messages, { id: Date.now(), sender_type: 'Agent', agent: { first_name: loggedInUser.first_name }, content: message, created_at: new Date() }]);
      setMessage('');
    } catch(error) {
      toast.error("Failed to send message");
    }
  };

  if (!activeLead) {
    return (
      <div className={`border border-slate-600/30 rounded-3xl p-4 h-full flex flex-col items-center justify-center shadow-xl ${theme === 'light' ? 'bg-white text-gray-400' : 'bg-slate-800 text-gray-400'}`}>
        <p>Select a chat from the left to start messaging</p>
      </div>
    );
  }

  return (
    <div className={`border ${theme === 'light' ? 'border-gray-300' : 'border-slate-600'} rounded-3xl h-full flex flex-col shadow-2xl overflow-hidden relative ${currentTheme.bg}`}>
      
      <div className={`${currentTheme.header} p-4 border-b flex justify-between items-center z-10 transition-colors`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-500 flex items-center justify-center text-white font-bold text-lg">
            {activeLead.customer_name ? activeLead.customer_name.charAt(0) : '#'}
          </div>
          <div>
            <h3 className={`${currentTheme.text} font-bold text-md`}>{activeLead.customer_name || activeLead.phone_number}</h3>
            <p className={`${currentTheme.subText} text-xs`}>{activeLead.phone_number}</p>
          </div>
        </div>
        <div className="flex gap-2 bg-black/10 p-1 rounded-lg border border-black/5">
          <button onClick={() => setTheme('light')} className={`w-5 h-5 rounded-full bg-[#efeae2] border border-gray-400 ${theme === 'light' ? 'ring-2 ring-blue-500' : ''}`}></button>
          <button onClick={() => setTheme('whatsapp')} className={`w-5 h-5 rounded-full bg-[#005c4b] ${theme === 'whatsapp' ? 'ring-2 ring-white' : ''}`}></button>
          <button onClick={() => setTheme('blue')} className={`w-5 h-5 rounded-full bg-blue-600 ${theme === 'blue' ? 'ring-2 ring-white' : ''}`}></button>
        </div>
      </div>

      {currentTheme.patternUrl && <div className="absolute inset-0 z-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: `url(${currentTheme.patternUrl})`, backgroundSize: '400px' }}></div>}

      <div className="flex-1 p-5 overflow-y-auto custom-scrollbar flex flex-col gap-4 z-10">
        {loading && <div className="text-center text-gray-500 text-xs">Loading messages...</div>}
        {messages.map((msg) => {
          const isMe = msg.sender_type === 'Agent' || msg.sender_type === 'Bot';
          const agentName = msg.agent ? msg.agent.first_name : 'System';

          return (
            <div key={msg.id} className={`flex flex-col max-w-[75%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
              {isMe && (
                <span className="text-[10px] font-bold mb-1 flex items-center gap-1">
                  {msg.sender_type === 'Bot' ? (
                    <span className="text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">Gemini Bot Reply</span>
                  ) : (
                    <span className="text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">Sent by: {agentName}</span>
                  )}
                </span>
              )}

              <div className={`p-3 rounded-2xl shadow-sm border border-black/5 ${isMe ? `${currentTheme.bubbleMe} rounded-tr-none` : `${currentTheme.bubbleThem} rounded-tl-none`}`}>
                {msg.media_url && <img src={msg.media_url} alt="media" className="max-w-xs rounded-lg mb-2" />}
                {msg.content && <p className="text-[14.5px] leading-relaxed">{msg.content}</p>}
                <div className="text-[10px] mt-1.5 text-right opacity-70">
                  {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} {isMe && '✓✓'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSendMessage} className={`${currentTheme.header} p-3 border-t z-10 flex items-center gap-3 transition-colors`}>
        <input 
          type="text" placeholder="Type a message..." required
          className={`flex-1 p-3 rounded-xl ${currentTheme.text} text-[15px] outline-none transition-all ${currentTheme.inputBg}`}
          value={message} onChange={(e) => setMessage(e.target.value)}
        />
        <button type="submit" className="bg-[#00a884] text-white p-3 rounded-xl transition-all shadow-md flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 rotate-90" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
        </button>
      </form>
    </div>
  );
}