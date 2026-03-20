import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Loader2, FolderOpen, Layers, BookOpen, MonitorPlay, Plus, Edit3, Trash2, Ban, Video, FileText, CheckCircle, ChevronRight, X, ArrowLeft, GripVertical, FileSignature, Link as LinkIcon, ExternalLink } from 'lucide-react';
import api from '../../api/axios';

export default function ContentHub({ userRole }) {
  const [loading, setLoading] = useState(true);
  const isManager = userRole === 'Manager' || userRole === 'System Admin' || true; // Set to true for dev, adjust later

  // --- Drill-down States ---
  const [viewLevel, setViewLevel] = useState('batches'); 
  const [activeBatch, setActiveBatch] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  const [activeCourse, setActiveCourse] = useState(null);
  const [courseTab, setCourseTab] = useState(1); // 1 = Theory, 2 = Paper

  // --- Real Data States ---
  const [businessId, setBusinessId] = useState(null); 
  const [batches, setBatches] = useState([]); 
  const [contents, setContents] = useState([]); 

  // --- Modals State (ALL BUTTONS FIXED) ---
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  
  const [previewData, setPreviewData] = useState(null);

  // --- Form & Edit States ---
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState(null);
  
  const [contentTab, setContentTab] = useState('live'); 
  const [contentType, setContentType] = useState('');
  const [activeTabBatch, setActiveTabBatch] = useState(null); 
  const [selectedCourses, setSelectedCourses] = useState([]); 
  const [mcqCount, setMcqCount] = useState(0); 

  const fetchAllData = async () => {
      setLoading(true);
      try {
          const overviewRes = await api.get('/admin/manager/overview');
          if (overviewRes.data && overviewRes.data.business) setBusinessId(overviewRes.data.business.id);

          const batchRes = await api.get('/admin/manager/batches-full');
          const fetchedBatches = batchRes.data || [];
          setBatches(fetchedBatches);
          
          if(fetchedBatches.length > 0 && !activeTabBatch) setActiveTabBatch(fetchedBatches[0].id);

          if (activeBatch) {
              const updatedBatch = fetchedBatches.find(b => b.id.toString() === activeBatch.id.toString());
              if (updatedBatch) {
                  setActiveBatch(updatedBatch);
                  if (activeGroup) {
                      const updatedGroup = updatedBatch.groups.find(g => g.id.toString() === activeGroup.id.toString());
                      if (updatedGroup) {
                          setActiveGroup(updatedGroup);
                          if(activeCourse) {
                              const updatedCourse = updatedGroup.courses.find(c => c.id.toString() === activeCourse.id.toString());
                              if(updatedCourse) setActiveCourse(updatedCourse);
                          }
                      }
                  }
              }
          }
      } catch (e) { console.error(e); } 
      finally { setLoading(false); }
  };

  useEffect(() => { fetchAllData(); }, []);

  // --- Navigation Handlers ---
  const openGroups = (batch) => { setActiveBatch(batch); setViewLevel('groups'); };
  const openCourses = (group) => { setActiveGroup(group); setViewLevel('courses'); setCourseTab(1); };
  
  const openContents = async (course) => { 
      setActiveCourse(course); setViewLevel('contents'); setLoading(true);
      try {
          const res = await api.get(`/admin/manager/courses/${course.id}/contents`);
          setContents(res.data || []);
      } catch (e) { toast.error("Failed to load contents"); setContents([]); } 
      finally { setLoading(false); }
  };

  const handleBack = (level) => {
      setViewLevel(level);
      if(level === 'batches') { setActiveBatch(null); setActiveGroup(null); setActiveCourse(null); }
      if(level === 'groups') { setActiveGroup(null); setActiveCourse(null); }
      if(level === 'courses') { setActiveCourse(null); }
  };

  const handleCourseCheckbox = (courseId) => {
      if (selectedCourses.includes(courseId)) setSelectedCourses(selectedCourses.filter(id => id !== courseId));
      else setSelectedCourses([...selectedCourses, courseId]);
  };

  const getEmbedUrl = (url) => {
      if (!url) return '';
      if (url.includes('youtube.com/watch?v=')) return url.replace('watch?v=', 'embed/');
      if (url.includes('youtu.be/')) return url.replace('youtu.be/', 'youtube.com/embed/');
      if (url.includes('drive.google.com') && url.includes('/view')) return url.replace('/view', '/preview');
      return url; 
  };

  // ==========================================
  // 🔥 ACTIONS & SUBMITS 🔥
  // ==========================================

  // Open Modals
  const openAddBatch = () => { setEditMode(false); setEditData(null); setShowBatchModal(true); };
  const openAddGroup = () => { setEditMode(false); setEditData(null); setShowGroupModal(true); };
  const openAddCourse = () => { setEditMode(false); setEditData(null); setShowCourseModal(true); };
  const openAddContent = () => { setEditMode(false); setEditData(null); setShowContentModal(true); };

  const openEditBatch = (b) => { setEditData(b); setEditMode(true); setShowBatchModal(true); };
  const openEditGroup = (g) => { setEditData(g); setEditMode(true); setShowGroupModal(true); };
  const openEditCourse = (c) => { setEditData(c); setEditMode(true); setShowCourseModal(true); };
  
  const handleBatchSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      formData.append('business_id', businessId);
      if(editMode) formData.append('batch_id', editData.id);

      try {
          if (editMode) await api.put('/admin/batch/update', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
          else await api.post('/admin/batch/add', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
          toast.success(editMode ? "Batch Updated!" : "Batch Created!");
          setShowBatchModal(false); fetchAllData();
      } catch (error) { toast.error("Action Failed"); }
  };

  const handleGroupSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const payload = { group_id: editData?.id, gName: formData.get('gName'), pType: formData.get('pType'), batch_id: activeBatch.id, itemOrder: formData.get('itemOrder'), installmentCount: 0 };
      try {
          if (editMode) await api.put('/admin/group/update', payload);
          else await api.post('/admin/group/add', payload);
          toast.success(editMode ? "Group Updated!" : "Group Added!");
          setShowGroupModal(false); fetchAllData();
      } catch (error) { toast.error("Action Failed"); }
  };

  const handleCourseSubmit = async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const payload = {
          course_id: editData?.id, group: formData.get('group'), courseType: formData.get('courseType'), code: formData.get('code'),
          name: formData.get('name'), description: formData.get('description'), itemOrder: formData.get('itemOrder'),
          price: formData.get('price'), reqDiscount: formData.get('reqDiscount') === 'on', discountPrice: formData.get('discountPrice') || 0
      };
      try {
          if(editMode) await api.put('/admin/course/update', payload);
          else await api.post('/admin/course/add', payload);
          toast.success(editMode ? "Subject Updated!" : "Subject Added!");
          setShowCourseModal(false); fetchAllData();
      } catch (error) { toast.error("Action Failed"); }
  };

  const handleContentSubmit = async (e) => {
      e.preventDefault();
      if (!editMode && selectedCourses.length === 0) return toast.error("Select at least one course.");
      
      const formData = new FormData(e.target);
      formData.append('type', contentType);
      formData.append('selectedCourses', JSON.stringify(selectedCourses));

      try {
          await api.post('/admin/manager/contents/mass-assign', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
          toast.success("Content Added Successfully!");
          setShowContentModal(false); setContentType(''); setSelectedCourses([]);
          if(activeCourse) openContents(activeCourse); 
      } catch (error) { toast.error("Failed to save content."); }
  };

  const deleteBatch = async (id) => { if(window.confirm("Delete this Batch?")) { try { await api.delete('/admin/batch/delete', { data: { batch_id: id } }); toast.success("Deleted!"); fetchAllData(); } catch(e) { toast.error("Error"); } } };
  const deleteGroup = async (id) => { if(window.confirm("Delete this Group?")) { try { await api.delete('/admin/group/delete', { data: { group_id: id } }); toast.success("Deleted!"); fetchAllData(); } catch(e) { toast.error("Error"); } } };
  const deleteCourse = async (id) => { if(window.confirm("Delete this Subject?")) { try { await api.delete('/admin/course/delete', { data: { course_id: id } }); toast.success("Deleted!"); fetchAllData(); } catch(e) { toast.error("Error"); } } };
  const deleteContent = async (id) => { if(window.confirm("Delete this Content?")) { try { await api.delete('/admin/content/delete', { data: { content_id: id } }); toast.success("Deleted!"); openContents(activeCourse); } catch(e) { toast.error("Error"); } } };

  const changeBatchStatus = async (id, currentStatus) => { try { await api.put('/admin/batch/status', { batch_id: id, status: currentStatus === 1 ? 0 : 1 }); toast.success("Status Updated"); fetchAllData(); } catch(e){} };
  const changeCourseStatus = async (id, currentStatus) => { try { await api.put('/admin/course/status', { course_id: id, status: currentStatus === 1 ? 0 : 1 }); toast.success("Status Updated"); fetchAllData(); } catch(e){} };

  const getTypeInt = (tabStr) => { switch(tabStr) { case 'live': return 1; case 'recording': return 2; case 'document': return 3; case 'sPaper': return 4; case 'paper': return 5; default: return 1; } };

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 size={50} className="animate-spin text-blue-500" /></div>;

  return (
    <div className="w-full text-slate-200 animate-in fade-in duration-500 h-full flex flex-col font-sans pb-4">
      
      {/* 🔴 HEADER & BREADCRUMBS (CLEAN UI) 🔴 */}
      <div className="mb-6 bg-slate-900/50 border border-white/5 p-6 rounded-2xl shadow-lg flex flex-col gap-4 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-400">
              {viewLevel !== 'batches' && <button onClick={() => handleBack(viewLevel==='groups' ? 'batches' : viewLevel==='courses' ? 'groups' : 'courses')} className="hover:text-blue-400 flex items-center gap-1 bg-white/5 px-3 py-1 rounded-lg transition-colors"><ArrowLeft size={14}/> Back</button>}
              <button onClick={() => handleBack('batches')} className={`hover:text-white transition-colors ${viewLevel==='batches' ? 'text-white font-bold' : ''}`}>Content Hub</button>
              {activeBatch && <><ChevronRight size={14} className="text-slate-600"/> <button onClick={() => handleBack('groups')} className={`hover:text-white transition-colors ${viewLevel==='groups' ? 'text-white font-bold' : ''}`}>{activeBatch.name}</button></>}
              {activeGroup && <><ChevronRight size={14} className="text-slate-600"/> <button onClick={() => handleBack('courses')} className={`hover:text-white transition-colors ${viewLevel==='courses' ? 'text-white font-bold' : ''}`}>{activeGroup.name}</button></>}
              {activeCourse && <><ChevronRight size={14} className="text-slate-600"/> <span className="text-blue-400 font-bold">{activeCourse.name}</span></>}
          </div>

          <div className="flex flex-wrap justify-between items-center gap-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  {viewLevel === 'batches' && <><FolderOpen className="text-blue-500"/> Manage Batches</>}
                  {viewLevel === 'groups' && <><Layers className="text-purple-500"/> {activeBatch?.name}</>}
                  {viewLevel === 'courses' && <><BookOpen className="text-orange-500"/> Subjects for {activeGroup?.name}</>}
                  {viewLevel === 'contents' && <><MonitorPlay className="text-emerald-500"/> {activeCourse?.name} Contents</>}
              </h2>

              <div className="flex flex-wrap gap-3">
                  {isManager && (
                      <>
                          {viewLevel === 'batches' && <button onClick={openAddBatch} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shadow-md"><Plus size={16}/> New Batch</button>}
                          {viewLevel === 'groups' && <button onClick={openAddGroup} className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-md transition-all"><Plus size={16}/> New Group</button>}
                          {viewLevel === 'courses' && <button onClick={openAddCourse} className="bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-md transition-all"><Plus size={16}/> New Subject</button>}
                      </>
                  )}
                  {viewLevel === 'contents' && <button onClick={openAddContent} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-md transition-all"><Plus size={16}/> Add Content</button>}
              </div>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
          
          {/* 🔴 LEVEL 1: BATCHES 🔴 */}
          {viewLevel === 'batches' && (
              batches.length === 0 ? <p className="text-center text-slate-500 py-10 bg-slate-900/30 rounded-2xl border border-white/5">No batches available.</p> : 
              batches.map(batch => (
                  <div key={batch.id} className="bg-slate-800/60 border border-white/5 hover:border-blue-500/30 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 transition-all shadow-sm">
                      <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-sm">
                              <img src={batch.logo ? `http://localhost:5000/storage/icons/${batch.logo}` : '/logo.png'} onError={(e) => { e.target.onerror = null; e.target.src = '/logo.png'; }} alt="Logo" className="max-w-full max-h-full object-contain" />
                          </div>
                          <div>
                              <h3 className="text-lg font-bold text-white flex items-center gap-2">{batch.name} {batch.status===0 && <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Disabled</span>}</h3>
                              <p className="text-sm text-slate-400 mt-1 font-medium">{batch.type === 1 ? 'Theory Only' : batch.type === 2 ? 'Paper Only' : 'Theory & Paper'}</p>
                          </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                          <button onClick={() => openGroups(batch)} className="bg-blue-600/10 hover:bg-blue-600/30 text-blue-400 border border-blue-500/20 px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"><ChevronRight size={16}/> View Groups</button>
                          {isManager && (
                              <>
                                <button onClick={() => openEditBatch(batch)} className="bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"><Edit3 size={14}/> Edit</button>
                                <button onClick={() => changeBatchStatus(batch.id, batch.status)} className="bg-white/5 hover:bg-orange-500/20 text-slate-300 hover:text-orange-400 border border-white/10 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all">{batch.status === 1 ? <Ban size={14}/> : <CheckCircle size={14}/>} {batch.status === 1 ? 'Disable' : 'Enable'}</button>
                                <button onClick={() => deleteBatch(batch.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"><Trash2 size={14}/> Delete</button>
                              </>
                          )}
                      </div>
                  </div>
              ))
          )}

          {/* 🔴 LEVEL 2: GROUPS 🔴 */}
          {viewLevel === 'groups' && (
              activeBatch?.groups?.length === 0 ? <p className="text-center text-slate-500 py-10 bg-slate-900/30 rounded-2xl border border-white/5">No groups found.</p> : 
              activeBatch?.groups?.map((group) => (
                  <div key={group.id} className="bg-slate-800/60 border-l-4 border-l-purple-500 border border-white/5 hover:border-purple-500/30 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 transition-all shadow-sm">
                      <div className="flex items-center gap-4">
                          <div className="cursor-move text-slate-600 hover:text-slate-400"><GripVertical size={20}/></div>
                          <div>
                            <h3 className="text-lg font-bold text-white">{group.name}</h3>
                            <p className="text-sm text-slate-400 mt-1 font-medium">Payment Type: <span className="text-purple-300">{group.type === 1 ? 'Full Payment' : 'Monthly Payment'}</span></p>
                          </div>
                      </div>
                      <div className="flex gap-2">
                          <button onClick={() => openCourses(group)} className="bg-purple-600/10 hover:bg-purple-600/30 text-purple-400 border border-purple-500/20 px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"><ChevronRight size={16}/> View Subjects</button>
                          {isManager && (
                              <>
                                  <button onClick={() => openEditGroup(group)} className="bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"><Edit3 size={14}/> Edit</button>
                                  <button onClick={() => deleteGroup(group.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"><Trash2 size={14}/> Delete</button>
                              </>
                          )}
                      </div>
                  </div>
              ))
          )}

          {/* 🔴 LEVEL 3: COURSES (SUBJECTS) 🔴 */}
          {viewLevel === 'courses' && (
              <div className="flex flex-col h-full">
                  <div className="flex gap-2 mb-5">
                      <button onClick={() => setCourseTab(1)} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${courseTab === 1 ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-800/50 text-slate-400 hover:text-white border border-white/5'}`}><MonitorPlay size={18}/> Theory Subjects</button>
                      <button onClick={() => setCourseTab(2)} className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${courseTab === 2 ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-800/50 text-slate-400 hover:text-white border border-white/5'}`}><FileText size={18}/> Paper Subjects</button>
                  </div>
                  <div className="space-y-3 bg-slate-900/30 p-5 rounded-2xl border border-white/5">
                      {activeGroup?.courses?.filter(c => c.type === courseTab).length === 0 ? <p className="text-center text-slate-500 py-10">No {courseTab === 1 ? 'Theory' : 'Paper'} subjects found.</p> : 
                      activeGroup?.courses?.filter(c => c.type === courseTab).map((course, index) => (
                          <div key={course.id} className="bg-slate-800 border border-white/5 hover:border-orange-500/30 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm transition-all">
                              <div className="flex items-center gap-4">
                                  <div className="cursor-move text-slate-600 hover:text-slate-400"><GripVertical size={20}/></div>
                                  <div>
                                    <h3 className="text-base font-bold text-white flex items-center gap-2">{course.name} {course.status===0 && <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded font-bold">Disabled</span>}</h3>
                                    <p className="text-sm text-slate-400 mt-1 font-medium">Price: <span className="text-emerald-400">LKR {course.price}</span></p>
                                  </div>
                              </div>
                              <div className="flex gap-2 items-center">
                                  <span className="text-xs font-semibold text-slate-500 mr-4">Order: {course.itemOrder || index + 1}</span>
                                  <button onClick={() => openContents(course)} className="bg-orange-600/10 hover:bg-orange-600/30 text-orange-400 border border-orange-500/20 px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"><ChevronRight size={16}/> Contents</button>
                                  {isManager && (
                                      <>
                                          <button onClick={() => openEditCourse(course)} className="bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"><Edit3 size={14}/></button>
                                          <button onClick={() => changeCourseStatus(course.id, course.status)} className="bg-white/5 hover:bg-orange-500/20 text-slate-300 hover:text-orange-400 border border-white/10 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"><Ban size={14}/></button>
                                          <button onClick={() => deleteCourse(course.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"><Trash2 size={14}/></button>
                                      </>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {/* 🔴 LEVEL 4: CONTENTS 🔴 */}
          {viewLevel === 'contents' && (
              <div className="bg-slate-900/30 border border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-xl min-h-[400px]">
                  <div className="flex overflow-x-auto custom-scrollbar border-b border-white/5 bg-slate-800/80 p-3 gap-3">
                      {[
                          { id: 'live', label: 'Live Classes', icon: Video }, { id: 'recording', label: 'Recordings', icon: MonitorPlay },
                          { id: 'document', label: 'Documents', icon: FileText }, { id: 'sPaper', label: 'Structured Papers', icon: FileSignature }, { id: 'paper', label: 'MCQ', icon: CheckCircle }
                      ].map(tab => (
                          <button key={tab.id} onClick={() => setContentTab(tab.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${contentTab === tab.id ? 'bg-emerald-600 text-white shadow-md' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}>
                              <tab.icon size={16}/> {tab.label}
                          </button>
                      ))}
                  </div>
                  <div className="p-6 space-y-3 overflow-y-auto">
                      {contents.filter(c => c.type === getTypeInt(contentTab)).length === 0 ? (
                          <p className="text-center text-slate-500 py-10 font-medium">No {contentTab} content found. Click "Add New Content" above.</p>
                      ) : (
                          contents.filter(c => c.type === getTypeInt(contentTab)).map((content, index) => (
                              <div key={content.id} className="p-5 bg-slate-800 border border-white/5 rounded-2xl flex justify-between items-center group hover:border-emerald-500/30 transition-all shadow-sm">
                                  <div className="flex items-center gap-5">
                                      <div className="cursor-move text-slate-600 hover:text-slate-400"><GripVertical size={18}/></div>
                                      <div>
                                          <h4 className="text-white font-bold text-base">{content.title}</h4>
                                          <p className="text-sm text-slate-400 mt-1 font-medium">
                                              {content.date ? content.date.split('T')[0] : 'No Date'} {content.startTime && ` | ${content.startTime} - ${content.endTime}`}
                                          </p>
                                      </div>
                                  </div>
                                  <div className="flex gap-2 items-center">
                                      <span className="text-xs font-semibold text-slate-500 mr-4">Order: {content.itemOrder || index + 1}</span>
                                      
                                      <button onClick={() => setPreviewData(content)} className="bg-emerald-600/10 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all">
                                          <MonitorPlay size={14}/> View
                                      </button>
                                      
                                      <button onClick={() => openEditContent(content)} className="bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 px-4 py-2 rounded-xl transition-all"><Edit3 size={14}/></button>
                                      <button onClick={() => deleteContent(content.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-4 py-2 rounded-xl transition-all"><Trash2 size={14}/></button>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          )}
      </div>

      {/* ========================================== */}
      {/* 🔥 SMART PREVIEW MODAL 🔥 */}
      {/* ========================================== */}
      {previewData && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                  <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                      <h3 className="text-lg font-bold text-white flex items-center gap-3"><MonitorPlay className="text-blue-400"/> {previewData.title}</h3>
                      <div className="flex gap-3">
                          <a href={previewData.link || `http://localhost:5000/documents/${previewData.fileName}`} target="_blank" rel="noreferrer" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all">
                              <ExternalLink size={14}/> Open in Browser
                          </a>
                          <button onClick={() => setPreviewData(null)} className="text-slate-400 hover:text-red-400 bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all"><X size={20}/></button>
                      </div>
                  </div>
                  <div className="flex-1 bg-black p-4 relative flex items-center justify-center">
                      {previewData.fileName ? (
                          <iframe src={`http://localhost:5000/documents/${previewData.fileName}`} className="w-full h-full rounded-2xl bg-white" title="PDF Preview" />
                      ) : previewData.link ? (
                          <iframe src={getEmbedUrl(previewData.link)} className="w-full h-full rounded-2xl bg-black border border-slate-800" title="Video Preview" allowFullScreen />
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

      {/* 1. BATCH MODAL */}
      {showBatchModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-4xl shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-white">{editMode ? 'Edit Batch' : 'Add New Batch'}</h3>
                    <button onClick={() => setShowBatchModal(false)} className="text-slate-400 hover:text-white bg-slate-800 rounded-full p-2"><X size={16}/></button>
                </div>
                <form onSubmit={handleBatchSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Batch Name *</label><input type="text" name="name" defaultValue={editData?.name} required className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-blue-500" /></div>
                        <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Batch Logo {editMode ? '(Optional)' : '*'}</label><input type="file" name="logo" required={!editMode} className="w-full bg-slate-800 border border-slate-600 rounded-xl p-2.5 text-slate-300 outline-none" /></div>
                        <div>
                            <label className="text-sm font-semibold text-slate-300 mb-2 block">Batch Type *</label>
                            <select name="batchType" defaultValue={editData?.type || "1"} className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none"><option value="1">Theory Only</option><option value="2">Paper Only</option><option value="3">Theory & Paper</option></select>
                        </div>
                        <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Batch Description</label><textarea name="description" defaultValue={editData?.description} rows="3" className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none"></textarea></div>
                    </div>
                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg">{editMode ? 'Update Batch' : 'Create Batch'}</button>
                </form>
              </div>
          </div>
      )}

      {/* 2. GROUP MODAL */}
      {showGroupModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-4xl shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-white">{editMode ? 'Edit Group' : 'Add New Group'}</h3>
                    <button onClick={() => setShowGroupModal(false)} className="text-slate-400 hover:text-white bg-slate-800 rounded-full p-2"><X size={16}/></button>
                </div>
                <form onSubmit={handleGroupSubmit} className="space-y-6">
                    <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Group Name *</label><input type="text" name="gName" defaultValue={editData?.name} required className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-blue-500" /></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-semibold text-slate-300 mb-2 block">Payment Type *</label>
                            <select name="pType" defaultValue={editData?.type || ""} required className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none"><option value="" disabled>Select Type</option><option value="1">Full</option><option value="2">Monthly</option></select>
                        </div>
                        <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Group Order</label><input type="number" name="itemOrder" defaultValue={editData?.itemOrder} className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-blue-500" /></div>
                    </div>
                    <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg">{editMode ? 'Update Group' : 'Create Group'}</button>
                </form>
              </div>
          </div>
      )}

      {/* 3. COURSE MODAL */}
      {showCourseModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-5xl shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-white">{editMode ? 'Edit Subject' : 'Add New Subject'}</h3>
                    <button onClick={() => setShowCourseModal(false)} className="text-slate-400 hover:text-white bg-slate-800 rounded-full p-2"><X size={16}/></button>
                </div>
                <form onSubmit={handleCourseSubmit} className="space-y-6 overflow-y-auto max-h-[70vh] pr-2 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-semibold text-slate-300 mb-2 block">Select Group *</label>
                            <select name="group" defaultValue={editData?.group_id || ""} required className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none">
                                <option value="" disabled>Select Group</option>
                                {activeBatch?.groups?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-slate-300 mb-2 block">Subject Type *</label>
                            <select name="courseType" defaultValue={editData?.type || ""} required className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none">
                                <option value="" disabled>Select Type</option><option value="1">Theory</option><option value="2">Paper</option>
                            </select>
                        </div>
                        <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Subject Name *</label><input type="text" name="name" defaultValue={editData?.name} required className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-blue-500" /></div>
                        <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Subject Code *</label><input type="text" name="code" defaultValue={editData?.code} required className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-blue-500" /></div>
                        <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Description</label><textarea name="description" defaultValue={editData?.description} rows="4" className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none"></textarea></div>
                        <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Subject Order</label><input type="number" name="itemOrder" defaultValue={editData?.itemOrder} className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none" /></div>
                    </div>
                    <div className="pt-6 border-t border-slate-700 mt-6">
                        <h4 className="text-base font-bold text-white mb-4">Payment Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div><label className="text-sm font-semibold text-slate-300 mb-2 block">Price *</label><input type="number" name="price" defaultValue={editData?.price} required className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-blue-500" /></div>
                            <div>
                                <label className="flex items-center gap-2 text-sm font-semibold text-white mb-3 cursor-pointer">
                                    <input type="checkbox" name="reqDiscount" defaultChecked={editData?.needForDiscount} className="w-5 h-5 bg-slate-800 border-slate-500 rounded accent-blue-500" /> Required for Discount
                                </label>
                                <label className="text-sm font-semibold text-slate-300 mb-2 block">Discounted Price</label>
                                <input type="number" name="discountPrice" defaultValue={editData?.discountedPrice} className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-blue-500" />
                            </div>
                        </div>
                    </div>
                    <button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-8 rounded-xl mt-6 transition-all shadow-lg">{editMode ? 'Update Subject' : 'Create Subject'}</button>
                </form>
              </div>
          </div>
      )}

      {/* 4. CONTENT MODAL (Mass Assignment or Edit) */}
      {showContentModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
             <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                 <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                     <h3 className="text-2xl font-bold text-white">{editMode ? 'Edit Content' : 'Add New Content'}</h3>
                     <button onClick={() => { setShowContentModal(false); setContentType(''); setEditMode(false); }} className="text-slate-400 hover:text-white bg-slate-800 rounded-full p-2"><X size={16}/></button>
                 </div>
                 <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                     {!editMode && (
                         <div className="mb-8">
                             <label className="text-sm font-semibold text-slate-300 mb-2 block">Content Type</label>
                             <select value={contentType} onChange={e => setContentType(e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-blue-500">
                                 <option value="" disabled>Select Type</option>
                                 <option value="live">Live Class</option><option value="recording">Recording</option>
                                 <option value="document">Document / PDF</option><option value="paper">MCQ / Structured Paper</option>
                             </select>
                         </div>
                     )}

                     {contentType && (
                         <form onSubmit={handleContentSubmit} className="space-y-8">
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-800/30 p-6 rounded-2xl border border-white/5">
                                 <div className="md:col-span-3">
                                     <label className="text-sm font-semibold text-slate-300 mb-2 block">Title *</label>
                                     <input type="text" name="title" defaultValue={editData?.title} required className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-blue-500" />
                                 </div>
                                 
                                 <div className="md:col-span-2">
                                     <label className="text-sm font-semibold text-slate-300 mb-2 block">{contentType === 'document' ? 'Upload File' : 'Insert URL'} *</label>
                                     {contentType === 'document' ? 
                                        <input type="file" name="file" required={!editMode} className="w-full bg-slate-800 border border-slate-600 rounded-xl p-2.5 text-slate-300 outline-none" /> :
                                        <input type="url" name="link" defaultValue={editData?.link} required className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-blue-500" />
                                     }
                                 </div>
                                 
                                 <div>
                                     <label className="text-sm font-semibold text-slate-300 mb-2 block">Date</label>
                                     <input type={contentType==='document' ? "month":"date"} name="date" defaultValue={editData?.date ? editData.date.split('T')[0] : ''} required className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-slate-300 outline-none focus:border-blue-500" />
                                 </div>
                                 
                                 {(contentType === 'live' || contentType === 'recording') && (
                                     <>
                                         <div className="md:col-span-1"><label className="text-sm font-semibold text-slate-300 mb-2 block">Start Time</label><input type="time" name="startTime" defaultValue={editData?.startTime} className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none" /></div>
                                         <div className="md:col-span-1"><label className="text-sm font-semibold text-slate-300 mb-2 block">End Time</label><input type="time" name="endTime" defaultValue={editData?.endTime} className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none" /></div>
                                     </>
                                 )}
                             </div>

                             {contentType === 'paper' && !editMode && (
                                 <div className="border-t border-slate-700 pt-6">
                                     <div className="md:w-1/3 mb-5">
                                         <label className="text-sm font-semibold text-slate-300 mb-2 block">No of MCQs</label>
                                         <input type="number" onChange={(e) => setMcqCount(parseInt(e.target.value) || 0)} required className="w-full bg-slate-800 border border-slate-600 rounded-xl p-3 text-white outline-none focus:border-blue-500" />
                                     </div>
                                     {mcqCount > 0 && (
                                         <div className="bg-slate-900/50 p-5 rounded-2xl max-h-60 overflow-y-auto custom-scrollbar border border-slate-700">
                                             <div className="flex justify-between text-sm font-bold text-slate-300 mb-4 border-b border-slate-700 pb-2"><span className="w-1/4">Question</span><span className="w-3/4 text-center">Answers</span></div>
                                             {Array.from({ length: mcqCount }).map((_, i) => (
                                                 <div key={i} className="flex justify-between items-center mb-3">
                                                     <div className="w-1/4 font-bold text-white text-center bg-slate-800 py-1.5 rounded-lg border border-slate-700">{i + 1}</div>
                                                     <div className="w-3/4 flex justify-around">
                                                         {[1, 2, 3, 4, 5].map(ans => (
                                                             <label key={ans} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name={`q${i+1}[]`} value={ans} className="w-4 h-4 bg-slate-800 accent-emerald-500 rounded" /><span className="text-sm font-semibold text-slate-400">{ans}</span></label>
                                                         ))}
                                                     </div>
                                                 </div>
                                             ))}
                                         </div>
                                     )}
                                 </div>
                             )}
                             
                             {!editMode && (
                                 <div className="mt-8 border-t border-slate-700 pt-8">
                                     <h2 className="text-xl font-bold text-white mb-6">Select Applicable Subjects</h2>
                                     <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
                                         {batches.map(batch => (
                                             <button key={batch.id} type="button" onClick={() => setActiveTabBatch(batch.id)} className={`px-5 py-2.5 rounded-xl font-bold text-sm border flex items-center gap-2 transition-all whitespace-nowrap shadow-sm ${activeTabBatch === batch.id ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'}`}>
                                                 {batch.name}
                                             </button>
                                         ))}
                                     </div>
                                     <div className="bg-slate-900/50 rounded-2xl p-6 border border-slate-700">
                                         {batches.find(b => b.id === activeTabBatch)?.groups?.map(group => (
                                             <div key={group.id} className="mb-8 last:mb-0">
                                                 <h4 className="text-sm font-bold text-slate-300 mb-4 border-b border-slate-700 pb-2">{group.name}</h4>
                                                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                     {group.courses?.map(course => (
                                                         <label key={course.id} className="flex items-center gap-3 cursor-pointer group/lbl bg-slate-800 p-3 rounded-xl border border-slate-700 hover:border-blue-500/50 transition-all">
                                                             <input type="checkbox" checked={selectedCourses.includes(course.id)} onChange={() => handleCourseCheckbox(course.id)} className="w-5 h-5 bg-slate-900 border-slate-600 rounded accent-blue-500" />
                                                             <span className="text-sm font-semibold text-slate-300 group-hover/lbl:text-white">{course.name}</span>
                                                         </label>
                                                     ))}
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                 </div>
                             )}
                             <div className="pt-6"><button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg">{editMode ? 'Update Content' : 'Add Content'}</button></div>
                         </form>
                     )}
                 </div>
             </div>
         </div>
      )}

    </div>
  );
}