import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function RightPanel({ activeLead, loggedInUser }) {
  const [lmsData, setLmsData] = useState(null);
  const [lmsLoading, setLmsLoading] = useState(false);

  // Forms State
  const [newPassword, setNewPassword] = useState('');
  const [updatingAuth, setUpdatingAuth] = useState(false);

  // Discount States for Payment Update
  const [discountAmounts, setDiscountAmounts] = useState({});

  useEffect(() => {
    const fetchLmsData = async () => {
      if (!activeLead || !activeLead.phone_number) return;
      setLmsLoading(true); setLmsData(null);
      try {
        const cleanPhone = activeLead.phone_number.replace(/\s+/g, '').replace('+', '');
        const { data } = await axios.get(`http://localhost:5000/api/bridge/student/${cleanPhone}`);
        setLmsData(data);
      } catch (error) {
        console.error("LMS Error", error);
      } finally {
        setLmsLoading(false);
      }
    };
    fetchLmsData();
  }, [activeLead]);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if(!newPassword) return toast.error("Enter a new password");
    setUpdatingAuth(true);
    const toastId = toast.loading("Updating Password...");
    try {
      await axios.post('http://localhost:5000/api/bridge/update-password', {
        user_id: lmsData.student.id,
        new_password: newPassword
      });
      toast.success("Password Updated in LMS! ✅", { id: toastId });
      setNewPassword('');
    } catch (error) {
      toast.error("Failed to update", { id: toastId });
    } finally {
      setUpdatingAuth(false);
    }
  };

  const handleDiscountChange = (enrollmentId, value) => {
    setDiscountAmounts({ ...discountAmounts, [enrollmentId]: value });
  };

  const handlePlanChange = async (enrollmentId, newPlan, currentPlan) => {
    // Return back to current plan UI if it's the same
    if (newPlan == currentPlan) return;

    if (currentPlan == 1 && newPlan == 2) {
       return toast.error("Cannot change from Full Payment back to Monthly! ❌");
    }

    if (newPlan == 1 && !window.confirm("Are you sure you want to change to Full Payment? This will delete all monthly records for this course!")) {
        // Reset the select dropdown UI to what it was
        const cleanPhone = activeLead.phone_number.replace(/\s+/g, '').replace('+', '');
        const { data } = await axios.get(`http://localhost:5000/api/bridge/student/${cleanPhone}`);
        setLmsData(data);
        return;
    }

    const discountAmount = discountAmounts[enrollmentId] || 0;
    const toastId = toast.loading("Updating Enrollment Plan & Processing Payments...");

    try {
      const response = await axios.post('http://localhost:5000/api/bridge/update-enrollment', {
        enrollment_id: enrollmentId,
        new_plan_type: newPlan,
        discount_amount: discountAmount,
        admin_user_id: loggedInUser?.id || 1 // Assuming 1 as fallback if loggedInUser not passed
      });

      if (response.data.success) {
          toast.success(response.data.message || "Plan Updated Successfully! ✅", { id: toastId });
          // Clear discount input
          setDiscountAmounts({ ...discountAmounts, [enrollmentId]: '' });
      } else {
          toast.error(response.data.message || "Failed to update", { id: toastId });
      }

      // Reload Data
      const cleanPhone = activeLead.phone_number.replace(/\s+/g, '').replace('+', '');
      const { data } = await axios.get(`http://localhost:5000/api/bridge/student/${cleanPhone}`);
      setLmsData(data);

    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to update plan", { id: toastId });
      // Reset UI on fail
      const cleanPhone = activeLead.phone_number.replace(/\s+/g, '').replace('+', '');
      const { data } = await axios.get(`http://localhost:5000/api/bridge/student/${cleanPhone}`);
      setLmsData(data);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="bg-slate-400/10 border border-slate-400/20 rounded-3xl p-5 backdrop-blur-xl shadow-xl flex-1 flex flex-col overflow-hidden">
        
        <div className="flex justify-between items-center mb-4 border-b border-slate-500/30 pb-3">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
            Student Management
          </h3>
        </div>
        
        {activeLead ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
            {lmsLoading ? (
              <div className="flex flex-col items-center justify-center mt-10">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <span className="text-blue-400 text-xs font-bold animate-pulse">Syncing with LMS...</span>
              </div>
            ) : lmsData && lmsData.found ? (
              <div className="space-y-6 animate-fade-in-down">
                
                {/* 1. Student Profile Info */}
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-600/50">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                      {lmsData.student.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-md">{lmsData.student.name}</h4>
                      <p className="text-gray-400 text-xs">LMS ID: #{lmsData.student.id} | NIC: {lmsData.student.nic}</p>
                    </div>
                  </div>
                  <div className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 w-fit">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> Active Account
                  </div>
                </div>

                {/* 2. Login Credentials Manager */}
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-600/50">
                  <h5 className="text-gray-300 font-bold text-xs mb-3 uppercase tracking-wider">Account Credentials</h5>
                  <form onSubmit={handleUpdatePassword} className="flex gap-2">
                    <input 
                      type="text" value={newPassword} onChange={e=>setNewPassword(e.target.value)} 
                      placeholder="Enter new password" 
                      className="flex-1 bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-blue-500"
                    />
                    <button type="submit" disabled={updatingAuth} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50">
                      Reset
                    </button>
                  </form>
                </div>

                {/* 3. Enrollments & Payment Plans */}
                <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-600/50">
                  <h5 className="text-gray-300 font-bold text-xs mb-3 uppercase tracking-wider">Active Enrollments</h5>
                  <div className="space-y-4">
                    {lmsData.student.courses.map((course, idx) => (
                      <div key={idx} className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-md">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h6 className="text-blue-300 font-bold text-sm">{course.course_name}</h6>
                                <p className="text-gray-400 text-[10px]">{course.batch_name} | {course.business_name}</p>
                            </div>
                            <span className="bg-slate-900 text-green-400 px-2 py-1 rounded border border-green-500/30 text-[10px] font-bold">
                                Rs. {course.course_price}
                            </span>
                        </div>
                        
                        <div className="flex flex-col gap-2 pt-3 border-t border-slate-700/50 mt-2">
                          
                          {/* Payment Plan Dropdown */}
                          <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-400">Payment Plan:</span>
                              <select 
                                className={`text-xs font-bold px-3 py-1.5 rounded outline-none border transition-colors ${course.plan_type == 1 ? 'bg-green-900/30 text-green-400 border-green-500/50' : 'bg-slate-900 text-blue-300 border-slate-600'}`}
                                value={course.plan_type}
                                onChange={(e) => handlePlanChange(course.enrollment_id, e.target.value, course.plan_type)}
                              >
                                <option value="2">Monthly Installment</option>
                                <option value="1">Full Payment</option>
                              </select>
                          </div>

                          {/* Discount Input (Only show if currently Monthly, meaning they might upgrade to Full) */}
                          {course.plan_type == 2 && (
                              <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700">
                                  <span className="text-[10px] font-bold text-gray-500">Apply Discount (Rs):</span>
                                  <input 
                                    type="number"
                                    className="w-24 bg-black text-white text-xs px-2 py-1 border border-slate-600 rounded outline-none text-right"
                                    placeholder="0"
                                    value={discountAmounts[course.enrollment_id] || ''}
                                    onChange={(e) => handleDiscountChange(course.enrollment_id, e.target.value)}
                                  />
                              </div>
                          )}

                          {/* Display current discount if plan is Full */}
                          {course.plan_type == 1 && course.current_discount > 0 && (
                              <p className="text-[10px] text-right text-warning text-yellow-500">
                                  * Discount Applied: Rs. {course.current_discount}
                              </p>
                          )}

                        </div>
                      </div>
                    ))}
                    {lmsData.student.courses.length === 0 && <p className="text-gray-500 text-xs text-center py-2">No enrollments found.</p>}
                  </div>
                </div>

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <span className="text-6xl mb-4 grayscale opacity-30">🔍</span>
                <h4 className="text-white font-bold text-lg">Not Registered</h4>
                <p className="text-gray-500 text-xs mt-2">This WhatsApp number ({activeLead.phone_number}) is not linked to any student account in the LMS.</p>
                <button className="mt-4 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-600 px-4 py-2 rounded-xl text-xs font-bold transition-all">
                  Create New Student
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center">
            <p className="text-gray-500 text-xs">Select a chat to manage student.</p>
          </div>
        )}
      </div>
    </div>
  );
}