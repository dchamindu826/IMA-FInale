import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Loader2, X, Clock, CheckCircle2, Circle, ListTodo, AlertCircle, XCircle, Eye, Trash2, CalendarDays, TrendingUp, Edit3, Unlock } from 'lucide-react';
import api from '../../api/axios';

export default function ManagerTasks() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [loading, setLoading] = useState(true);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split('T')[0]);
  const [dayClasses, setDayClasses] = useState([]); 
  const [selectedClass, setSelectedClass] = useState(null);

  const [taskTemplates, setTaskTemplates] = useState([]);
  const [newTaskForm, setNewTaskForm] = useState({ id: null, title: '', has_time_limit: false, start_date: '', deadline_date: '', start_time: '', end_time: '' });

  const [assignedTasks, setAssignedTasks] = useState([]); 
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [staffProgress, setStaffProgress] = useState(0); 
  const [previewModal, setPreviewModal] = useState({ isOpen: false, url: '', title: '' });

  const fetchData = async () => {
      setLoading(true);
      try {
          const batchRes = await api.get('/admin/manager/batches-full'); 
          if(batchRes.data && batchRes.data.length > 0) {
              setBatches(batchRes.data);
              setSelectedBatch(batchRes.data[0].id);
          }
      } catch (e) { console.error("Batches Error"); }

      try {
          const tempRes = await api.get('/tasks/manager/templates');
          setTaskTemplates(tempRes.data?.tasks || []);
      } catch (e) { console.error("Template Error"); }

      await fetchApprovalsAndStats();
      setLoading(false);
  };

  const fetchApprovalsAndStats = async () => {
      try {
          const res = await api.get('/tasks/manager/approvals');
          setPendingApprovals(res.data.tasks || []);
          setStaffProgress(res.data.successRate || 0);
      } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
      if(!selectedBatch) return;
      const fetchClasses = async () => {
          const month = currentDate.getMonth() + 1;
          const year = currentDate.getFullYear();
          try {
              const res = await api.get(`/tasks/manager/schedule?batchId=${selectedBatch}&year=${year}&month=${month}`);
              const todayClasses = res.data.filter(c => c.date === selectedDay);
              setDayClasses(todayClasses);
              if(todayClasses.length > 0) { setSelectedClass(todayClasses[0]); } 
              else { setSelectedClass(null); setAssignedTasks([]); }
          } catch(e) {}
      };
      fetchClasses();
  }, [selectedBatch, selectedDay, currentDate]);

  const fetchAssignedTasksForClass = async () => {
      if(!selectedClass) return;
      try {
          const res = await api.get(`/tasks/manager/schedule/${selectedClass.id}/tasks`);
          setAssignedTasks(res.data || []);
      } catch (e) {}
  };

  useEffect(() => { fetchAssignedTasksForClass(); }, [selectedClass]);

  const handleApprove = async (id) => {
      setPendingApprovals(prev => prev.filter(task => String(task.id) !== String(id)));
      try {
          await api.post('/tasks/manager/approvals/approve', { taskId: id });
          toast.success("Task Approved!");
          await fetchApprovalsAndStats(); 
          await fetchAssignedTasksForClass(); 
      } catch(e) { toast.error("Failed to approve"); await fetchApprovalsAndStats(); }
  };

  const handleReject = async (id) => {
      const reason = window.prompt("Reason for rejection:");
      if(!reason) return;
      setPendingApprovals(prev => prev.filter(task => String(task.id) !== String(id)));
      try {
          await api.post('/tasks/manager/approvals/reject', { taskId: id, reason });
          toast.error("Task Rejected.");
          await fetchApprovalsAndStats(); 
          await fetchAssignedTasksForClass(); 
      } catch(e) { toast.error("Failed to reject"); await fetchApprovalsAndStats(); }
  };

  const handleUnlockTask = async (taskId) => {
      if(!window.confirm("Unlock this task? This will add a penalty mark to the coordinator.")) return;
      try {
          await api.post('/tasks/manager/approvals/unlock', { taskId });
          toast.success("Task Unlocked with Penalty!");
          fetchAssignedTasksForClass();
          fetchApprovalsAndStats();
      } catch (error) { toast.error("Failed to unlock"); }
  };

  const handleSaveTaskTemplate = async (e) => {
      e.preventDefault();
      try {
          const res = await api.post('/tasks/manager/task-templates/add', newTaskForm);
          setTaskTemplates([...taskTemplates, res.data]);
          toast.success("Task Template Added!");
          setNewTaskForm({ id: null, title: '', has_time_limit: false, start_date: '', deadline_date: '', start_time: '', end_time: '' });
      } catch (error) { toast.error("Failed to save template"); }
  };

  const handleAssignTask = async (taskTpl) => {
      if(!selectedClass) return toast.error("Select a class first!");
      try {
          const res = await api.post(`/tasks/manager/schedule/${selectedClass.id}/tasks`, { taskTpl });
          setAssignedTasks([...assignedTasks, res.data]);
          toast.success("Task Assigned!");
      } catch (e) { toast.error("Failed to assign task"); }
  };

  const handleRemoveAssignedTask = async (taskId) => {
      if(!window.confirm("Remove this task?")) return;
      try {
          await api.delete(`/tasks/manager/tasks/${taskId}`);
          setAssignedTasks(assignedTasks.filter(t => String(t.id) !== String(taskId)));
          toast.success("Task Removed!");
      } catch (e) { toast.error("Failed to remove task"); }
  };

  const handleDeleteTaskTemplate = async (id) => {
      if(!window.confirm("Delete this Template?")) return;
      try {
          await api.delete(`/tasks/manager/task-templates/${id}`);
          setTaskTemplates(taskTemplates.filter(t => t.id !== id));
          toast.success("Deleted!");
      } catch (error) { toast.error("Failed to delete template"); }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 size={50} className="animate-spin text-blue-500" /></div>;

  return (
    <div className="w-full text-slate-200 animate-in fade-in duration-500 h-full flex flex-col font-sans pb-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-3">
            <ListTodo className="text-white" size={32}/> Task Workflow & Approvals
          </h2>
          <p className="text-sm text-slate-400 mt-2 font-medium">Manage Task Lists, Assign to Classes, and Review Submissions.</p>
        </div>
        <div className="bg-slate-800/60 border border-white/10 p-2.5 rounded-xl flex items-center gap-3 backdrop-blur-md">
           <label className="text-xs font-bold text-slate-400 ml-2 uppercase tracking-widest">BATCH:</label>
           <select className="bg-slate-900/50 border border-white/10 text-white text-sm font-semibold rounded-lg px-4 py-2 outline-none cursor-pointer" value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}>
             {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
           </select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 overflow-hidden">
          
          {/* COLUMN 1: CALENDAR & CLASS */}
          <div className="bg-slate-800/40 border border-white/10 rounded-2xl flex flex-col p-6 overflow-hidden backdrop-blur-md">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2"><CalendarDays size={16} className="text-blue-400"/> SELECT CLASS DATE</h3>
              <input type="date" value={selectedDay} onChange={e => setSelectedDay(e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 text-sm text-white font-bold outline-none mb-6" />
              
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">CLASSES ON {selectedDay}</h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                  {dayClasses.length === 0 ? <p className="text-sm text-slate-500 text-center py-10 bg-slate-900/30 rounded-xl border border-white/5">No classes scheduled.</p> : 
                      dayClasses.map(cls => (
                          <div key={cls.id} onClick={() => setSelectedClass(cls)} className={`p-5 rounded-xl border cursor-pointer transition-all ${selectedClass?.id === cls.id ? 'bg-blue-600/10 border-blue-500' : 'bg-slate-900/40 border-white/10 hover:border-white/30'}`}>
                              <h4 className="text-lg font-bold text-white mb-1">{cls.subject}</h4>
                              <p className="text-xs text-slate-400 mb-3">{cls.content}</p>
                              <span className="text-xs font-bold text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-md border border-blue-500/20"><Clock size={12} className="inline mr-2"/>{cls.start_time} - {cls.end_time}</span>
                              
                              {selectedClass?.id === cls.id && (
                                  <div className="mt-5 pt-4 border-t border-white/10">
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">ASSIGNED TASKS:</p>
                                      {assignedTasks.length === 0 ? <p className="text-xs text-slate-500">No tasks assigned.</p> : 
                                          <div className="space-y-2">
                                              {assignedTasks.map(at => {
                                                  const isApproved = at.manager_status === 'APPROVED';
                                                  const isWaiting = at.manager_status === 'WAITING_APPROVAL';

                                                  return (
                                                      <div key={at.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-900/50 border border-emerald-500/30">
                                                          <div className="flex items-center gap-2 pl-1">
                                                              {isApproved ? <CheckCircle2 size={14} className="text-emerald-400"/> : isWaiting ? <Clock size={14} className="text-orange-400"/> : <CheckCircle2 size={14} className="text-emerald-500"/>}
                                                              <span className="text-xs font-bold text-white">{at.task_type}</span>
                                                          </div>
                                                          <div className="flex gap-2 items-center">
                                                              {at.is_locked && <button onClick={(e) => { e.stopPropagation(); handleUnlockTask(at.id); }} className="text-orange-400 hover:text-orange-300 p-1 rounded flex items-center transition-all"><Unlock size={12} className="mr-1"/><span className="text-[9px] font-bold uppercase">Give Chance</span></button>}
                                                              <button onClick={(e) => { e.stopPropagation(); handleRemoveAssignedTask(at.id); }} className="text-slate-500 hover:text-red-400 p-1 transition-all"><Trash2 size={14}/></button>
                                                          </div>
                                                      </div>
                                                  );
                                              })}
                                          </div>
                                      }
                                  </div>
                              )}
                          </div>
                      ))
                  }
              </div>
          </div>

          {/* COLUMN 2: TASK DEFINITIONS */}
          <div className="bg-slate-800/40 border border-white/10 rounded-2xl flex flex-col p-6 overflow-hidden backdrop-blur-md">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2"><ListTodo size={16} className="text-emerald-400"/> TASK DEFINITIONS</h3>
              
              <form onSubmit={handleSaveTaskTemplate} className="bg-slate-900/40 p-5 rounded-xl border border-white/10 mb-6 space-y-4">
                  <input required type="text" placeholder="e.g. Upload Zoom Recording" value={newTaskForm.title} onChange={e => setNewTaskForm({...newTaskForm, title: e.target.value})} className="w-full bg-slate-900/80 border border-emerald-500/50 rounded-lg p-3 text-sm text-white outline-none" />
                  
                  <label className="flex items-center gap-3 text-sm font-bold text-slate-300 cursor-pointer bg-slate-800/50 p-3 rounded-lg border border-white/5">
                      <input type="checkbox" className="w-4 h-4 accent-emerald-500" checked={newTaskForm.has_time_limit} onChange={e => setNewTaskForm({...newTaskForm, has_time_limit: e.target.checked})} />
                      Set specific time limits (Optional)
                  </label>

                  {newTaskForm.has_time_limit && (
                      <div className="grid grid-cols-2 gap-3 p-4 bg-slate-900/60 rounded-lg border border-white/10">
                          <div><label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1.5">Start Date</label><input type="date" value={newTaskForm.start_date} onChange={e => setNewTaskForm({...newTaskForm, start_date: e.target.value})} className="w-full bg-slate-800/80 border border-white/10 rounded-md p-2 text-xs text-white outline-none" /></div>
                          <div><label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1.5">End Date</label><input type="date" value={newTaskForm.deadline_date} onChange={e => setNewTaskForm({...newTaskForm, deadline_date: e.target.value})} className="w-full bg-slate-800/80 border border-white/10 rounded-md p-2 text-xs text-white outline-none" /></div>
                          <div><label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1.5">Start Time</label><input type="time" value={newTaskForm.start_time} onChange={e => setNewTaskForm({...newTaskForm, start_time: e.target.value})} className="w-full bg-slate-800/80 border border-white/10 rounded-md p-2 text-xs text-white outline-none" /></div>
                          <div><label className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1.5">End Time</label><input type="time" value={newTaskForm.end_time} onChange={e => setNewTaskForm({...newTaskForm, end_time: e.target.value})} className="w-full bg-slate-800/80 border border-white/10 rounded-md p-2 text-xs text-white outline-none" /></div>
                      </div>
                  )}

                  <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold py-3 rounded-lg transition-all shadow-lg">
                      Add to Templates
                  </button>
              </form>

              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
                  {taskTemplates.map(task => (
                      <div key={task.id} className="p-4 bg-slate-900/40 border border-white/5 rounded-xl flex flex-col">
                          <div className="flex justify-between items-start mb-3">
                              <span className="text-sm font-bold text-white">{task.title}</span>
                              <button onClick={() => handleDeleteTaskTemplate(task.id)} className="text-slate-500 hover:text-red-400 transition-all"><Trash2 size={14}/></button>
                          </div>
                          <button onClick={() => handleAssignTask(task)} disabled={!selectedClass} className="w-full bg-slate-800/80 hover:bg-slate-700 border border-blue-500/30 text-white text-xs font-bold py-2 rounded-lg transition-all disabled:opacity-50">
                              + Assign to Selected Class
                          </button>
                      </div>
                  ))}
              </div>
          </div>

          {/* COLUMN 3: APPROVALS */}
          <div className="flex flex-col gap-6 overflow-hidden">
              <div className="bg-slate-800/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
                  <div className="flex justify-between items-end mb-3">
                      <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={16}/> STAFF SUCCESS RATE</h3>
                      <span className="text-3xl font-black text-white">{staffProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-900/80 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${staffProgress}%` }}></div>
                  </div>
              </div>

              <div className="bg-red-950/20 border border-red-900/30 rounded-t-xl p-5 backdrop-blur-md">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2"><AlertCircle size={18} className="text-orange-400"/> Pending Approvals</h3>
                  <p className="text-xs text-slate-400 mt-1">Review submissions from the staff.</p>
              </div>

              <div className="flex-1 p-5 overflow-y-auto custom-scrollbar space-y-4 bg-slate-800/20 rounded-b-xl border border-t-0 border-white/5 backdrop-blur-md">
                  {pendingApprovals.length === 0 ? (
                      <div className="text-center py-10 bg-slate-900/40 border border-white/5 rounded-xl">
                          <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2 opacity-50"/>
                          <p className="text-xs text-slate-400 font-bold">All caught up!</p>
                      </div>
                  ) : (
                      pendingApprovals.map((task) => (
                          <div key={task.id} className="p-4 rounded-xl border bg-slate-900/50 border-white/10">
                              {task.resubmit_count > 0 && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded border border-red-500/40 font-bold uppercase mb-2 inline-block">Resubmitted</span>}
                              
                              <h4 className="text-sm font-bold text-white mb-1">{task.task_type}</h4>
                              <p className="text-xs text-slate-400 font-medium mb-4">Coordinator ID: {task.staff_id}</p>
                              
                              <button onClick={() => setPreviewModal({ isOpen: true, url: task.submitted_proof || '', title: task.task_type })} className="w-full mb-3 py-2 bg-slate-800/80 border border-white/10 text-blue-400 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-all">
                                  <Eye size={14}/> Preview Proof
                              </button>

                              <div className="flex gap-2">
                                  <button onClick={() => handleApprove(task.id)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2 rounded-lg flex justify-center gap-2"><CheckCircle2 size={14}/> APPROVE</button>
                                  <button onClick={() => handleReject(task.id)} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-2 rounded-lg flex justify-center gap-2"><XCircle size={14}/> REJECT</button>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      </div>

      {/* PREVIEW MODAL */}
      {previewModal.isOpen && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
             <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                 <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-800/80">
                     <h3 className="text-sm text-white font-bold flex items-center gap-2"><Eye className="text-blue-400" size={18}/> {previewModal.title}</h3>
                     <button onClick={() => setPreviewModal({ isOpen: false, url: '', title: '' })} className="text-slate-400 hover:text-white bg-slate-900 p-1.5 rounded-lg transition-all"><X size={18}/></button>
                 </div>
                 <div className="flex-1 bg-white relative">
                     {previewModal.url ? (
                         <iframe src={previewModal.url.includes('drive.google') ? previewModal.url.replace('view', 'preview') : previewModal.url} className="w-full h-full border-none" title="preview" allowFullScreen></iframe>
                     ) : (
                         <div className="text-center text-slate-500 mt-20">No preview available.</div>
                     )}
                 </div>
             </div>
         </div>
      )}

    </div>
  );
}