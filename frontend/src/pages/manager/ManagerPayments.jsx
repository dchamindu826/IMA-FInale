import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Loader2, Search, FileText, CheckCircle2, XCircle, Eye, Trash2, CreditCard, Clock, Activity, AlertCircle, X, Download, Calendar } from 'lucide-react';
import api from '../../api/axios';

export default function ManagerPayments() {
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({ total: 0, count: 0, newInstallments: 0 });
  const [isReady, setIsReady] = useState(false); // Initial Load Tracker
  
  const [pStatus, setPStatus] = useState('pending');
  const [filters, setFilters] = useState({
      business: '', batch: '', group: '', course: '', pType: 'all', pPlan: 'all', 
      student: '', studentPhone: '', selectBank: '', stream: '', classType: '',
      fromDate: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0], 
      toDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  });

  // Cascading Dropdown States
  const [businesses, setBusinesses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [groups, setGroups] = useState([]);
  const [courses, setCourses] = useState([]);
  
  // Modals
  const [previewModal, setPreviewModal] = useState({ isOpen: false, url: '', title: '' });
  const [postPayModal, setPostPayModal] = useState({ isOpen: false, paymentId: null, date: '' });
  
  // Complex Action Modal State
  const [actionModal, setActionModal] = useState({ isOpen: false, payment: null });
  const [approvalDetails, setApprovalDetails] = useState({ main: null, linked: [] });
  const [discounts, setDiscounts] = useState({});
  const [bankSelect, setBankSelect] = useState('');
  const [detailsLoading, setDetailsLoading] = useState(false);

  // 1. Initial Load (Businesses & Auto-Lock for Manager)
  useEffect(() => {
      const loadInitial = async () => {
          try {
              const res = await api.get('/admin/businesses'); 
              
              // Extract Array safely
              let fetchedBusinesses = [];
              if (Array.isArray(res.data)) fetchedBusinesses = res.data;
              else if (res.data?.data && Array.isArray(res.data.data)) fetchedBusinesses = res.data.data;
              else if (res.data?.businesses && Array.isArray(res.data.businesses)) fetchedBusinesses = res.data.businesses;

              setBusinesses(fetchedBusinesses);
              let assignedBusinessId = '';

              // Manager Auto-Select Logic
              if (fetchedBusinesses.length === 1) {
                  assignedBusinessId = fetchedBusinesses[0].id;
                  const updatedFilters = { ...filters, business: assignedBusinessId };
                  setFilters(updatedFilters);
                  
                  const batchRes = await api.post('/payments/admin/get-dropdowns', { type: 'batch', businessId: assignedBusinessId });
                  
                  let fetchedBatches = [];
                  if (Array.isArray(batchRes.data)) fetchedBatches = batchRes.data;
                  else if (batchRes.data?.data && Array.isArray(batchRes.data.data)) fetchedBatches = batchRes.data.data;
                  
                  setBatches(fetchedBatches);
                  fetchPaymentsWithFilters(updatedFilters, pStatus);
              } else {
                  fetchPaymentsWithFilters(filters, pStatus);
              }
              
              setIsReady(true);
          } catch(e) {
              console.error("Failed to load businesses", e);
              setBusinesses([]);
              setIsReady(true);
          }
      };
      loadInitial();
  }, []);

  // 2. Handle Cascading Filters
  const handleFilterChange = async (e) => {
      const { name, value } = e.target;
      setFilters(prev => ({ ...prev, [name]: value }));

      try {
          if (name === 'business' && value) {
              setFilters(prev => ({ ...prev, batch: '', group: '', course: '' }));
              const res = await api.post('/payments/admin/get-dropdowns', { type: 'batch', businessId: value });
              const newBatches = Array.isArray(res.data) ? res.data : (res.data?.data || []);
              setBatches(newBatches);
          } else if (name === 'batch' && value) {
              setFilters(prev => ({ ...prev, group: '', course: '' }));
              const res = await api.post('/payments/admin/get-dropdowns', { type: 'group', batchId: value });
              const newGroups = Array.isArray(res.data) ? res.data : (res.data?.data || []);
              setGroups(newGroups);
          } else if (name === 'group' && value) {
              setFilters(prev => ({ ...prev, course: '' }));
              const res = await api.post('/payments/admin/get-dropdowns', { type: 'course', groupId: value, classType: filters.classType });
              const newCourses = Array.isArray(res.data) ? res.data : (res.data?.data || []);
              setCourses(newCourses);
          }
      } catch (error) {
          console.error("Dropdown fetch error", error);
      }
  };

  // 3. Fetch Function with Custom Filters
  const fetchPaymentsWithFilters = async (currentFilters, currentStatus) => {
      setLoading(true);
      try {
          const endpoint = currentStatus === 'installment' ? '/payments/admin/get-installments' : '/payments/admin/get-payments';
          const res = await api.post(endpoint, { ...currentFilters, pStatus: currentStatus });
          setPayments(res.data?.data || []);
          setStats({
              total: res.data?.total || 0,
              count: res.data?.count || 0,
              newInstallments: res.data?.newAvailableInstallments || 0
          });
      } catch (error) {
          toast.error("Failed to fetch payments.");
      } finally {
          setLoading(false);
      }
  };

  // Button onClick wrapper
  const fetchPayments = () => {
      fetchPaymentsWithFilters(filters, pStatus);
  };

  // Tab Switching
  useEffect(() => { 
      if (isReady) {
          fetchPaymentsWithFilters(filters, pStatus);
      }
  }, [pStatus]);

  // Open Action Modal & Fetch Linked Details
  const openActionModal = async (payment) => {
      setActionModal({ isOpen: true, payment });
      setDetailsLoading(true);
      setDiscounts({});
      setBankSelect('');
      try {
          const res = await api.post('/payments/admin/get-approval-details', { paymentId: payment.paymentId });
          const mainPay = res.data?.payment || res.data?.data?.payment;
          const linkPay = res.data?.linkedPayments || res.data?.data?.linkedPayments || [];
          
          setApprovalDetails({ main: mainPay, linked: linkPay });
          
          let initDiscounts = { [mainPay.id]: mainPay.subjectAmount };
          linkPay.forEach(lp => initDiscounts[lp.id] = lp.subjectAmount);
          setDiscounts(initDiscounts);
      } catch (error) {
          toast.error("Failed to load payment details");
      } finally {
          setDetailsLoading(false);
      }
  };

  const handleDiscountChange = (id, val) => {
      setDiscounts(prev => ({ ...prev, [id]: val }));
  };

  // --- API ACTIONS ---
  const submitApproval = async (type) => {
      try {
          const linkedIds = approvalDetails.linked.map(lp => lp.id);
          
          if (type === 'approve' || type === 'free') {
              const endpoint = type === 'free' ? '/payments/admin/free' : '/payments/admin/approve';
              await api.post(endpoint, { 
                  paymentId: actionModal.payment.paymentId, 
                  bank: bankSelect, 
                  approveType: type,
                  payments: linkedIds 
              });
          } else if (type === 'discount') {
              let payload = { 
                  paymentId: actionModal.payment.paymentId, 
                  approveType: 'discount', 
                  bank: bankSelect, 
                  payments: linkedIds 
              };
              Object.keys(discounts).forEach(id => {
                  payload[`dis-${id}`] = discounts[id];
              });
              await api.post('/payments/admin/approve-discount', payload);
          }

          toast.success("Payment Processed Successfully!");
          setActionModal({ isOpen: false, payment: null });
          fetchPayments();
      } catch(e) { toast.error("Action failed"); }
  };

  const handleDecline = async (paymentId) => {
      if(!window.confirm("Are you sure you want to decline this payment?")) return;
      try {
          await api.post('/payments/admin/decline', { paymentId });
          toast.success("Payment Declined.");
          setActionModal({ isOpen: false, payment: null });
          fetchPayments();
      } catch(e) { toast.error("Decline failed"); }
  };

  const submitPostPay = async () => {
      if(!postPayModal.date) return toast.error("Please select a date");
      try {
          await api.post('/payments/admin/approve-post-pay', { paymentId: postPayModal.paymentId, postPayDate: postPayModal.date });
          toast.success("Post Pay Date Applied!");
          setPostPayModal({ isOpen: false, paymentId: null, date: '' });
          fetchPayments();
      } catch (error) { toast.error("Action failed"); }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR' }).format(val);

  return (
    <div className="w-full text-slate-200 animate-in fade-in duration-500 h-full flex flex-col font-sans pb-6 max-w-screen-2xl mx-auto px-4">
      {/* HEADER & TABS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
        <div>
          <h2 className="text-4xl font-black text-white drop-shadow-md flex items-center gap-3 mb-2">
            <CreditCard className="text-blue-400" size={36}/> Finance & Payments
          </h2>
          <p className="text-sm text-slate-400 font-medium">Review, Approve, and Manage Student Transactions.</p>
        </div>
        <div className="flex gap-4">
            <div className="bg-slate-800/40 border border-white/10 px-5 py-3 rounded-2xl flex flex-col justify-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Count</span>
                <span className="text-xl font-black text-white">{stats.count}</span>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 px-5 py-3 rounded-2xl flex flex-col justify-center">
                <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-widest">Total Amount</span>
                <span className="text-xl font-black text-emerald-400">{formatCurrency(stats.total)}</span>
            </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-3 mb-4 border-b border-white/10">
          {[
              { id: 'pending', label: 'Pending Approvals', icon: <Clock size={16}/> },
              { id: 'postPay', label: 'Post Pay', icon: <FileText size={16}/> },
              { id: 'installment', label: `Installments ${stats.newInstallments > 0 ? `(${stats.newInstallments})` : ''}`, icon: <Activity size={16}/> },
              { id: 'confirmed', label: 'Confirmed', icon: <CheckCircle2 size={16}/> },
              { id: 'free', label: 'Free Payments', icon: <AlertCircle size={16}/> }
          ].map(tab => (
              <button key={tab.id} onClick={() => setPStatus(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${pStatus === tab.id ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-slate-800/40 border border-white/10 text-slate-400 hover:text-white'}`}>
                  {tab.icon} {tab.label}
              </button>
          ))}
      </div>

      {/* FILTERS SECTION */}
      <div className="bg-slate-800/40 border border-white/10 backdrop-blur-md p-5 rounded-[2rem] shadow-xl mb-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 relative z-20">
          <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Business</label>
              <select 
                  name="business" 
                  value={filters.business} 
                  onChange={handleFilterChange} 
                  disabled={businesses.length === 1}
                  className="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-sm text-white disabled:opacity-50"
              >
                  <option value="">All Businesses</option>
                  {Array.isArray(businesses) && businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
          </div>
          <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Batch</label>
              <select name="batch" value={filters.batch} onChange={handleFilterChange} className="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-sm text-white disabled:opacity-50" disabled={!filters.business}>
                  <option value="">All Batches</option>
                  {Array.isArray(batches) && batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
          </div>
          <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Group</label>
              <select name="group" value={filters.group} onChange={handleFilterChange} className="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-sm text-white disabled:opacity-50" disabled={!filters.batch}>
                  <option value="">All Groups</option>
                  {Array.isArray(groups) && groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
          </div>
          <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Course</label>
              <select name="course" value={filters.course} onChange={handleFilterChange} className="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-sm text-white disabled:opacity-50" disabled={!filters.group}>
                  <option value="">All Courses</option>
                  {Array.isArray(courses) && courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
          </div>
          <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Student Name</label>
              <input type="text" name="student" value={filters.student} onChange={handleFilterChange} placeholder="Type name..." className="w-full bg-black/30 border border-white/10 rounded-lg p-2.5 text-sm text-white" />
          </div>
          <div className="col-span-full flex justify-end">
              <button onClick={fetchPayments} className="bg-blue-600 hover:bg-blue-500 px-8 text-white text-sm font-bold py-2.5 rounded-lg flex items-center justify-center gap-2">
                  <Search size={16}/> Search
              </button>
          </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-slate-800/40 border border-white/10 backdrop-blur-md rounded-[2rem] shadow-xl flex-1 flex flex-col overflow-hidden">
          <div className="overflow-x-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                  <thead className="bg-black/40 border-b border-white/10">
                      <tr>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase">ID / Date</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Student</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Course / Module</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase">Amount</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase text-center">Actions</th>
                      </tr>
                  </thead>
                  <tbody>
                      {loading ? (
                          <tr><td colSpan="5" className="py-20 text-center"><Loader2 size={40} className="animate-spin text-blue-400 mx-auto"/></td></tr>
                      ) : payments.length === 0 ? (
                          <tr><td colSpan="5" className="py-20 text-center text-slate-500 italic">No payment records found.</td></tr>
                      ) : (
                          payments.map((p, idx) => (
                              <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                  <td className="p-4">
                                      <span className="block text-sm font-bold text-white">#{p.paymentId}</span>
                                      <span className="text-[10px] text-slate-400">{p.createdDate?.split('T')[0]}</span>
                                  </td>
                                  <td className="p-4">
                                      <span className="block text-sm font-bold text-blue-300">{p.fName} {p.lName}</span>
                                      <span className="text-[10px] text-slate-400">{p.phone}</span>
                                  </td>
                                  <td className="p-4">
                                      <span className="block text-sm font-medium text-slate-200">{p.courseName}</span>
                                      {p.linkedModulesString && <span className="text-[9px] text-slate-500 block mt-1 line-clamp-2" dangerouslySetInnerHTML={{__html: p.linkedModulesString}}></span>}
                                  </td>
                                  <td className="p-4 text-sm font-black text-emerald-400">{formatCurrency(p.calculatedAmount)}</td>
                                  <td className="p-4 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                          {p.slipFileName && (
                                              <button onClick={() => setPreviewModal({ isOpen: true, url: `${api.defaults.baseURL.replace('/api','')}/storage/slipImages/${p.slipFileName}`, title: `Receipt #${p.paymentId}` })} className="bg-slate-700/50 hover:bg-blue-600 p-2 rounded-lg" title="View Slip"><Eye size={16}/></button>
                                          )}
                                          {(pStatus === 'pending' || pStatus === 'postPay' || pStatus === 'installment') && (
                                              <button onClick={() => openActionModal(p)} className="bg-emerald-600/20 hover:bg-emerald-500 text-emerald-400 hover:text-white p-2 rounded-lg border border-emerald-500/30" title="Process"><CheckCircle2 size={16}/></button>
                                          )}
                                          {(pStatus === 'pending' || pStatus === 'confirmed') && (
                                               <button onClick={() => setPostPayModal({ isOpen: true, paymentId: p.paymentId, date: '' })} className="bg-yellow-500/20 hover:bg-yellow-500 text-yellow-400 hover:text-white p-2 rounded-lg border border-yellow-500/30" title="Post Pay"><Calendar size={16}/></button>
                                          )}
                                      </div>
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* COMPLEX ACTION MODAL */}
      {actionModal.isOpen && actionModal.payment && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
              <div className="bg-slate-900 border border-white/20 rounded-[2rem] w-full max-w-4xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in duration-200 max-h-[90vh]">
                  <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/40">
                      <h3 className="text-xl text-white font-black">Process Payment #{actionModal.payment.paymentId}</h3>
                      <button onClick={() => setActionModal({ isOpen: false, payment: null })} className="text-slate-400 hover:text-red-400 bg-white/5 p-2.5 rounded-xl"><X size={20}/></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto custom-scrollbar">
                      {detailsLoading ? (
                          <div className="py-10 text-center"><Loader2 size={40} className="animate-spin text-blue-400 mx-auto"/></div>
                      ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-5">
                                  <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl">
                                      <p className="text-sm text-blue-200">Student: <strong>{actionModal.payment.fName} {actionModal.payment.lName}</strong></p>
                                      <p className="text-xs text-slate-400 mt-1">Total Amount: <span className="text-lg font-black text-emerald-400">{formatCurrency(actionModal.payment.calculatedAmount)}</span></p>
                                  </div>

                                  <div>
                                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Select Bank</label>
                                      <select value={bankSelect} onChange={(e)=>setBankSelect(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white outline-none">
                                          <option value="">-- Optional --</option>
                                          <option value="BOC">BOC</option><option value="Sampath Bank">Sampath Bank</option>
                                          <option value="Commercial Bank">Commercial Bank</option><option value="DFCC Bank">DFCC Bank</option>
                                      </select>
                                  </div>

                                  <div className="bg-black/30 border border-white/5 p-4 rounded-xl">
                                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-3">Courses inside this payment:</p>
                                      <div className="flex items-center gap-2 mb-2">
                                          <CheckCircle2 size={16} className="text-emerald-500"/>
                                          <span className="text-sm text-white">{approvalDetails.main?.course?.name}</span>
                                      </div>
                                      {approvalDetails.linked.map(lp => (
                                          <div key={lp.id} className="flex items-center gap-2 mb-2 pl-4 border-l-2 border-white/10 ml-2">
                                              <CheckCircle2 size={14} className="text-slate-400"/>
                                              <span className="text-sm text-slate-300">{lp.course?.name}</span>
                                          </div>
                                      ))}
                                  </div>

                                  <div className="flex gap-2">
                                      <button onClick={() => submitApproval('approve')} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2"><CheckCircle2 size={18}/> Approve</button>
                                      <button onClick={() => submitApproval('free')} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2"><AlertCircle size={18}/> Make Free</button>
                                  </div>
                                  <button onClick={() => handleDecline(actionModal.payment.paymentId)} className="w-full bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/30 font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-all"><XCircle size={18}/> Decline Payment</button>
                              </div>

                              <div className="bg-slate-800/60 border border-white/10 p-5 rounded-2xl">
                                  <h4 className="text-sm font-black text-yellow-400 mb-4 flex items-center gap-2"><AlertCircle size={18}/> Mark as Discounted</h4>
                                  <p className="text-xs text-slate-400 mb-4">You can set specific approved amounts for each linked module below.</p>
                                  
                                  <div className="space-y-3 mb-6">
                                      {approvalDetails.main && (
                                          <div className="flex flex-col gap-1">
                                              <label className="text-xs text-white">{approvalDetails.main.course?.name}</label>
                                              <input type="number" value={discounts[approvalDetails.main.id] || ''} onChange={(e) => handleDiscountChange(approvalDetails.main.id, e.target.value)} className="bg-black/50 border border-white/20 rounded p-2 text-sm text-white" />
                                          </div>
                                      )}
                                      {approvalDetails.linked.map(lp => (
                                          <div key={lp.id} className="flex flex-col gap-1 pl-4 border-l-2 border-yellow-500/30 ml-2 mt-2">
                                              <label className="text-xs text-slate-300">{lp.course?.name}</label>
                                              <input type="number" value={discounts[lp.id] || ''} onChange={(e) => handleDiscountChange(lp.id, e.target.value)} className="bg-black/50 border border-white/20 rounded p-2 text-sm text-white" />
                                          </div>
                                      ))}
                                  </div>
                                  <button onClick={() => submitApproval('discount')} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 shadow-lg transition-all"><CheckCircle2 size={18}/> Approve with Discount</button>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* POST PAY MODAL */}
      {postPayModal.isOpen && (
          <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
              <div className="bg-slate-900 border border-white/20 rounded-[2rem] w-full max-w-sm flex flex-col shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                  <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/40">
                      <h3 className="text-lg text-white font-black">Apply Post Pay</h3>
                      <button onClick={() => setPostPayModal({ isOpen: false, paymentId: null, date: '' })} className="text-slate-400 hover:text-red-400 bg-white/5 p-2 rounded-xl"><X size={18}/></button>
                  </div>
                  <div className="p-6">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-2">Select Post Pay End Date</label>
                      <input type="date" value={postPayModal.date} onChange={(e)=>setPostPayModal(prev => ({...prev, date: e.target.value}))} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white outline-none mb-4" />
                      <button onClick={submitPostPay} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2"><Calendar size={18}/> Apply Date</button>
                  </div>
              </div>
          </div>
      )}

      {/* PREVIEW MODAL */}
      {previewModal.isOpen && (
         <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
             <div className="bg-slate-900 border border-white/20 rounded-[2rem] w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                 <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/60">
                     <h3 className="text-sm text-white font-bold"><Eye className="text-blue-400 inline mr-2" size={18}/> {previewModal.title}</h3>
                     <button onClick={() => setPreviewModal({ isOpen: false, url: '', title: '' })} className="text-slate-400 hover:text-red-400 bg-white/5 p-2 rounded-lg"><X size={16}/></button>
                 </div>
                 <div className="flex-1 bg-black/50 p-4 flex items-center justify-center">
                     {previewModal.url.toLowerCase().endsWith('.pdf') ? (
                         <iframe src={previewModal.url} className="w-full h-full rounded-xl bg-white" title="Slip"></iframe>
                     ) : (
                         <img src={previewModal.url} alt="Slip" className="max-w-full max-h-full object-contain rounded-xl"/>
                     )}
                 </div>
             </div>
         </div>
      )}
    </div>
  );
}