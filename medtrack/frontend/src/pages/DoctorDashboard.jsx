import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { socket } from '../socket';
import PatientCard from '../components/PatientCard';

const DAY_MS = 86400000;
const fmt = (d) =>
  d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const toISO = (d) => d.toISOString().split('T')[0];

export default function DoctorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewDate, setViewDate] = useState(new Date(today));
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPatients = useCallback(async (date) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/patients`, {
        params: { doctorId: user.userId, date: toISO(date) },
      });
      setPatients(data);
    } catch (e) {
      console.error('Failed to fetch patients', e);
    } finally {
      setLoading(false);
    }
  }, [user.userId]);

  useEffect(() => { fetchPatients(viewDate); }, [viewDate, fetchPatients]);

  // Real-time Socket.IO updates
  useEffect(() => {
    const handler = ({ patientId, medicationId, date, taken }) => {
      if (date !== toISO(viewDate)) return;
      setPatients(prev =>
        prev.map(p =>
          p.id !== patientId ? p : {
            ...p,
            medications: p.medications.map(m =>
              m.id !== medicationId ? m : { ...m, taken }
            ),
          }
        )
      );
    };
    socket.on('medication_updated', handler);
    return () => socket.off('medication_updated', handler);
  }, [viewDate]);

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  const changeDate = (delta) => {
    setViewDate(prev => {
      const next = new Date(prev.getTime() + delta * DAY_MS);
      return next;
    });
  };

  const isToday = toISO(viewDate) === toISO(today);
  const minDate = new Date(today.getTime() - 7 * DAY_MS);
  const maxDate = new Date(today.getTime() + 7 * DAY_MS);

  return (
    <div className="page-wrap">
      {/* Header */}
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">💊</div>
          MedTrack
        </div>
        <div className="header-right">
          <span className="header-user">Logged in as <strong>{user.displayName}</strong></span>
          <button id="doctor-logout-btn" className="btn btn-outline" onClick={handleLogout}>
            ↩ Logout
          </button>
        </div>
      </header>

      {/* Date Navigator */}
      <div className="date-nav">
        <button
          id="date-prev-btn"
          className="date-nav-btn"
          onClick={() => changeDate(-1)}
          disabled={viewDate <= minDate}
          aria-label="Previous day"
        >‹</button>
        <span className="date-nav-label">
          {fmt(viewDate)}
          {isToday && <span className="date-nav-today">Today</span>}
        </span>
        <button
          id="date-next-btn"
          className="date-nav-btn"
          onClick={() => changeDate(1)}
          disabled={viewDate >= maxDate}
          aria-label="Next day"
        >›</button>
      </div>

      {/* Content */}
      <main className="dashboard-body">
        {loading ? (
          <div className="loading-wrap">
            <div className="spinner" />
            <span>Loading patient data…</span>
          </div>
        ) : patients.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: '2.5rem' }}>🏥</div>
            <p>No patients found for this doctor.</p>
          </div>
        ) : (
          <div className="patients-grid">
            {patients.map(p => (
              <PatientCard key={p.id} patient={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
