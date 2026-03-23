import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// --- Web Pages ---
import Home from './web/pages/Home';

//STUDENT DASHBORD
import StudentDashboard from './pages/student/StudentDashboard';

// --- Shared imports ---
import ContentHub from './pages/manager/ContentHub';

// --- Layouts ---
import MainLayout from './layouts/MainLayout';

// --- Auth Pages ---
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// --- Admin Pages (System Admin / Director) ---
import AdminDashboard from './pages/admin/AdminDashboard';
import BusinessManager from './pages/admin/BusinessManager';
import StaffManager from './pages/admin/StaffManager';
import BatchManager from './pages/admin/BatchManager';

// --- Manager Pages (Head Manager / Ass Manager) ---
import ManagerDashboard from './pages/manager/ManagerDashboard'; 
import ManagerTimetable from './pages/manager/ManagerTimetable';
import ManagerStaff from './pages/manager/ManagerStaff';
import ManagerTasks from './pages/manager/ManagerTasks';
import ManagerPayments from './pages/manager/ManagerPayments';
import ManagerCRM from './pages/manager/ManagerCRM';
import CrmSetup from './pages/manager/CrmSetup';

// --- Coordinators imports ---
import CoordinatorDashboard from './pages/coordinator/CoordinatorDashboard';
import CoordinatorTasks from './pages/coordinator/CoordinatorTasks';
import StaffCRM from "./pages/coordinator/StaffCRM";

// --- Finance Department ---
import FinanceDashboard from './pages/finance/FinanceDashboard';
import SlipVerification from './pages/finance/SlipVerification';

function App() {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      setLoggedInUser(JSON.parse(user));
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setLoggedInUser(null);
  };

  // Role-based Default Route
  const getDefaultDashboard = (role) => {
      if(role === 'System Admin' || role === 'Director') return "/admin/dashboard";
      if(role === 'Manager' || role === 'Ass Manager') return "/manager/dashboard";
      if(role === 'Coordinator' || role === 'Staff') return "/coordinator/dashboard";
      if(role === 'Finance') return "/admin/finance";
      return "/login"; // Default
  };

  if (loading) return <div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>;

  return (
    <Router>
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: { background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', borderRadius: '16px' }
        }} 
      />

      <Routes>
        {/*  PUBLIC WEBSITE ROUTES  */}
        <Route path="/" element={<Home loggedInUser={loggedInUser} />} />

        {/*  STUDENT DASHBORD  */}
        <Route path="student/dashboard" element={<StudentDashboard />} />
        

        {/* AUTH ROUTES */}
        <Route path="/login" element={!loggedInUser ? <Login setLoggedInUser={setLoggedInUser} /> : <Navigate to={getDefaultDashboard(loggedInUser?.role)} replace />} />
        <Route path="/register" element={!loggedInUser ? <Register /> : <Navigate to={getDefaultDashboard(loggedInUser?.role)} replace />} />

        {/* PROTECTED ROUTES (MainLayout එක ඇතුලේ) */}
        <Route element={loggedInUser ? <MainLayout loggedInUser={loggedInUser} handleLogout={handleLogout} /> : <Navigate to="/login" replace />}>
          
          {/* --- ADMIN ROUTES --- */}
          <Route path="admin/dashboard" element={<AdminDashboard />} />
          <Route path="admin/businesses" element={<BusinessManager />} />
          <Route path="admin/staff" element={<StaffManager />} />
          <Route path="admin/batches/:businessId" element={<BatchManager />} />

          {/* --- MANAGER ROUTES --- */}
          <Route path="manager/dashboard" element={<ManagerDashboard />} />
          <Route path="manager/timetable" element={<ManagerTimetable />} />
          <Route path="manager/tasks" element={<ManagerTasks />} />
          <Route path="manager/staff" element={<ManagerStaff />} />
          <Route path="manager/content-hub" element={<ContentHub />} />
          <Route path="manager/payments" element={<ManagerPayments />} />
          <Route path="manager/crm" element={<ManagerCRM />} />
          <Route path="manager/crm-setup" element={<CrmSetup />} />

          {/* --- COORDINATOR ROUTES --- */}
          <Route path="coordinator/dashboard" element={<CoordinatorDashboard />} />
          <Route path="coordinator/my-tasks" element={<CoordinatorTasks />} />
          <Route path="coordinator/content-hub" element={<ContentHub />} />
          <Route path="staff/crm" element={<StaffCRM loggedInUser={loggedInUser} />} />

          {/* --- FINANCE DEPARTMENT --- */}
          <Route path="admin/finance" element={<FinanceDashboard />} />
          <Route path="admin/finance/verify" element={<SlipVerification />} />

        </Route>

        {/* Default Catch-all Route (වැරදි ලින්ක් එකකට ගියොත් Home එකට යවනවා) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;