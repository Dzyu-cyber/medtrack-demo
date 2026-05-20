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

  // Add Patient Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [patName, setPatName] = useState('');
  const [patPhone, setPatPhone] = useState('');
  const [patUsername, setPatUsername] = useState('');
  const [patPassword, setPatPassword] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

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

  const handleAddPatientSubmit = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const { data } = await axios.post(`${apiUrl}/api/patients`, {
        name: patName.trim(),
        phone: patPhone.trim() || null,
        username: patUsername.trim(),
        password: patPassword,
        doctorId: user.userId
      });

      if (data.id) {
        // Success
        setPatName('');
        setPatPhone('');
        setPatUsername('');
        setPatPassword('');
        setShowAddModal(false);
        fetchPatients(viewDate);
      }
    } catch (err) {
      setModalError(err.response?.data?.error || err.response?.data?.message || 'Failed to register patient. Username might be taken.');
    } finally {
      setModalLoading(false);
    }
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
          <button id="add-patient-header-btn" className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            ➕ Add Patient
          </button>
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
          <div className="empty-state" style={{ maxWidth: '500px', margin: '40px auto' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🏥</div>
            <h2 style={{ color: 'var(--navy)', fontWeight: '700', marginBottom: '8px' }}>Your clinic is empty</h2>
            <p style={{ color: 'var(--gray-600)', marginBottom: '24px' }}>Get started by adding your first patient using the button below or at the top right.</p>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              ➕ Add Your First Patient
            </button>
          </div>
        ) : (
          <div className="patients-grid">
            {patients.map(p => (
              <PatientCard key={p.id} patient={p} onUpdate={() => fetchPatients(viewDate)} />
            ))}
          </div>
        )}
      </main>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Register New Patient</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddPatientSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="modal-pat-name">Patient Full Name</label>
                  <input
                    id="modal-pat-name"
                    type="text"
                    placeholder="Alice Miller"
                    value={patName}
                    onChange={e => setPatName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="modal-pat-phone">Phone Number</label>
                  <input
                    id="modal-pat-phone"
                    type="tel"
                    placeholder="9876543210"
                    value={patPhone}
                    onChange={e => setPatPhone(e.target.value)}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="modal-pat-username">Patient Username</label>
                    <input
                      id="modal-pat-username"
                      type="text"
                      placeholder="alice_m"
                      value={patUsername}
                      onChange={e => setPatUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="modal-pat-pass">Create Password</label>
                    <input
                      id="modal-pat-pass"
                      type="text"
                      placeholder="alicepass"
                      value={patPassword}
                      onChange={e => setPatPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {modalError && (
                  <div className="login-error" style={{ marginTop: '5px' }}>
                    ⚠️ {modalError}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowAddModal(false)}
                  disabled={modalLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={modalLoading}
                >
                  {modalLoading ? 'Creating Patient…' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
