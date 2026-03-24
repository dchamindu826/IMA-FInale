import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Loader2, FolderOpen, Layers, BookOpen, Plus, Edit3, Trash2, ChevronRight, ChevronDown, X, ArrowLeft, GripVertical, CheckCircle, FolderPlus, Video, MonitorPlay, FileText, FileSignature, ExternalLink, Ban } from 'lucide-react';
import api from '../../api/axios';

export default function ContentHub({ userRole }) {
  const [loading, setLoading] = useState(true);
  const isManager = true; 

  // --- Drill-down States ---
  const [viewLevel, setViewLevel] = useState('batches'); 
  const [activeBatch, setActiveBatch] = useState(null);
  const [batchTab, setBatchTab] = useState('subjects'); 
  const [activeSubject, setActiveSubject] = useState(null);
  const [contentTab, setContentTab] = useState('live'); 

  // --- Folder Accordion State ---
  const [openFolders, setOpenFolders] = useState({});
  const [prefilledFolder, setPrefilledFolder] = useState(""); // අලුතින් content add කරද්දි folder එක auto select වෙන්න

  // --- Real Data States ---
  const [businessData, setBusinessData] = useState(null); 
  const [batches, setBatches] = useState([]); 
  const [uniqueSubjects, setUniqueSubjects] = useState([]);
  const [lessonGroups, setLessonGroups] = useState([]); 
  const [subjectContents, setSubjectContents] = useState([]);

  // --- Modals State ---
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showLessonGroupModal, setShowLessonGroupModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState(null);
  
  // Custom States
  const [selectedGroupPrices, setSelectedGroupPrices] = useState({}); 
  const [discountRules, setDiscountRules] = useState([{ courseCount: '', pricePerCourse: '' }]); 

  // Mass Assign States
  const [contentType, setContentType] = useState('');
  const [massAssignSubjects, setMassAssignSubjects] = useState([]);
  const [mcqCount, setMcqCount] = useState(0); 

  const fetchAllData = async () => {
      setLoading(true);
      try {
          const overviewRes = await api.get('/admin/manager/overview');
          if (overviewRes.data && overviewRes.data.business) setBusinessData(overviewRes.data.business);

          const batchRes = await api.get('/admin/manager/batches-full');
          const fetchedBatches = batchRes.data || [];
          setBatches(fetchedBatches);

          if (activeBatch) {
              const updatedBatch = fetchedBatches.find(b => b.id.toString() === activeBatch.id.toString());
              if (updatedBatch) {
                  setActiveBatch(updatedBatch);
                  extractUniqueSubjects(updatedBatch);
                  
                  if(activeSubject) {
                      const updatedSub = uniqueSubjects.find(s => s.code === activeSubject.code && s.name === activeSubject.name);
                      if(updatedSub) fetchContents(updatedSub, updatedBatch);
                  }
              }
          }
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
  };

  useEffect(() => { fetchAllData(); }, []);

  // --- Helpers ---
  const toggleFolder = (folderId) => {
      setOpenFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const extractUniqueSubjects = (batch) => {
      const subs = [];
      batch?.groups?.forEach(g => {
          g.courses?.forEach(c => {
              const existing = subs.find(s => s.name === c.name);
              if(!existing) {
                  subs.push({...c, groupPrices: [{ groupId: g.id, groupName: g.name, groupType: g.type, price: c.price }] });
              } else {
                  existing.groupPrices.push({ groupId: g.id, groupName: g.name, groupType: g.type, price: c.price });
              }
          });
      });
      setUniqueSubjects(subs.sort((a,b) => a.itemOrder - b.itemOrder));
  };

  const getBatchStreams = () => {
      if (!businessData || !businessData.streams) return [];
      try { return JSON.parse(businessData.streams); } catch(e) { return []; }
  };

  const groupedSubjects = uniqueSubjects.reduce((acc, sub) => {
      const streamKey = businessData?.category === 'AL' ? (sub.stream || 'Uncategorized') : 'All Subjects';
      if(!acc[streamKey]) acc[streamKey] = [];
      acc[streamKey].push(sub);
      return acc;
  }, {});

  const getTypeInt = (tabStr) => {
      switch(tabStr) { case 'live': return 1; case 'recording': return 2; case 'document': return 3; case 'sPaper': return 4; case 'paper': return 5; default: return 1; }
  };

  const getEmbedUrl = (url) => {
      if (!url) return '';
      if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/');
      if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'youtube.com/embed/');
      if (url.includes('drive.google.com') && url.includes('/view')) return url.replace('/view', '/preview');
      return url; 
  };

  // --- Smart Filters ---
  const isMatchedType = (item) => {
      const itemType = item.type ?? item.content_type ?? item.contentType;
      if (itemType === null || itemType === undefined) return false;
      return parseInt(itemType) === getTypeInt(contentTab) || itemType.toString() === contentTab;
  };

  const getFolderId = (item) => {
      const fId = item.content_group_id ?? item.contentGroupId ?? item.folder_id;
      return fId ? parseInt(fId) : null;
  };

  // --- Navigation ---
  const openBatchDetails = (batch) => { 
      setActiveBatch(batch); extractUniqueSubjects(batch); setViewLevel('batch_details'); setBatchTab('subjects');
  };

  const fetchContents = async (subject, batch) => {
      try {
          const res = await api.get(`/admin/manager/get-contents?batchId=${batch.id}&courseCode=${subject.code || 'NULL'}&courseId=${subject.id}`);
          setLessonGroups(res.data?.lessonGroups || []);
          setSubjectContents(res.data?.contents || []);
          
          const newOpenState = {};
          (res.data?.lessonGroups || []).forEach(f => newOpenState[f.id] = true);
          setOpenFolders(newOpenState);
      } catch (e) { toast.error("Failed to load contents"); }
  };
  
  const openContentsView = async (subject) => {
      setActiveSubject(subject); setViewLevel('contents'); setLoading(true);
      await fetchContents(subject, activeBatch);
      setLoading(false);
  };

  const handleBack = (level) => {
      setViewLevel(level);
      if(level === 'batches') { setActiveBatch(null); setActiveSubject(null); }
      if(level === 'batch_details') { setActiveSubject(null); }
  };

  // --- Form Actions ---
  const openAddGroup = () => { setEditMode(false); setDiscountRules([{ courseCount: '', pricePerCourse: '' }]); setShowGroupModal(true); };
  const openEditGroup = (g) => { 
      setEditData(g); setEditMode(true); 
      setDiscountRules(g.discount_rules ? JSON.parse(g.discount_rules) : [{ courseCount: '', pricePerCourse: '' }]); 
      setShowGroupModal(true); 
  };
  
  const openAddCourse = () => { setEditMode(false); setSelectedGroupPrices({}); setShowCourseModal(true); };
  const openEditCourse = (c) => { 
      setEditData(c); setEditMode(true); 
      const gPrices = {};
      c.groupPrices.forEach(p => gPrices[p.groupId] = p.price);
      setSelectedGroupPrices(gPrices);
      setShowCourseModal(true); 
  };

  const openAddLessonGroup = () => { setEditMode(false); setShowLessonGroupModal(true); };
  const openEditLessonGroup = (folder) => { setEditData(folder); setEditMode(true); setShowLessonGroupModal(true); };
  
  const openMassAssign = () => { setContentType(''); setPrefilledFolder(''); setMassAssignSubjects([]); setMcqCount(0); setShowContentModal(true); };
  const openEditContent = (content) => { setEditData(content); setEditMode(true); setShowContentModal(true); };

  // Discount Rules Helper
  const addDiscountRule = () => setDiscountRules([...discountRules, { courseCount: '', pricePerCourse: '' }]);
  const removeDiscountRule = (index) => setDiscountRules(discountRules.filter((_, i) => i !== index));
  const handleDiscountRuleChange = (index, field, value) => {
      const newRules = [...discountRules];
      newRules[index][field] = value;
      setDiscountRules(newRules);
  };

  // Submit Handlers
  const handleGroupSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const pType = formData.get('pType');
      const payload = { group_id: editData?.id, gName: formData.get('gName'), pType, batch_id: activeBatch.id, itemOrder: formData.get('itemOrder'), discountRules: pType === "1" ? discountRules : [] };
      try {
          if(editMode) await api.put('/admin/group/update', payload); else await api.post('/admin/group/add', payload);
          toast.success(editMode ? "Group Updated!" : "Group Added!");
          setShowGroupModal(false); fetchAllData();
      } catch (error) { toast.error("Action Failed"); }
  };

  const handleCourseSubmit = async (e) => {
      e.preventDefault();
      const keys = Object.keys(selectedGroupPrices);
      if (keys.length === 0) return toast.error("Please tick at least one group and enter a price!");

      const formattedPrices = keys.map(k => ({ groupId: k, price: selectedGroupPrices[k] }));
      const formData = new FormData(e.target);
      const payload = {
          course_id: editData?.id,
          name: formData.get('name'), code: formData.get('code'), stream: formData.get('stream') || null, 
          description: formData.get('description'), itemOrder: formData.get('itemOrder'),
          groupPrices: JSON.stringify(formattedPrices)
      };
      try {
          if(editMode) await api.put('/admin/course/update', payload); else await api.post('/admin/course/add', payload);
          toast.success(editMode ? "Subject Updated!" : "Subject Created!");
          setShowCourseModal(false); fetchAllData();
      } catch (error) { toast.error("Action Failed"); }
  };

  const handleLessonGroupSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const folderType = getTypeInt(contentTab); 
      const payload = { 
          contentGroupId: editData?.id,
          title: formData.get('title'), 
          type: folderType, 
          order: formData.get('order') || 1, 
          batch_id: activeBatch.id, 
          course_code: activeSubject.code || 'NULL' 
      };
      try {
          if(editMode) await api.put('/admin/content-group/update', payload); else await api.post('/admin/content-group/add', payload);
          toast.success(editMode ? "Folder Updated!" : "Folder Created!");
          setShowLessonGroupModal(false); fetchContents(activeSubject, activeBatch); 
      } catch (error) { toast.error("Action Failed"); }
  };

  const handleMassAssignSubmit = async (e) => {
      e.preventDefault();
      if(massAssignSubjects.length === 0) return toast.error("Please select at least one subject to assign this content!");
      
      const formData = new FormData(e.target);
      formData.append('type', contentType);
      formData.append('selectedCourses', JSON.stringify(massAssignSubjects));

      try {
          await api.post('/admin/manager/contents/mass-assign', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
          toast.success("Content Assigned Successfully!");
          setShowContentModal(false); 
          if(activeSubject) fetchContents(activeSubject, activeBatch); 
      } catch (error) { toast.error("Failed to assign content"); }
  };

  // Delete Actions
  const deleteGroup = async (id) => { if(window.confirm("Delete this Group?")) { try { await api.delete('/admin/group/delete', { data: { group_id: id } }); toast.success("Deleted!"); fetchAllData(); } catch(e) { toast.error("Error"); } } };
  const deleteCourse = async (id) => { if(window.confirm("Delete this Subject?")) { try { await api.delete('/admin/course/delete', { data: { course_id: id } }); toast.success("Deleted!"); fetchAllData(); } catch(e) { toast.error("Error"); } } };
  const deleteFolder = async (id) => { if(window.confirm("Delete this Folder? Contents inside will become uncategorized.")) { try { await api.delete('/admin/content-group/delete', { data: { contentGroupId: id } }); toast.success("Folder Deleted!"); fetchContents(activeSubject, activeBatch); } catch(e) {} } };
  const deleteContent = async (id) => { if(window.confirm("Delete this Content?")) { try { await api.delete('/admin/content/delete', { data: { content_id: id } }); toast.success("Deleted!"); fetchContents(activeSubject, activeBatch); } catch(e) { toast.error("Error"); } } };

  const toggleGroupPrice = (groupId) => setSelectedGroupPrices(prev => prev[groupId] !== undefined ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== groupId.toString())) : {...prev, [groupId]: ''});
  const setGroupPrice = (groupId, price) => setSelectedGroupPrices(prev => ({...prev, [groupId]: price}));
  const toggleMassAssignSubject = (subId) => setMassAssignSubjects(prev => prev.includes(subId) ? prev.filter(id => id !== subId) : [...prev, subId]);

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 size={50} className="animate-spin text-blue-500" /></div>;

  return (
    <div className="w-full text-slate-200 animate-in fade-in duration-500 h-full flex flex-col font-sans pb-4">
      
      {/* 🔴 HEADER & BREADCRUMBS 🔴 */}
      <div className="mb-6 bg-slate-900/50 border border-white/5 p-6 rounded-2xl shadow-lg flex flex-col gap-4 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-400">
              {viewLevel !== 'batches' && <button onClick={() => handleBack(viewLevel==='contents' ? 'batch_details' : 'batches')} className="hover:text-blue-400 flex items-center gap-1 bg-white/5 px-3 py-1 rounded-lg transition-colors"><ArrowLeft size={14}/> Back</button>}
              <button onClick={() => handleBack('batches')} className={`hover:text-white transition-colors ${viewLevel==='batches' ? 'text-white font-bold' : ''}`}>Content Hub</button>
              {activeBatch && <><ChevronRight size={14} className="text-slate-600"/> <button onClick={() => handleBack('batch_details')} className={`hover:text-white transition-colors ${viewLevel==='batch_details' ? 'text-white font-bold' : ''}`}>{activeBatch.name}</button></>}
              {activeSubject && <><ChevronRight size={14} className="text-slate-600"/> <span className="text-blue-400 font-bold">{activeSubject.name} Contents</span></>}
          </div>

          <div className="flex flex-wrap justify-between items-center gap-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  {viewLevel === 'batches' && <><FolderOpen className="text-blue-500"/> Manage Batches</>}
                  {viewLevel === 'batch_details' && <><Layers className="text-purple-500"/> {activeBatch?.name}</>}
                  {viewLevel === 'contents' && <><MonitorPlay className="text-emerald-500"/> {activeSubject?.name}</>}
              </h2>
              <div className="flex flex-wrap gap-3">
                  {/* Disabled New Batch Button Restored */}
                  {viewLevel === 'batches' && (
                      <button disabled className="bg-blue-600/30 text-white/50 cursor-not-allowed px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all"><Plus size={16}/> New Batch</button>
                  )}

                  {viewLevel === 'batch_details' && (
                      <>
                          {batchTab === 'groups' && <button onClick={openAddGroup} className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all"><Plus size={16}/> New Group</button>}
                          {batchTab === 'subjects' && <button onClick={openAddCourse} className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all"><Plus size={16}/> New Subject</button>}
                      </>
                  )}
                  {viewLevel === 'contents' && (
                      <>
                          <button onClick={openAddLessonGroup} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all border border-slate-600"><FolderPlus size={16}/> Add Folder</button>
                          <button onClick={openMassAssign} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all"><Plus size={16}/> Add Content</button>
                      </>
                  )}
              </div>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
          
          {/* 🔴 LEVEL 1: BATCHES 🔴 */}
          {viewLevel === 'batches' && (
              batches.length === 0 ? <p className="text-center text-slate-500 py-10 bg-slate-900/30 rounded-2xl border border-white/5">No batches available.</p> : 
              batches.map((batch, index) => (
                  <div key={batch.id || `b-${index}`} className="bg-slate-800/60 border border-white/5 hover:border-blue-500/30 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 transition-all shadow-sm">
                      <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-sm">
                              <img src={batch.logo ? `http://localhost:5000/storage/icons/${batch.logo}` : '/logo.png'} onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }} alt="Logo" className="max-w-full max-h-full object-contain" />
                          </div>
                          <div>
                              <h3 className="text-lg font-bold text-white">{batch.name}</h3>
                              <p className="text-sm text-slate-400 mt-1 font-medium">{batch.groups?.length || 0} Groups</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-2">
                          {/* Disabled Edit/Delete Batch Buttons Restored */}
                          <button disabled className="bg-slate-700/50 text-slate-500 cursor-not-allowed p-2 rounded-xl"><Edit3 size={16}/></button>
                          <button disabled className="bg-slate-700/50 text-slate-500 cursor-not-allowed p-2 rounded-xl"><Trash2 size={16}/></button>
                          <button onClick={() => openBatchDetails(batch)} className="bg-blue-600/10 hover:bg-blue-600/30 text-blue-400 border border-blue-500/20 px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ml-2">Manage Groups <ChevronRight size={16}/></button>
                      </div>
                  </div>
              ))
          )}

          {/* 🔴 LEVEL 2: BATCH DETAILS (GROUPS & SUBJECTS) 🔴 */}
          {viewLevel === 'batch_details' && (
              <div className="flex flex-col h-full">
                  <div className="flex gap-2 mb-5">
                      <button onClick={() => setBatchTab('groups')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${batchTab === 'groups' ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-800/50 text-slate-400 hover:text-white border border-white/5'}`}><Layers size={18}/> Payment Groups</button>
                      <button onClick={() => setBatchTab('subjects')} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${batchTab === 'subjects' ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-800/50 text-slate-400 hover:text-white border border-white/5'}`}><BookOpen size={18}/> Subjects List</button>
                  </div>

                  <div className="space-y-6">
                      {/* --- GROUPS TAB --- */}
                      {batchTab === 'groups' && (
                          activeBatch?.groups?.length === 0 ? <p className="text-center text-slate-500 py-10 bg-slate-900/30 rounded-2xl border border-white/5">No groups created yet.</p> :
                          activeBatch?.groups?.map((group, idx) => (
                              <div key={group.id || `g-${idx}`} className="bg-slate-800/60 border-l-4 border-l-purple-500 border border-white/5 p-5 rounded-2xl flex justify-between items-center gap-4 transition-all hover:bg-slate-800">
                                  <div>
                                      <h3 className="text-lg font-bold text-white">{group.name}</h3>
                                      <p className="text-sm text-slate-400 mt-1 font-medium">Type: <span className="text-purple-300">{group.type === 1 ? 'Full Payment' : 'Monthly Payment'}</span></p>
                                      {group.type === 1 && group.discount_rules && JSON.parse(group.discount_rules).length > 0 && (
                                          <div className="mt-3 flex gap-2">
                                              {JSON.parse(group.discount_rules).map((rule, ridx) => (
                                                  <span key={`rule-${ridx}`} className="text-[10px] bg-purple-500/20 border border-purple-500/30 text-purple-300 px-2 py-1 rounded">Buy {rule.courseCount} → Rs {rule.pricePerCourse}/ea</span>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <button onClick={() => openEditGroup(group)} className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 p-2 rounded-xl transition-all"><Edit3 size={16}/></button>
                                      <button onClick={() => deleteGroup(group.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 p-2 rounded-xl transition-all"><Trash2 size={16}/></button>
                                  </div>
                              </div>
                          ))
                      )}

                      {/* --- SUBJECTS TAB --- */}
                      {batchTab === 'subjects' && (
                          Object.keys(groupedSubjects).length === 0 ? <p className="text-center text-slate-500 py-10 bg-slate-900/30 rounded-2xl border border-white/5">No subjects created yet.</p> : 
                          Object.keys(groupedSubjects).map((streamName, idx) => (
                              <div key={`stream-${idx}`} className="bg-slate-900/40 p-5 rounded-3xl border border-white/5">
                                  {businessData?.category === 'AL' && (
                                      <h3 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2 border-b border-white/10 pb-2"><Layers size={18}/> {streamName} Stream</h3>
                                  )}
                                  <div className="space-y-3">
                                      {groupedSubjects[streamName].map((sub, sidx) => (
                                          <div key={sub.code || `sub-${sidx}`} className="bg-slate-800 border border-white/5 hover:border-orange-500/30 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 transition-all">
                                              <div className="flex items-center gap-4">
                                                  <div className="cursor-move text-slate-600"><GripVertical size={20}/></div>
                                                  <div>
                                                      <h3 className="text-base font-bold text-white">{sub.name} {sub.code && <span className="text-xs text-orange-400 border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 rounded ml-2">{sub.code}</span>}</h3>
                                                      <div className="flex flex-wrap gap-2 mt-2">
                                                          {sub.groupPrices.map((gp, i) => (
                                                              <span key={`gp-${i}`} className="text-[11px] bg-black/40 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-lg">
                                                                  {gp.groupName}: <span className="text-emerald-400 font-bold ml-1">Rs {gp.price}</span>
                                                              </span>
                                                          ))}
                                                      </div>
                                                  </div>
                                              </div>
                                              <div className="flex gap-2 items-center">
                                                  <button onClick={() => openContentsView(sub)} className="bg-emerald-600/10 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"><MonitorPlay size={16}/> View Contents</button>
                                                  <button onClick={() => openEditCourse(sub)} className="bg-white/5 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 border border-white/5 p-2 rounded-xl transition-all"><Edit3 size={16}/></button>
                                                  <button onClick={() => deleteCourse(sub.id)} className="bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/5 p-2 rounded-xl transition-all"><Trash2 size={16}/></button>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          )}

          {/* 🔴 LEVEL 3: SUBJECT CONTENTS 🔴 */}
          {viewLevel === 'contents' && (
              <div className="bg-slate-900/30 border border-white/5 rounded-2xl flex flex-col shadow-xl min-h-[500px]">
                  <div className="flex overflow-x-auto custom-scrollbar border-b border-white/5 bg-slate-800/80 p-3 gap-3">
                      {[ { id: 'live', label: 'Live Classes', icon: Video }, { id: 'recording', label: 'Recordings', icon: MonitorPlay },
                         { id: 'document', label: 'Documents', icon: FileText }, { id: 'sPaper', label: 'Structured Papers', icon: FileSignature }, { id: 'paper', label: 'MCQs', icon: CheckCircle }
                      ].map(tab => (
                          <button key={tab.id} onClick={() => setContentTab(tab.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${contentTab === tab.id ? 'bg-emerald-600 text-white shadow-md' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>
                              <tab.icon size={16}/> {tab.label}
                          </button>
                      ))}
                  </div>
                  
                  <div className="p-6 space-y-6 overflow-y-auto">
                      
                      {/* Filtered Folders for Current Tab (Accordion Applied) */}
                      {lessonGroups.filter(isMatchedType).length > 0 && (
                          <div className="space-y-4">
                              {lessonGroups.filter(isMatchedType).map((folder, fIndex) => (
                                  <div key={folder.id || `folder-${fIndex}`} className="bg-black/20 border border-white/5 rounded-2xl p-5 transition-all">
                                      <div 
                                        className="flex justify-between items-center mb-2 border-b border-white/5 pb-3 cursor-pointer hover:bg-white/5 px-2 -mx-2 rounded transition-colors"
                                        onClick={() => toggleFolder(folder.id)}
                                      >
                                          <h4 className="text-emerald-400 font-bold flex items-center gap-2">
                                              {openFolders[folder.id] ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                                              <FolderOpen size={18}/> {folder.title || folder.name}
                                          </h4>
                                          <div className="flex gap-2 items-center">
                                              {/* අලුත් Add බොත්තම: මේකෙන් කෙලින්ම මේ Folder එක ඇතුළටම Content දාන්න පුළුවන් */}
                                              <button onClick={(e) => { e.stopPropagation(); setContentType(contentTab); setPrefilledFolder(folder.id); setShowContentModal(true); }} className="text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/30 px-2 py-1 rounded text-xs flex items-center gap-1 transition-all mr-2"><Plus size={12}/> Add</button>
                                              
                                              <button onClick={(e) => { e.stopPropagation(); openEditLessonGroup(folder); }} className="text-slate-500 hover:text-blue-400 p-1"><Edit3 size={14}/></button>
                                              <button onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }} className="text-slate-500 hover:text-red-400 p-1"><Trash2 size={14}/></button>
                                          </div>
                                      </div>
                                      
                                      {/* Accordion Content Area */}
                                      {openFolders[folder.id] && (
                                        <div className="space-y-2 mt-4 pl-6 ml-2 border-l-2 border-slate-700/50">
                                            {subjectContents.filter(c => isMatchedType(c) && getFolderId(c) === parseInt(folder.id)).map((content, cIndex) => (
                                                <div key={content.id || `content-${cIndex}`} className="bg-slate-800/50 p-3 rounded-xl flex justify-between items-center text-sm border border-transparent hover:border-white/10 group/item">
                                                    <span className="text-white font-medium flex items-center gap-2"><GripVertical size={14} className="text-slate-600"/> {content.title}</span>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-slate-500">{content.date ? content.date.split('T')[0] : ''}</span>
                                                        <div className="opacity-0 group-hover/item:opacity-100 flex gap-2 transition-all">
                                                            {/* View, Edit, Delete Buttons අලුතින් සම්පූර්ණ කරලා */}
                                                            <button onClick={() => setPreviewData(content)} className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white px-2 py-1 rounded text-[10px] font-bold border border-emerald-500/30 transition-colors">VIEW</button>
                                                            <button onClick={() => openEditContent(content)} className="bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white px-2 py-1 rounded transition-colors"><Edit3 size={12}/></button>
                                                            <button onClick={() => deleteContent(content.id)} className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-2 py-1 rounded transition-colors"><Trash2 size={12}/></button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {subjectContents.filter(c => isMatchedType(c) && getFolderId(c) === parseInt(folder.id)).length === 0 && <p className="text-xs text-slate-500 italic px-2 py-2">Empty Folder</p>}
                                        </div>
                                      )}
                                  </div>
                              ))}
                          </div>
                      )}

                      {/* Uncategorized Contents */}
                      <div className="mt-8">
                          <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">Uncategorized / No Folder</h4>
                          <div className="space-y-2">
                              {subjectContents.filter(c => isMatchedType(c) && !getFolderId(c)).map((content, idx) => (
                                  <div key={content.id || `uncat-${idx}`} className="bg-slate-800/50 p-3 rounded-xl flex justify-between items-center text-sm border border-transparent hover:border-white/10 group/item">
                                      <span className="text-white font-medium flex items-center gap-2"><GripVertical size={14} className="text-slate-600"/> {content.title}</span>
                                      <div className="flex items-center gap-3">
                                          <span className="text-xs text-slate-500">{content.date ? content.date.split('T')[0] : ''}</span>
                                          <div className="opacity-0 group-hover/item:opacity-100 flex gap-2 transition-all">
                                              <button onClick={() => setPreviewData(content)} className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white px-2 py-1 rounded text-[10px] font-bold border border-emerald-500/30 transition-colors">VIEW</button>
                                              <button onClick={() => openEditContent(content)} className="bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white px-2 py-1 rounded transition-colors"><Edit3 size={12}/></button>
                                              <button onClick={() => deleteContent(content.id)} className="bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white px-2 py-1 rounded transition-colors"><Trash2 size={12}/></button>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                              {subjectContents.filter(c => isMatchedType(c) && !getFolderId(c)).length === 0 && <p className="text-xs text-slate-500 italic">No uncategorized items.</p>}
                          </div>
                      </div>
                  </div>
              </div>
          )}
      </div>

      {/* ========================================== */}
      {/* 🔥 SMART PREVIEW MODAL (IFRAME) 🔥 */}
      {/* ========================================== */}
      {previewData && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                  <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                      <h3 className="text-lg font-bold text-white flex items-center gap-3"><MonitorPlay className="text-emerald-400"/> {previewData.title}</h3>
                      <div className="flex gap-3">
                          <a href={previewData.link || `http://localhost:5000/documents/${previewData.fileName}`} target="_blank" rel="noreferrer" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all">
                              <ExternalLink size={14}/> Open in Browser
                          </a>
                          <button onClick={() => setPreviewData(null)} className="text-slate-400 hover:text-red-400 bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all"><X size={20}/></button>
                      </div>
                  </div>
                  <div className="flex-1 bg-black p-4 relative flex items-center justify-center">
                      {previewData.fileName ? (
                          <iframe src={`http://localhost:5000/documents/${previewData.fileName}`} className="w-full h-full rounded-2xl bg-white" title="Document Preview" />
                      ) : previewData.link ? (
                          <iframe src={getEmbedUrl(previewData.link)} className="w-full h-full rounded-2xl bg-black border border-slate-800" title="Video/Live Preview" allowFullScreen />
                      ) : (
                          <div className="text-center text-slate-500"><Ban size={40} className="mx-auto mb-4 opacity-50"/><p>No preview available.</p></div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* ========================================== */}
      {/* 🔴 FORMS / MODALS (ADD & EDIT) 🔴 */}
      {/* ========================================== */}

      {/* 2. GROUP MODAL */}
      {showGroupModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6"><h3 className="text-2xl font-bold text-white">{editMode ? 'Edit Payment Group' : 'New Payment Group'}</h3><button onClick={() => setShowGroupModal(false)} className="text-slate-400 hover:text-white"><X size={20}/></button></div>
                <form onSubmit={handleGroupSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Group Name *</label><input type="text" name="gName" defaultValue={editData?.name} placeholder="e.g. 2026 Monthly Jan" required className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-purple-500" /></div>
                        <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Order Number</label><input type="number" name="itemOrder" defaultValue={editData?.itemOrder} className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-purple-500" /></div>
                        <div className="md:col-span-2">
                            <label className="text-sm font-semibold text-slate-300 mb-2 block">Payment Type *</label>
                            <select name="pType" defaultValue={editData?.type || ""} required onChange={(e) => { document.getElementById('discountRulesSection').style.display = e.target.value === '1' ? 'block' : 'none'; }} className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none">
                                <option value="" disabled>Select Type</option><option value="1">Full Payment</option><option value="2">Monthly Payment</option>
                            </select>
                        </div>
                    </div>
                    <div id="discountRulesSection" style={{display: editData?.type === 1 || discountRules.length > 0 ? 'block' : 'none'}} className="bg-purple-900/10 border border-purple-500/20 p-5 rounded-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <div><h4 className="font-bold text-purple-400">Bundle Discount Rules</h4><p className="text-xs text-purple-200/60 mt-1">Override normal subject prices if matched.</p></div>
                            <button type="button" onClick={addDiscountRule} className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><Plus size={14}/> Add Rule</button>
                        </div>
                        <div className="space-y-3">
                            {discountRules.map((rule, idx) => (
                                <div key={`rule-${idx}`} className="flex gap-4 items-end bg-black/20 p-3 rounded-xl border border-white/5">
                                    <div className="flex-1"><label className="text-xs text-slate-400 mb-1 block">Subject Count:</label><input type="number" value={rule.courseCount} onChange={(e) => handleDiscountRuleChange(idx, 'courseCount', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white text-sm" /></div>
                                    <div className="flex-1"><label className="text-xs text-slate-400 mb-1 block">Price per Subject:</label><input type="number" value={rule.pricePerCourse} onChange={(e) => handleDiscountRuleChange(idx, 'pricePerCourse', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white text-sm" /></div>
                                    <button type="button" onClick={() => removeDiscountRule(idx)} className="bg-red-500/20 text-red-400 p-2.5 rounded-lg hover:bg-red-500 hover:text-white"><Trash2 size={16}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl">{editMode ? 'Update Group' : 'Create Group'}</button>
                </form>
              </div>
          </div>
      )}

      {/* 3. ADD SUBJECT MODAL */}
      {showCourseModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-6"><h3 className="text-2xl font-bold text-white">{editMode ? 'Edit Subject' : 'New Subject'}</h3><button onClick={() => setShowCourseModal(false)} className="text-slate-400 hover:text-white bg-slate-800 rounded-full p-2"><X size={16}/></button></div>
                <form onSubmit={handleCourseSubmit} className="space-y-6">
                    {businessData?.category === 'AL' && (
                        <div className="bg-blue-900/10 border border-blue-500/30 p-5 rounded-2xl mb-6">
                            <label className="text-sm font-semibold text-blue-300 mb-2 block">Select A/L Stream *</label>
                            <select name="stream" defaultValue={editData?.stream || ""} required className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-blue-500">
                                <option value="" disabled>-- Select Stream --</option>
                                {getBatchStreams().map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Subject Name *</label><input type="text" name="name" defaultValue={editData?.name} required className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none" /></div>
                        <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Subject Code (Optional)</label><input type="text" name="code" defaultValue={editData?.code} className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none" /></div>
                        <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Order Number</label><input type="number" name="itemOrder" defaultValue={editData?.itemOrder} className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none" /></div>
                        <div className="md:col-span-2"><label className="text-sm font-semibold text-slate-300 mb-2 block">Description</label><textarea name="description" defaultValue={editData?.description} rows="2" className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none"></textarea></div>
                    </div>
                    <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/10 mt-6">
                        <h4 className="text-orange-400 font-bold mb-4">Assign to Groups & Pricing *</h4>
                        <div className="space-y-3">
                            {activeBatch?.groups?.length === 0 ? <p className="text-red-400 text-sm">Please create Groups first!</p> : 
                            activeBatch?.groups?.map(g => (
                                <div key={g.id} className={`flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-xl border transition-all ${selectedGroupPrices[g.id] !== undefined ? 'bg-orange-900/10 border-orange-500/50' : 'bg-black/20 border-white/5'}`}>
                                    <label className="flex items-center gap-3 cursor-pointer min-w-[250px]">
                                        <input type="checkbox" checked={selectedGroupPrices[g.id] !== undefined} onChange={() => toggleGroupPrice(g.id)} className="hidden" />
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedGroupPrices[g.id] !== undefined ? 'bg-orange-500 border-orange-500' : 'border-slate-500'}`}>{selectedGroupPrices[g.id] !== undefined && <CheckCircle size={14} className="text-white"/>}</div>
                                        <span className="text-sm font-bold text-slate-200">{g.name} <br/><span className="text-[10px] text-slate-500 font-normal">({g.type===1?'Full Payment Group':'Monthly Payment Group'})</span></span>
                                    </label>
                                    {selectedGroupPrices[g.id] !== undefined && (
                                        <div className="flex-1 w-full flex items-center gap-3 animate-in fade-in zoom-in duration-200">
                                            <div className="flex-1"><label className="text-[10px] text-slate-400 font-bold mb-1 block">{g.type === 1 ? 'Base Full Price (LKR)' : 'Monthly Fee (LKR)'}</label><input type="number" required value={selectedGroupPrices[g.id]} onChange={(e) => setGroupPrice(g.id, e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white text-sm" /></div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3.5 rounded-xl">{editMode ? 'Update Subject' : 'Save Subject to Groups'}</button>
                </form>
              </div>
          </div>
      )}

      {/* 4. ADD LESSON FOLDER MODAL */}
      {showLessonGroupModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-lg shadow-2xl">
                <div className="flex justify-between items-center mb-6"><h3 className="text-2xl font-bold text-white flex items-center gap-2"><FolderPlus className="text-emerald-400"/> {editMode ? 'Edit Folder' : 'New Folder'}</h3><button onClick={() => setShowLessonGroupModal(false)} className="text-slate-400 hover:text-white"><X size={20}/></button></div>
                <form onSubmit={handleLessonGroupSubmit} className="space-y-4">
                    <p className="text-sm text-slate-400 mb-4">Folder for <strong className="text-emerald-400 uppercase">{contentTab}</strong> section.</p>
                    <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Folder Name *</label><input type="text" name="title" defaultValue={editData?.title} required className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-emerald-500" /></div>
                    <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Order Number</label><input type="number" name="order" defaultValue={editData?.itemOrder} className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-emerald-500" /></div>
                    <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl mt-4">{editMode ? 'Update Folder' : 'Create Folder'}</button>
                </form>
              </div>
          </div>
      )}

      {/* 5. MASS ASSIGN CONTENT MODAL */}
      {showContentModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
                  <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                      <h3 className="text-2xl font-bold text-white flex items-center gap-2"><Plus className="text-emerald-400"/> {editMode ? 'Edit Content' : 'Mass Assign Content'}</h3>
                      <button onClick={() => { setShowContentModal(false); setContentType(''); setPrefilledFolder(''); setMassAssignSubjects([]); }} className="text-slate-400 hover:text-red-400 bg-white/5 p-2 rounded-full"><X size={20}/></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                      
                      <div className="mb-8 flex flex-col md:flex-row gap-6">
                          <div className="flex-1">
                              <label className="text-sm font-semibold text-emerald-400 mb-3 block uppercase tracking-wider">Select Content Category *</label>
                              <select value={contentType} onChange={e => setContentType(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-emerald-500 cursor-pointer shadow-md">
                                  <option value="" disabled>Select Type</option>
                                  <option value="live">Live Class</option><option value="recording">Recording</option>
                                  <option value="document">Document / PDF</option><option value="sPaper">Structured Paper</option><option value="paper">MCQ Paper</option>
                              </select>
                          </div>
                          
                          {contentType && (
                              <div className="flex-1 animate-in fade-in zoom-in duration-300">
                                  <label className="text-sm font-semibold text-emerald-400 mb-3 block uppercase tracking-wider">Select Target Folder (Optional)</label>
                                  <select name="contentGroupId" defaultValue={prefilledFolder} className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-emerald-500 cursor-pointer shadow-md">
                                      <option value="">-- Uncategorized (No Folder) --</option>
                                      {lessonGroups.filter(g => parseInt(g.type) === getTypeInt(contentType)).map(folder => (
                                          <option key={folder.id} value={folder.id}>📁 {folder.title || folder.name}</option>
                                      ))}
                                  </select>
                              </div>
                          )}
                      </div>

                      {contentType && (
                          <form onSubmit={handleMassAssignSubmit} className="space-y-8">
                              {/* Fields Based on Content Type */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-800/40 p-6 rounded-2xl border border-white/5">
                                  <div className="md:col-span-3">
                                      <label className="text-sm font-semibold text-slate-300 mb-2 block">Content Title *</label>
                                      <input type="text" name="title" defaultValue={editData?.title} required className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white" />
                                  </div>
                                  
                                  {(contentType === 'live' || contentType === 'recording') && (
                                      <div className="md:col-span-2">
                                          <label className="text-sm font-semibold text-slate-300 mb-2 block">Link / URL *</label>
                                          <input type="url" name="link" defaultValue={editData?.link} required className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white" />
                                      </div>
                                  )}

                                  {contentType === 'recording' && (
                                      <div className="md:col-span-1">
                                          <label className="text-sm font-semibold text-slate-300 mb-2 block">Meeting ID *</label>
                                          <input type="text" name="zoomMeetingId" defaultValue={editData?.meetingId} required className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white" />
                                      </div>
                                  )}

                                  {(contentType === 'document' || contentType === 'sPaper' || contentType === 'paper') && (
                                      <div className="md:col-span-2">
                                          <label className="text-sm font-semibold text-slate-300 mb-2 block">Upload File {editMode ? '(Optional)' : '*'}</label>
                                          <input type="file" name="file" required={!editMode} className="w-full bg-slate-800 border border-slate-600 rounded-xl p-2.5 text-slate-300" />
                                      </div>
                                  )}

                                  <div>
                                      <label className="text-sm font-semibold text-slate-300 mb-2 block">{contentType==='live'||contentType==='recording' ? 'Date':'Target Month/Date'}</label>
                                      <input type={(contentType==='document'||contentType==='sPaper'||contentType==='paper') ? "month":"date"} name="date" required className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-slate-300" />
                                  </div>

                                  {contentType === 'live' && (
                                      <>
                                          <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Start Time</label><input type="time" name="startTime" className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white" /></div>
                                          <div><label className="text-sm font-semibold text-slate-300 mb-2 block">End Time</label><input type="time" name="endTime" className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white" /></div>
                                      </>
                                  )}

                                  {contentType === 'paper' && (
                                      <>
                                          <div><label className="text-sm font-semibold text-emerald-300 mb-2 block">Paper Time (Minutes) *</label><input type="number" name="paperTime" required className="w-full bg-slate-800 border border-emerald-500/50 rounded-xl p-3 text-white" /></div>
                                          <div><label className="text-sm font-semibold text-emerald-300 mb-2 block">No of MCQs *</label><input type="number" name="questionCount" required className="w-full bg-slate-800 border border-emerald-500/50 rounded-xl p-3 text-white" /></div>
                                      </>
                                  )}
                                  
                                  <div className="md:col-span-3 mt-2">
                                      <label className="flex items-center gap-3 cursor-pointer w-max">
                                          <input type="checkbox" name="isFree" value="1" className="w-5 h-5 bg-slate-900 rounded accent-emerald-500" />
                                          <span className="text-sm font-bold text-emerald-400">Mark as FREE Content (Open for all)</span>
                                      </label>
                                  </div>
                              </div>

                              {/* Multi-Course Assignment Matrix */}
                              <div className="border-t border-slate-700 pt-8 mt-8">
                                  <h4 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><BookOpen className="text-blue-400"/> Assign to Subjects & Groups</h4>
                                  <p className="text-sm text-slate-400 mb-6">Select all the subjects across different payment groups that should receive this content. It will be added simultaneously to all checked items.</p>
                                  
                                  <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700">
                                      {activeBatch?.groups?.map((group, gIdx) => (
                                          <div key={`g-assign-${gIdx}`} className="mb-8 last:mb-0">
                                              <h5 className="text-sm font-bold text-purple-400 mb-4 border-b border-slate-700 pb-2">{group.name} <span className="text-[10px] text-slate-500 font-normal">({group.type === 1 ? 'Full' : 'Monthly'})</span></h5>
                                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                  {uniqueSubjects.filter(s => s.groupPrices.some(gp => gp.groupId === group.id)).map((course, cIdx) => {
                                                      const realCourse = group.courses?.find(c => c.name === course.name);
                                                      if(!realCourse) return null;

                                                      return (
                                                          <label key={`c-assign-${cIdx}`} className={`flex items-center gap-3 cursor-pointer p-3 rounded-xl border transition-all ${massAssignSubjects.includes(realCourse.id) ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-blue-500/50'}`}>
                                                              <input type="checkbox" checked={massAssignSubjects.includes(realCourse.id)} onChange={() => toggleMassAssignSubject(realCourse.id)} className="hidden" />
                                                              <div className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${massAssignSubjects.includes(realCourse.id) ? 'bg-blue-500 border-blue-500' : 'border-slate-500'}`}>
                                                                  {massAssignSubjects.includes(realCourse.id) && <CheckCircle size={12} className="text-white"/>}
                                                              </div>
                                                              <span className="text-sm font-semibold truncate">{realCourse.name}</span>
                                                          </label>
                                                      )
                                                  })}
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>

                              <div className="pt-6 border-t border-slate-800 flex justify-end">
                                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-10 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all">{editMode ? 'Update Content' : 'Publish Content'}</button>
                              </div>
                          </form>
                      )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}