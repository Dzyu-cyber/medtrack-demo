import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import DoctorDashboard from './pages/DoctorDashboard';
import PatientDashboard from './pages/PatientDashboard';

export default function App() {
  const [user, setUser] = useState(() => {
    try { 
      return JSON.parse(sessionStorage.getItem('medtrack_user')) || JSON.parse(localStorage.getItem('medtrack_user')); 
    }
    catch { return null; }
  });

  const login = (userData, rememberMe) => {
    setUser(userData);
    const userStr = JSON.stringify(userData);
    if (rememberMe) {
      localStorage.setItem('medtrack_user', userStr);
    } else {
      sessionStorage.setItem('medtrack_user', userStr);
    }
  };
  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('medtrack_user');
    localStorage.removeItem('medtrack_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/doctor"
            element={user?.role === 'doctor' ? <DoctorDashboard /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/patient"
            element={user?.role === 'patient' ? <PatientDashboard /> : <Navigate to="/login" replace />}
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
