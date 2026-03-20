import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Loader2, CheckCircle2, Circle, AlertCircle, Link as LinkIcon, Activity, TrendingUp, Image as ImageIcon, UploadCloud, BookOpen, Clock, Lock } from 'lucide-react';
import api from '../../api/axios';

export default function CoordinatorTasks() {
  const [tasks, setTasks] = useState([]);
  const [todayClasses, setTodayClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [proofInputs, setProofInputs] = useState({}); 
  const [dailyProgress, setDailyProgress] = useState(0);
  const [monthlyKPI, setMonthlyKPI] = useState(0);

  // Countdown State
  const [activeCountdown, setActiveCountdown] = useState('');

  const fetchMyTasksAndClasses = async () => {
      try {
          const overviewRes = await api.get('/tasks/coordinator/overview');
          setTodayClasses(overviewRes.data?.todayClasses || []);

          const res = await api.get('/tasks/my-tasks');
          const allTasks = res.data.tasks || [];
          const todayDate = res.data.today;

          setTasks(allTasks);

          const todayTasks = allTasks.filter(t => t.start_date && t.start_date.split('T')[0] === todayDate);
          if (todayTasks.length > 0) {
              const completedToday = todayTasks.filter(t => t.is_completed || t.manager_status === 'APPROVED').length;
              setDailyProgress(Math.round((completedToday / todayTasks.length) * 100));
          } else {
              setDailyProgress(100);
          }

          if (allTasks.length > 0) {
              const approvedTasks = allTasks.filter(t => t.manager_status === 'APPROVED').length;
              const rejectedTasks = allTasks.filter(t => t.resubmit_count > 0).length;
              let kpi = Math.round(((approvedTasks - (rejectedTasks * 2)) / allTasks.length) * 100);
              if(kpi < 0) kpi = 0;
              setMonthlyKPI(kpi);
          } else {
              setMonthlyKPI(100);
          }
      } catch (error) { console.error("Load failed"); }
      finally { setLoading(false); }
  };

  useEffect(() => { fetchMyTasksAndClasses(); }, []);

  // 🔥 100% REAL-TIME COUNTDOWN FIX 🔥
  useEffect(() => {
      const interval = setInterval(() => {
          const now = new Date();
          const currentHours = now.getHours();
          const currentMinutes = now.getMinutes();
          const currentSeconds = now.getSeconds();
          
          let needsRefresh = false;
          let nearestTaskDiff = Infinity;
          let countdownString = '';

          tasks.forEach(async (t) => {
              if (!t.is_completed && !t.is_locked && t.end_time) {
                  let [eh, em] = t.end_time.split(':').map(Number);
                  
                  // "00:00" means end of the day
                  if (eh === 0 && em === 0) { eh = 23; em = 59; }

                  const taskEndTotalSeconds = (eh * 3600) + (em * 60);
                  const currentTotalSeconds = (currentHours * 3600) + (currentMinutes * 60) + currentSeconds;

                  // 1. Lock Task if time passed
                  if (currentTotalSeconds >= taskEndTotalSeconds && currentSeconds === 0) {
                      try {
                          await api.post('/tasks/lock', { taskId: t.id });
                          new Audio('/ringtone.mp3').play().catch(()=>{});
                          toast.error(`Time's up! Task Locked: ${t.task_type}`);
                          needsRefresh = true;
                      } catch (e) {}
                  } 
                  
                  // 2. Notification at Start Time
                  if (t.start_time) {
                      let [sh, sm] = t.start_time.split(':').map(Number);
                      if (currentHours === sh && currentMinutes === sm && currentSeconds === 0 && !t.is_notified) {
                          new Audio('/ringtone.mp3').play().catch(()=>{});
                          toast(`Task Started: ${t.task_type}`, { icon: '🔔' });
                          t.is_notified = true; 
                      }
                  }

                  // 3. Exact Countdown Calculation for Active Task
                  const diffSec = taskEndTotalSeconds - currentTotalSeconds;
                  
                  // Only count down if it's currently active (Time hasn't passed)
                  if (diffSec > 0 && diffSec < nearestTaskDiff) {
                      nearestTaskDiff = diffSec;
                      const h = Math.floor(diffSec / 3600);
                      const m = Math.floor((diffSec % 3600) / 60);
                      const s = diffSec % 60;
                      countdownString = `${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
                  }
              }
          });

          setActiveCountdown(countdownString);
          if(needsRefresh) fetchMyTasksAndClasses();

      }, 1000); 

      return () => clearInterval(interval);
  }, [tasks]);

  const handleUrlChange = (taskId, val) => { setProofInputs({ ...proofInputs, [taskId]: { type: 'url', value: val } }); };
  const handleFileChange = (taskId, file) => { if(file) { setProofInputs({ ...proofInputs, [taskId]: { type: 'file', value: file } }); } };

  const handleSubmitTask = async (taskId) => {
      const proofData = proofInputs[taskId];
      if(!proofData || !proofData.value) return toast.error("Please provide a Link or File.");
      
      try {
          const formData = new FormData();
          formData.append('task_id', taskId);
          if (proofData.type === 'file') formData.append('file', proofData.value); 
          else formData.append('proof', proofData.value); 

          await api.post('/tasks/complete', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
          toast.success("Task Submitted! 🎉");
          fetchMyTasksAndClasses(); 
      } catch (error) { toast.error("Failed to submit task"); }
  };

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 size={50} className="animate-spin text-blue-400" /></div>;

  return (
    <div className="w-full text-slate-200 animate-in fade-in duration-500 h-full flex flex-col pb-4 max-w-6xl mx-auto">
      
      {/* HEADER WITH COUNTDOWN */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-black text-white drop-shadow-md flex items-center gap-3">
            <CheckCircle2 className="text-blue-400" size={32}/> My Worklist
          </h2>
          <p className="text-sm text-slate-400 mt-2 font-medium">Complete your assigned tasks and submit proofs to managers.</p>
        </div>
        
        {/* 🔥 Countdown Badge 🔥 */}
        {activeCountdown && (
             <div className="bg-red-500/10 border border-red-500/30 px-5 py-2.5 rounded-xl flex items-center gap-4 shadow-lg shrink-0">
                 <div className="bg-red-500/20 p-2 rounded-full animate-pulse"><Clock className="text-red-400" size={16}/></div>
                 <div>
                     <p className="text-[10px] text-red-300 font-bold uppercase tracking-widest">Next Deadline In</p>
                     <p className="text-lg font-black text-white tracking-wider">{activeCountdown}</p>
                 </div>
             </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-slate-800/40 border border-white/10 backdrop-blur-md p-6 rounded-2xl shadow-xl relative overflow-hidden">
              <div className="flex justify-between items-end mb-4 relative z-10">
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2"><Activity size={18}/> Daily Completion</h3>
                  <span className="text-3xl font-black text-white">{dailyProgress}%</span>
              </div>
              <div className="w-full bg-slate-900/50 rounded-full h-3 border border-white/5 overflow-hidden relative z-10">
                  <div className="bg-blue-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${dailyProgress}%` }}></div>
              </div>
          </div>
          <div className="bg-slate-800/40 border border-white/10 backdrop-blur-md p-6 rounded-2xl shadow-xl relative overflow-hidden">
              <div className="flex justify-between items-end mb-4 relative z-10">
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={18}/> Monthly KPI</h3>
                  <span className="text-3xl font-black text-white">{monthlyKPI}%</span>
              </div>
              <div className="w-full bg-slate-900/50 rounded-full h-3 border border-white/5 overflow-hidden relative z-10">
                  <div className={`h-3 rounded-full transition-all duration-1000 ${monthlyKPI >= 80 ? 'bg-emerald-500' : monthlyKPI >= 50 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${monthlyKPI}%` }}></div>
              </div>
          </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2 pb-6">
          {todayClasses.length === 0 ? (
              <div className="bg-slate-800/40 border border-white/10 rounded-2xl p-16 text-center flex flex-col items-center">
                  <AlertCircle size={50} className="text-slate-500 mb-4 opacity-50"/>
                  <h3 className="text-lg font-bold text-white mb-2">No Classes Today</h3>
                  <p className="text-slate-400 text-sm">You have a free schedule today. Enjoy your day!</p>
              </div>
          ) : (
              todayClasses.map(cls => {
                  const classTasks = tasks.filter(t => Number(t.schedule_id) === Number(cls.id));

                  return (
                      <div key={cls.id} className="bg-slate-800/40 border border-white/10 backdrop-blur-md rounded-2xl shadow-xl flex flex-col overflow-hidden">
                          
                          {/* Class Title (No Times here as requested) */}
                          <div className="p-5 border-b border-white/5">
                              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                  <BookOpen size={20} className="text-blue-400"/> {cls.subject}
                              </h3>
                              <p className="text-xs text-slate-400 mt-1">{cls.content}</p>
                          </div>

                          <div className="p-5 space-y-4">
                              {classTasks.length === 0 ? <p className="text-center text-sm text-slate-500 italic">No tasks assigned for this class.</p> : (
                                  classTasks.map(task => {
                                      const isPending = task.manager_status === 'PENDING' || task.manager_status === 'REJECTED';
                                      const isWaiting = task.manager_status === 'WAITING_APPROVAL';
                                      const isApproved = task.manager_status === 'APPROVED';
                                      const currentProof = proofInputs[task.id];

                                      return (
                                          <div key={task.id} className={`p-5 rounded-xl border transition-all ${task.is_locked ? 'bg-red-950/20 border-red-900/50' : task.manager_status === 'APPROVED' ? 'bg-emerald-900/20 border-emerald-500/30' : task.manager_status === 'REJECTED' ? 'bg-red-900/20 border-red-500/40' : 'bg-slate-900/40 border-white/10'}`}>
                                              
                                              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-4 gap-3">
                                                  <div className="flex flex-wrap items-center gap-3">
                                                      {task.is_locked ? <Lock size={18} className="text-red-500"/> : task.manager_status === 'APPROVED' ? <CheckCircle2 size={18} className="text-emerald-400"/> : isPending ? <Circle size={18} className="text-slate-500"/> : <Clock size={18} className="text-orange-400"/>}
                                                      <h4 className="text-base font-bold text-white">{task.task_type}</h4>
                                                      
                                                      {/* 🔥 SHOWING TASK TIME RANGE HERE 🔥 */}
                                                      {task.start_time && task.end_time && (
                                                          <span className="text-[10px] font-bold text-slate-300 bg-black/40 border border-white/10 px-2 py-1 rounded-md ml-1 tracking-widest flex items-center">
                                                              <Clock size={10} className="mr-1 opacity-70"/> {task.start_time} - {task.end_time}
                                                          </span>
                                                      )}
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                      {task.resubmit_count > 0 && <span className="bg-orange-500/20 text-orange-400 text-[10px] font-bold px-2 py-1 rounded uppercase">Penalty Mark</span>}
                                                      {task.is_locked && <span className="bg-red-500/20 text-red-500 text-[10px] font-bold px-2 py-1 rounded uppercase shadow-inner">Locked</span>}
                                                      {isWaiting && <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-1 rounded uppercase shadow-inner">Waiting Approval</span>}
                                                      {isApproved && <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded uppercase shadow-inner">Approved</span>}
                                                  </div>
                                              </div>

                                              {task.manager_status === 'REJECTED' && task.reject_reason && (
                                                  <div className="mb-4 bg-red-500/10 border border-red-500/30 p-3 rounded-lg flex items-start gap-3 backdrop-blur-sm">
                                                      <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0"/>
                                                      <div>
                                                          <p className="text-[10px] text-red-300 font-bold mb-1 uppercase tracking-wider">Manager Feedback:</p>
                                                          <p className="text-sm text-red-100">{task.reject_reason}</p>
                                                      </div>
                                                  </div>
                                              )}

                                              {task.is_locked && (
                                                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-start gap-3 mt-4">
                                                      <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5"/>
                                                      <p className="text-xs text-red-200">This task has been locked because the deadline passed. Please contact the manager to get another chance.</p>
                                                  </div>
                                              )}

                                              {isPending && !task.is_locked && (
                                                  <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-4 border-t border-white/5">
                                                      <div className="flex-1 flex items-center bg-black/30 border border-white/10 rounded-lg px-3 focus-within:border-blue-400 transition-all shadow-inner">
                                                          <LinkIcon size={16} className="text-blue-400 mr-2"/>
                                                          <input type="url" disabled={currentProof?.type === 'file'} placeholder="Paste Link here..." className="w-full bg-transparent text-sm text-white py-2.5 outline-none placeholder:text-slate-500 disabled:opacity-50" value={currentProof?.type === 'url' ? currentProof.value : ''} onChange={(e) => handleUrlChange(task.id, e.target.value)} />
                                                      </div>
                                                      <span className="text-[10px] font-bold text-slate-500 uppercase self-center">OR</span>
                                                      <div className={`flex-1 flex items-center border rounded-lg px-3 transition-all relative overflow-hidden ${currentProof?.type === 'file' ? 'bg-blue-900/30 border-blue-500/50' : 'bg-black/30 border-white/10'}`}>
                                                          <ImageIcon size={16} className={currentProof?.type === 'file' ? 'text-blue-400 mr-2' : 'text-slate-400 mr-2'}/>
                                                          <span className={`text-xs py-2.5 truncate pr-4 ${currentProof?.type === 'file' ? 'text-blue-300 font-bold' : 'text-slate-500'}`}>{currentProof?.type === 'file' ? currentProof.value.name : 'Upload Screenshot / PDF...'}</span>
                                                          <input type="file" disabled={currentProof?.type === 'url' && currentProof.value.length > 0} accept="image/*,.pdf" onChange={(e) => handleFileChange(task.id, e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                                      </div>
                                                      <button onClick={() => handleSubmitTask(task.id)} className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shrink-0"><UploadCloud size={16}/> Submit</button>
                                                  </div>
                                              )}
                                          </div>
                                      );
                                  })
                              )}
                          </div>
                      </div>
                  );
              })
          )}
      </div>
    </div>
  );
}