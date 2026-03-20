import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Loader2, X, BookOpen, Trash2, Clock, CalendarDays, Search, ChevronDown } from 'lucide-react';
import api from '../../api/axios';

export default function ManagerTimetable() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [subjects, setSubjects] = useState([]); // Real Subjects from DB
  const [loading, setLoading] = useState(true);

  const [selectedDay, setSelectedDay] = useState(new Date().toISOString().split('T')[0]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDayViewModal, setShowDayViewModal] = useState(false); 
  
  const [scheduleForm, setScheduleForm] = useState({ subjectId: '', subjectName: '', content: '', startTime: '', endTime: '' });

  // 🔥 Searchable Dropdown States 🔥
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const batchRes = await api.get('/admin/manager/batches-full');
        setBatches(batchRes.data || []);
        if(batchRes.data && batchRes.data.length > 0) setSelectedBatch(batchRes.data[0].id);
      } catch (error) { toast.error("Failed to load data"); }
      finally { setLoading(false); }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if(!selectedBatch) return;
    
    const fetchBatchDetails = async () => {
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      
      try {
        const batchDetails = batches.find(b => b.id.toString() === selectedBatch.toString());
        let allSubjects = [];
        if (batchDetails && batchDetails.groups) {
            batchDetails.groups.forEach(g => {
                if (g.courses) {
                    g.courses.forEach(c => allSubjects.push(c));
                }
            });
        }
        setSubjects(allSubjects);

        const schedRes = await api.get(`/tasks/manager/schedule?batchId=${selectedBatch}&year=${year}&month=${month}`).catch(() => ({ data: [] }));
        setSchedules(schedRes.data || []);
      } catch (error) { console.error(error); }
    };
    fetchBatchDetails();
  }, [selectedBatch, currentDate, batches]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const handleSaveSchedule = async (e) => {
      e.preventDefault();
      if (!scheduleForm.subjectId) return toast.error("Please select a subject!");

      try {
          const payload = { 
              batchId: selectedBatch, 
              date: selectedDay, 
              subject: scheduleForm.subjectName, 
              courseId: scheduleForm.subjectId, 
              content: scheduleForm.content, 
              startTime: scheduleForm.startTime, 
              endTime: scheduleForm.endTime,
              selectedTasks: [] 
          }; 
          const res = await api.post('/tasks/manager/schedule/add', payload);
          toast.success("Class Scheduled!");
          
          setSchedules([...schedules, { id: res.data?.id || Math.random(), date: selectedDay, title: scheduleForm.subjectName, ...scheduleForm }]);
          
          closeScheduleModal();
      } catch (error) { toast.error("Failed to save schedule."); }
  };

  const handleDeleteSchedule = async (id) => {
      if(!window.confirm("Are you sure you want to delete this class? Tasks assigned to it will also be removed.")) return;
      try {
          await api.delete(`/tasks/manager/schedule/${id}`);
          setSchedules(schedules.filter(s => s.id !== id));
          toast.success("Class deleted!");
          setShowDayViewModal(false);
      } catch (error) { toast.error("Failed to delete class"); }
  };

  const openDayView = (dateString) => {
      setSelectedDay(dateString);
      setShowDayViewModal(true);
  };

  const closeScheduleModal = () => {
      setShowScheduleModal(false);
      setScheduleForm({ subjectId: '', subjectName: '', content: '', startTime: '', endTime: '' });
      setIsDropdownOpen(false);
      setSearchQuery('');
  };

  // 🔥 Filter Subjects based on search query 🔥
  const filteredSubjects = subjects.filter(sub => 
      sub.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-blue-400" /></div>;

  const daySchedulesView = schedules.filter(s => s.date === selectedDay);

  return (
    <div className="w-full text-slate-200 animate-in fade-in duration-500 relative h-full flex flex-col pb-4">
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white drop-shadow-md flex items-center gap-3">
            <CalendarIcon className="text-blue-400" size={28}/> Class Timetable
          </h2>
          <p className="text-sm text-slate-400 mt-1">Manage Subjects and Schedule Classes for Batches.</p>
        </div>
        <div className="bg-slate-800/40 border border-white/10 p-2 rounded-2xl flex items-center gap-3 shadow-lg">
           <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-3">Batch:</label>
           <select className="bg-black/30 border border-white/10 text-white text-sm rounded-xl px-4 py-2 outline-none focus:border-blue-400 cursor-pointer" value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}>
             {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
           </select>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">
          
          {/* LEFT: Big Calendar */}
          <div className="flex-1 bg-slate-800/40 border border-white/10 rounded-3xl shadow-xl flex flex-col overflow-hidden relative min-w-[60%]">
            <div className="flex justify-between items-center p-5 border-b border-white/5 bg-black/10">
                <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"><ChevronLeft size={20} className="text-blue-400" /></button>
                <h3 className="text-xl font-black text-white tracking-widest uppercase">{currentDate.toLocaleString('default', { month: 'long' })} <span className="text-blue-400">{year}</span></h3>
                <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all"><ChevronRight size={20} className="text-blue-400" /></button>
            </div>

            <div className="flex-1 flex flex-col p-4 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest py-2 bg-white/5 rounded-lg">{d}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
                    {emptyDays.map(d => <div key={`empty-${d}`} className="bg-white/5 rounded-xl border border-white/5 opacity-50"></div>)}
                    {daysArray.map(day => {
                        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                        const daySchedules = schedules.filter(s => s.date === dateString);

                        return (
                            <div key={day} onClick={() => openDayView(dateString)} className={`bg-black/20 rounded-xl border p-2 cursor-pointer transition-all group relative min-h-[90px] flex flex-col ${isToday ? 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-white/5 hover:border-blue-400/30 hover:bg-blue-900/10'}`}>
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-500 text-white' : 'text-slate-300'}`}>{day}</span>
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedDay(dateString); setShowScheduleModal(true); }} className="text-slate-500 hover:text-emerald-400 transition-colors bg-white/5 p-1 rounded-md opacity-0 group-hover:opacity-100"><Plus size={14}/></button>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-1 mt-1 pointer-events-none">
                                    {daySchedules.slice(0, 3).map(sch => (
                                        <div key={sch.id} className="text-[9px] p-1.5 rounded border bg-blue-500/20 border-blue-500/30 text-blue-200 font-bold flex flex-col">
                                            <span className="truncate">{sch.title || sch.subject}</span>
                                        </div>
                                    ))}
                                    {daySchedules.length > 3 && <span className="text-[9px] text-slate-500 text-center block">+{daySchedules.length - 3} more...</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
          </div>

          {/* RIGHT: Subjects List */}
          <div className="lg:w-[350px] w-full bg-slate-800/40 border border-white/10 rounded-3xl shadow-xl flex flex-col overflow-hidden">
              <div className="bg-black/20 p-5 border-b border-white/10">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2"><BookOpen size={16} className="text-blue-400"/> Available Subjects</h3>
                  <p className="text-[10px] text-slate-400 mt-1">Subjects are created in the Content Hub.</p>
              </div>

              <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-2">
                  {subjects.length === 0 ? <p className="text-xs text-slate-400 text-center mt-10">No subjects found for this batch.</p> : 
                      subjects.map(sub => (
                          <div key={sub.id} className="flex justify-between items-center p-3 bg-black/30 border border-white/10 rounded-xl hover:border-blue-500/30 transition-all">
                              <span className="text-sm text-white font-medium">{sub.name}</span>
                          </div>
                      ))
                  }
              </div>
          </div>
      </div>

      {/* Day View Details Modal */}
      {showDayViewModal && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
             <div className="bg-slate-900 border border-white/20 rounded-3xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                 <div className="p-5 border-b border-white/10 flex justify-between items-center bg-black/40">
                     <div>
                        <h3 className="text-white text-xl font-bold flex items-center gap-2"><CalendarDays className="text-blue-400"/> Scheduled Classes</h3>
                        <p className="text-blue-300 text-sm mt-1">{selectedDay}</p>
                     </div>
                     <button onClick={() => setShowDayViewModal(false)} className="text-slate-400 hover:text-red-400 bg-white/5 p-2 rounded-xl transition-all"><X size={20}/></button>
                 </div>
                 
                 <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
                     {daySchedulesView.length === 0 ? (
                         <div className="text-center py-10">
                            <p className="text-slate-400 text-sm">No classes scheduled for this day.</p>
                            <button onClick={() => { setShowDayViewModal(false); setShowScheduleModal(true); }} className="mt-4 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 px-4 py-2 rounded-lg text-sm font-bold transition-all">
                                + Schedule a Class Now
                            </button>
                         </div>
                     ) : (
                         daySchedulesView.map(sch => (
                             <div key={sch.id} className="p-4 bg-slate-800/50 border border-white/10 rounded-2xl flex justify-between items-start group hover:border-blue-500/50 transition-all">
                                 <div>
                                     <h4 className="text-lg font-bold text-white mb-1">{sch.subject}</h4>
                                     <p className="text-sm text-slate-300 mb-3">{sch.content}</p>
                                     <div className="flex items-center gap-3 text-xs font-bold text-blue-300 bg-blue-500/10 w-max px-3 py-1.5 rounded-lg border border-blue-500/20">
                                         <Clock size={14}/> {sch.start_time} - {sch.end_time}
                                     </div>
                                 </div>
                                 <button onClick={() => handleDeleteSchedule(sch.id)} className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white p-2.5 rounded-xl border border-red-500/20 transition-all flex items-center gap-2">
                                     <Trash2 size={16}/> <span className="text-xs font-bold hidden sm:block">Delete</span>
                                 </button>
                             </div>
                         ))
                     )}
                 </div>
             </div>
         </div>
      )}

      {/* 🔥 Add Schedule Form Modal (WITH SEARCHABLE DROPDOWN) 🔥 */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-800/90 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl w-full max-w-md p-8 relative overflow-visible">
            <button onClick={closeScheduleModal} className="absolute top-6 right-6 text-slate-400 hover:text-red-400 bg-white/5 p-1.5 rounded-xl transition-all"><X size={20} /></button>
            <h3 className="text-2xl font-bold text-white mb-1">Schedule Class</h3>
            <p className="text-blue-300 text-sm font-medium mb-6">Date: {selectedDay}</p>
            
            <form onSubmit={handleSaveSchedule} className="space-y-5">
              
              {/* SEARCHABLE CUSTOM DROPDOWN */}
              <div className="relative">
                  <label className="text-xs font-bold text-slate-300 mb-1 block">Select Subject</label>
                  <div 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white flex justify-between items-center cursor-pointer hover:border-blue-400/50 transition-all"
                  >
                      <span className={scheduleForm.subjectName ? 'text-white' : 'text-slate-500'}>
                          {scheduleForm.subjectName || "Select a subject..."}
                      </span>
                      <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}/>
                  </div>

                  {isDropdownOpen && (
                      <div className="absolute z-50 w-full mt-2 bg-slate-800 border border-white/10 rounded-xl shadow-2xl flex flex-col max-h-[250px]">
                          <div className="p-2 border-b border-white/10 bg-slate-900/50 rounded-t-xl sticky top-0">
                              <div className="flex items-center bg-black/50 rounded-lg px-3">
                                  <Search size={14} className="text-slate-400"/>
                                  <input 
                                      type="text" 
                                      placeholder="Search subjects..." 
                                      value={searchQuery}
                                      onChange={e => setSearchQuery(e.target.value)}
                                      onClick={e => e.stopPropagation()}
                                      className="w-full bg-transparent border-none p-2 text-sm text-white outline-none placeholder:text-slate-500"
                                  />
                              </div>
                          </div>
                          <div className="overflow-y-auto p-1 custom-scrollbar">
                              {filteredSubjects.length > 0 ? (
                                  filteredSubjects.map(sub => (
                                      <div 
                                          key={sub.id} 
                                          onClick={() => {
                                              setScheduleForm({...scheduleForm, subjectId: sub.id, subjectName: sub.name});
                                              setIsDropdownOpen(false);
                                              setSearchQuery('');
                                          }}
                                          className="p-3 hover:bg-blue-600/30 rounded-lg cursor-pointer text-sm text-slate-200 transition-all border border-transparent hover:border-blue-500/30"
                                      >
                                          {sub.name}
                                      </div>
                                  ))
                              ) : (
                                  <div className="p-4 text-center text-sm text-slate-500 italic">No subjects found.</div>
                              )}
                          </div>
                      </div>
                  )}
              </div>

              <div>
                  <label className="text-xs font-bold text-slate-300 mb-1 block">Class Details (Topic)</label>
                  <input required type="text" value={scheduleForm.content} onChange={e => setScheduleForm({...scheduleForm, content: e.target.value})} placeholder="E.g. Part 1 Discussion" className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="text-xs font-bold text-slate-300 mb-1 block">Start Time</label>
                      <input required type="time" value={scheduleForm.startTime} onChange={e => setScheduleForm({...scheduleForm, startTime: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-400" />
                  </div>
                  <div>
                      <label className="text-xs font-bold text-slate-300 mb-1 block">End Time</label>
                      <input required type="time" value={scheduleForm.endTime} onChange={e => setScheduleForm({...scheduleForm, endTime: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-blue-400" />
                  </div>
              </div>

              <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 text-white font-bold py-3.5 rounded-xl mt-4 shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all hover:scale-[1.02]">
                  Save Schedule
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}