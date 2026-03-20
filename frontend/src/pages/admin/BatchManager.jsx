import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Loader2, ArrowLeft, Layers, Edit2, Trash2, Ban, CheckCircle, X } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function BatchManager() {
  const { businessId } = useParams();
  const navigate = useNavigate();
  
  const [batches, setBatches] = useState([]);
  const [businessInfo, setBusinessInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);

  const [batchForm, setBatchForm] = useState({
    name: '', type: '1', description: '', itemOrder: '', logo: null
  });

  const fetchBatches = async () => {
    try {
      const res = await api.get(`/admin/batches/${businessId}`); 
      setBatches(res.data?.batches || []); 
      setBusinessInfo(res.data?.business || { name: 'Business' });
      setLoading(false);
    } catch (error) {
      toast.error("Failed to load batches.");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [businessId]);

  const handleAddBatch = async (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append('business_id', businessId);
    Object.keys(batchForm).forEach(key => {
        if(batchForm[key] !== null) data.append(key, batchForm[key]);
    });

    try {
      await api.post('/admin/batch/add', data, { headers: { 'Content-Type': 'multipart/form-data' }});
      toast.success("Batch Added Successfully!");
      setShowAddBatchModal(false);
      fetchBatches();
    } catch (error) {
      toast.error("Failed to add batch.");
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-blue-400" /></div>;

  return (
    <div className="w-full text-slate-200 animate-in fade-in duration-300 relative h-full">
      <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
        <button onClick={() => navigate('/admin/businesses')} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
            <ArrowLeft size={20} className="text-blue-400" />
        </button>
        <div>
          <h2 className="text-3xl font-bold text-white drop-shadow-md">Batches for {businessInfo?.name}</h2>
          <p className="text-slate-400 mt-1 text-sm">Manage batches within this business.</p>
        </div>
        <div className="ml-auto flex gap-3">
            <button onClick={() => setShowAddBatchModal(true)} className="bg-blue-600/80 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 border border-blue-400/30 backdrop-blur-md shadow-lg transition-all">
                <Plus size={18} /> Add Batch
            </button>
        </div>
      </div>

      <div className="space-y-6 overflow-y-auto pb-10">
        {batches.length === 0 ? (
            <div className="bg-white/5 p-10 rounded-3xl text-center border border-white/10">
                <Layers size={40} className="mx-auto text-slate-500 mb-4" />
                <p className="text-slate-400">No batches found. Create one to get started.</p>
            </div>
        ) : (
            batches.map((batch) => (
                <div key={batch.id} className="bg-slate-800/40 border border-white/10 backdrop-blur-xl p-6 rounded-3xl shadow-xl flex flex-col group relative transition-all hover:border-blue-500/30">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-slate-900/60 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner overflow-hidden">
                                {batch.logo ? <img src={`http://localhost:5000/storage/icons/${batch.logo}`} className="w-full h-full object-cover"/> : <Layers size={24} className="text-blue-300" />}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white leading-tight">{batch.name}</h3>
                                <p className="text-slate-400 text-xs mt-1">{batch.description || "No description provided."}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button className="text-sm font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500 hover:text-white px-4 py-2 rounded-xl transition-all">
                                View Groups & Courses
                            </button>
                            <button className="p-2 bg-red-500/10 text-red-400 rounded-lg"><Trash2 size={16} /></button>
                        </div>
                    </div>
                </div>
            ))
        )}
      </div>

      {/* ADD BATCH MODAL */}
      {showAddBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800/90 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl w-full max-w-2xl p-8 relative">
            <button onClick={() => setShowAddBatchModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white"><X size={20} /></button>
            <h3 className="text-2xl font-bold text-white mb-6">Add New Batch</h3>
            <form onSubmit={handleAddBatch} className="space-y-4">
              <input required type="text" placeholder="Batch Name" value={batchForm.name} onChange={e => setBatchForm({...batchForm, name: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none" />
              <select required value={batchForm.type} onChange={e => setBatchForm({...batchForm, type: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none">
                  <option value="1">Theory Only</option>
                  <option value="2">Paper Only</option>
              </select>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl">Create Batch</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}