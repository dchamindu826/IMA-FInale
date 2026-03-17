import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layouts
import MainLayout from './layouts/MainLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import BusinessManager from './pages/admin/BusinessManager';
import StaffManager from './pages/admin/StaffManager'; // 🔥 Staff Manager එක Import කරගන්න

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
        {/* PUBLIC ROUTES */}
        <Route path="/login" element={!loggedInUser ? <Login setLoggedInUser={setLoggedInUser} /> : <Navigate to="/admin/dashboard" replace />} />
        <Route path="/register" element={!loggedInUser ? <Register /> : <Navigate to="/admin/dashboard" replace />} />

        {/* PROTECTED ADMIN ROUTES */}
        <Route path="/admin" element={loggedInUser ? <MainLayout loggedInUser={loggedInUser} handleLogout={handleLogout} /> : <Navigate to="/login" replace />}>
          {/* මෙතන තමා ඔක්කොම Pages ටික ලෝඩ් වෙන්නේ */}
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="businesses" element={<BusinessManager />} />
          <Route path="staff" element={<StaffManager />} /> {/* 🔥 Staff Manage Route එක හරියටම දැම්මා */}
        </Route>

        {/* Default Catch-all Route */}
        <Route path="*" element={<Navigate to={loggedInUser ? "/admin/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;