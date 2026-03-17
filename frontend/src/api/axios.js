import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // ඔයාගේ Node.js Backend URL එක
});

// හැම Request එකක්ම යද්දි LocalStorage එකේ තියෙන Token එක අරන් යවන්න මේක උදව් වෙනවා
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;