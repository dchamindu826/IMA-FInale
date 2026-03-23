import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle2, XCircle, AlertTriangle, Eye, Loader2, Bot } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function SlipVerification() {
  const [pendingSlips, setPendingSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlip, setSelectedSlip] = useState(null);
  
  // Action State
  const [verifiedAmount, setVerifiedAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchPendingReviews = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/finance/pending-reviews');
      setPendingSlips(res.data || []);
      if(res.data.length > 0 && !selectedSlip) {
        setSelectedSlip(res.data[0]);
        setVerifiedAmount(res.data[0].amount);
      }
    } catch (error) {
      toast.error("Failed to fetch pending slips");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingReviews();
  }, []);

  const handleSelectSlip = (slip) => {
    setSelectedSlip(slip);
    // Default to what AI found, or expected amount
    setVerifiedAmount(slip.ai_analysis?.extracted_amount || slip.subjectAmount || slip.amount);
  };

  const handleApprove = async () => {
    setProcessing(true);
    try {
      // Logic: If verified amount is exactly what is expected, call normal approve.
      // If it's different, call approve-discount (partial payment).
      const expectedAmount = parseFloat(selectedSlip.subjectAmount || selectedSlip.amount);
      const actualAmount = parseFloat(verifiedAmount);

      if (expectedAmount === actualAmount) {
        await api.post('/payments/admin/approve', { 
          paymentId: selectedSlip.id, 
          approveType: 'approve', 
          bank: 'Checked via AI UI', 
          payments: [] 
        });
      } else {
        await api.post('/payments/admin/approve-discount', { 
          paymentId: selectedSlip.id, 
          approveType: 'discount', 
          bank: 'Checked via AI UI', 
          payments: [],
          [`dis-${selectedSlip.id}`]: actualAmount
        });
      }

      toast.success("Slip manually verified & approved!");
      setSelectedSlip(null);
      fetchPendingReviews();
    } catch (error) {
      toast.error("Approval failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if(!window.confirm("Reject this slip permanently?")) return;
    setProcessing(true);
    try {
      await api.post('/payments/admin/decline', { paymentId: selectedSlip.id });
      toast.success("Slip Rejected.");
      setSelectedSlip(null);
      fetchPendingReviews();
    } catch (error) {
      toast.error("Rejection failed");
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(val);

  return (
    <div className="w-full text-slate-200 animate-in fade-in duration-500 h-full flex flex-col font-sans pb-6 max-w-screen-2xl mx-auto px-4">
      <div className="mb-6">
        <h2 className="text-3xl font-black text-white flex items-center gap-3">
          <FileText className="text-yellow-400" size={32}/> Manual Slip Verification
        </h2>
        <p className="text-sm text-slate-400 mt-1">Review slips flagged as MISMATCHED or UNREADABLE by the AI.</p>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center"><Loader2 className="animate-spin text-blue-500" size={40}/></div>
      ) : pendingSlips.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center items-center bg-slate-800/30 rounded-3xl border border-white/5">
          <CheckCircle2 size={60} className="text-emerald-500/50 mb-4"/>
          <h3 className="text-xl font-bold text-slate-300">All Caught Up!</h3>
          <p className="text-slate-500">No pending slips require manual verification right now.</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 flex-1 h-[70vh]">
          
          {/* LEFT: SLIP LIST */}
          <div className="w-full lg:w-1/3 bg-slate-800/40 border border-white/10 rounded-[2rem] flex flex-col overflow-hidden shadow-xl">
            <div className="p-4 bg-black/40 border-b border-white/5">
              <h3 className="font-bold text-white">Pending Queue ({pendingSlips.length})</h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
              {pendingSlips.map(slip => (
                <button 
                  key={slip.id} 
                  onClick={() => handleSelectSlip(slip)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${selectedSlip?.id === slip.id ? 'bg-blue-600/20 border-blue-500 shadow-lg' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-sm text-white">#{slip.id} - {slip.user?.fName}</span>
                    {slip.ai_analysis?.ai_status === 'MISMATCHED' ? (
                      <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">MISMATCH</span>
                    ) : (
                      <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded">UNREADABLE</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{slip.course?.name}</p>
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT: VERIFICATION WORKSPACE */}
          {selectedSlip && (
            <div className="flex-1 bg-slate-900 border border-white/10 rounded-[2rem] flex flex-col shadow-2xl overflow-hidden relative">
              {processing && <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm"><Loader2 size={40} className="animate-spin text-white"/></div>}
              
              <div className="p-5 border-b border-white/10 bg-black/40 flex justify-between items-center">
                <h3 className="font-black text-lg text-white">Verify Payment #{selectedSlip.id}</h3>
                <span className="text-sm text-slate-400">{selectedSlip.user?.phone}</span>
              </div>

              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                
                {/* IMAGE VIEWER */}
                <div className="w-full md:w-1/2 p-4 border-b md:border-b-0 md:border-r border-white/5 bg-black/20 flex flex-col">
                  <div className="flex-1 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center relative group">
                    {selectedSlip.slipFileName ? (
                      <img 
                        src={`${api.defaults.baseURL.replace('/api','')}/storage/slipImages/${selectedSlip.slipFileName}`} 
                        alt="Slip" 
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <p className="text-slate-500 text-sm">No Image Found</p>
                    )}
                  </div>
                </div>

                {/* DETAILS & ACTIONS */}
                <div className="w-full md:w-1/2 p-6 overflow-y-auto custom-scrollbar flex flex-col">
                  
                  {/* Expected Data */}
                  <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4 mb-4">
                    <h4 className="text-[10px] uppercase font-bold text-blue-400 mb-2">Expected System Data</h4>
                    <p className="text-sm text-slate-300 mb-1">Course: <span className="text-white font-medium">{selectedSlip.course?.name}</span></p>
                    <p className="text-sm text-slate-300">Expected Amount: <span className="text-lg font-black text-blue-400">{formatCurrency(selectedSlip.subjectAmount || selectedSlip.amount)}</span></p>
                  </div>

                  {/* AI Extracted Data */}
                  <div className="bg-yellow-900/10 border border-yellow-500/20 rounded-xl p-4 mb-6">
                    <h4 className="text-[10px] uppercase font-bold text-yellow-400 mb-2 flex items-center gap-2"><Bot size={14}/> Gemini AI Extraction</h4>
                    {selectedSlip.ai_analysis ? (
                      <div className="space-y-2">
                         <div className="flex justify-between text-sm">
                           <span className="text-slate-400">Extracted Amount:</span>
                           <span className="font-bold text-white">{selectedSlip.ai_analysis.extracted_amount ? formatCurrency(selectedSlip.ai_analysis.extracted_amount) : 'Not Found'}</span>
                         </div>
                         <div className="flex justify-between text-sm">
                           <span className="text-slate-400">Date on Slip:</span>
                           <span className="font-medium text-slate-300">{selectedSlip.ai_analysis.extracted_date || 'Not Found'}</span>
                         </div>
                         <div className="flex justify-between text-sm">
                           <span className="text-slate-400">Ref / Bank Details:</span>
                           <span className="font-medium text-slate-300">{selectedSlip.ai_analysis.extracted_ref || 'Not Found'}</span>
                         </div>
                         <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                            <span className="text-xs text-slate-400">AI Confidence:</span>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${selectedSlip.ai_analysis.ai_confidence > 50 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                              {selectedSlip.ai_analysis.ai_confidence}%
                            </span>
                         </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic">No AI data recorded for this slip.</p>
                    )}
                  </div>

                  {/* Resolution Workspace */}
                  <div className="mt-auto">
                    <label className="block text-xs uppercase font-bold text-slate-400 mb-2">Actual Verified Amount (LKR)</label>
                    <input 
                      type="number" 
                      value={verifiedAmount}
                      onChange={(e) => setVerifiedAmount(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-xl font-black text-white outline-none focus:border-emerald-500 mb-4"
                    />
                    
                    <div className="flex gap-3">
                      <button onClick={handleApprove} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2">
                        <CheckCircle2 size={18}/> Approve Slip
                      </button>
                      <button onClick={handleReject} className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 font-bold px-6 rounded-xl transition-all flex justify-center items-center">
                        <XCircle size={18}/>
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}