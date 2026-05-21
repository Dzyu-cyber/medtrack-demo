import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { socket } from '../socket';
import PatientCard from '../components/PatientCard';

const DAY_MS = 86400000;
const fmt = (d) =>
  d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const toISO = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getBPClassification = (sys, dia) => {
  if (sys < 120 && dia < 80) return 'Normal';
  if (sys >= 120 && sys < 130 && dia < 80) return 'Elevated';
  if ((sys >= 130 && sys < 140) || (dia >= 80 && dia < 90)) return 'Hypertension Stage 1';
  if (sys >= 140 || dia >= 90) return 'Hypertension Stage 2';
  return 'Hypertensive Crisis';
};

const getBPColor = (sys, dia) => {
  if (sys < 120 && dia < 80) return '#00ffbc'; // Teal
  if (sys >= 120 && sys < 130 && dia < 80) return '#ffaa00'; // Orange
  if ((sys >= 130 && sys < 140) || (dia >= 80 && dia < 90)) return '#ff7700'; // Dark Orange
  return '#ff4d4d'; // Red
};

const getHeartRateClassification = (hr) => {
  if (hr < 60) return 'Bradycardia (Low)';
  if (hr <= 100) return 'Normal';
  return 'Tachycardia (High)';
};

const getHeartRateColor = (hr) => {
  if (hr < 60) return '#38bdf8'; // Blue
  if (hr <= 100) return '#00ffbc'; // Teal
  return '#ff4d4d'; // Red
};

export default function DoctorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewDate, setViewDate] = useState(new Date(today));
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected Patient Panel State
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [cabinetStock, setCabinetStock] = useState({});

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

  useEffect(() => {
    if (!selectedPatientId) {
      setCabinetStock({});
      return;
    }
    const fetchCabinetStock = async () => {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      try {
        const stockRes = await axios.get(`${apiBase}/api/medications/${selectedPatientId}/cabinet`);
        setCabinetStock(stockRes.data);
      } catch (err) {
        console.error("Failed to fetch selected patient cabinet stock", err);
      }
    };
    fetchCabinetStock();
  }, [selectedPatientId]);

  const handleApproveRefill = async (requestId, medName) => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    try {
      const { data } = await axios.post(`${apiBase}/api/medications/refill/approve`, {
        requestId
      });
      if (data.success) {
        alert(`Refill request approved successfully! ${medName} has been refilled to 30 doses.`);
        fetchPatients(viewDate);
        if (data.medicationId) {
          setCabinetStock(prev => ({
            ...prev,
            [data.medicationId]: 30
          }));
        }
      }
    } catch (err) {
      console.error("Failed to approve refill", err);
      alert("Failed to approve refill. Please try again.");
    }
  };

  // Real-time Socket.IO updates (crash-proofed mapping)
  useEffect(() => {
    const handleMedicationUpdate = ({ patientId, medicationId, date, taken }) => {
      if (date !== toISO(viewDate)) return;
      setPatients(prev =>
        prev ? prev.map(p => {
          if (String(p.id) !== String(patientId)) return p;
          const meds = p.medications || [];
          return {
            ...p,
            medications: meds.map(m =>
              String(m.id) !== String(medicationId) ? m : { ...m, taken }
            ),
          };
        }) : []
      );
    };

    const handleStockUpdate = ({ patientId, medicationId, stock }) => {
      if (selectedPatientId && String(patientId) === String(selectedPatientId)) {
        setCabinetStock(prev => ({
          ...prev,
          [medicationId]: stock
        }));
      }
    };

    const handleVitalsUpdate = ({ patientId, date, vitals }) => {
      if (date !== toISO(viewDate)) return;
      setPatients(prev =>
        prev ? prev.map(p => {
          if (String(p.id) !== String(patientId)) return p;
          return {
            ...p,
            vitals: vitals
          };
        }) : []
      );
    };

    const handleRefillRequested = () => {
      fetchPatients(viewDate);
    };

    const handleRefillApproved = ({ requestId, medicationId, patientId, stock }) => {
      fetchPatients(viewDate);
      if (selectedPatientId && String(patientId) === String(selectedPatientId)) {
        setCabinetStock(prev => ({
          ...prev,
          [medicationId]: stock
        }));
      }
    };

    const handleMedicationAssigned = ({ patientId }) => {
      fetchPatients(viewDate);
      if (selectedPatientId && String(patientId) === String(selectedPatientId)) {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        axios.get(`${apiBase}/api/medications/${selectedPatientId}/cabinet`)
          .then(res => setCabinetStock(res.data))
          .catch(console.error);
      }
    };

    socket.on('medication_updated', handleMedicationUpdate);
    socket.on('stock_updated', handleStockUpdate);
    socket.on('vitals_updated', handleVitalsUpdate);
    socket.on('refill_requested', handleRefillRequested);
    socket.on('refill_approved', handleRefillApproved);
    socket.on('medication_assigned', handleMedicationAssigned);

    return () => {
      socket.off('medication_updated', handleMedicationUpdate);
      socket.off('stock_updated', handleStockUpdate);
      socket.off('vitals_updated', handleVitalsUpdate);
      socket.off('refill_requested', handleRefillRequested);
      socket.off('refill_approved', handleRefillApproved);
      socket.off('medication_assigned', handleMedicationAssigned);
    };
  }, [viewDate, selectedPatientId, fetchPatients]);

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

  // Derived selected patient data
  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <div className="page-wrap doctor-premium-theme">
      {/* Header */}
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">💊</div>
          MedTrack
        </div>
        <div className="header-right">
          <span className="header-user">Logged in as <strong>{user?.displayName}</strong></span>
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
            <h2 style={{ color: 'white', fontWeight: '700', marginBottom: '8px' }}>Your clinic is empty</h2>
            <p style={{ color: '#94a3b8', marginBottom: '24px' }}>Get started by adding your first patient using the button below or at the top right.</p>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              ➕ Add Your First Patient
            </button>
          </div>
        ) : (
          <div className={`dashboard-layout-container ${selectedPatient ? 'panel-active' : ''}`}>
            {/* Grid of Patients */}
            <div 
              className="patients-grid" 
              style={{ 
                gridTemplateColumns: selectedPatient ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', 
                transition: 'grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
              }}
            >
              {patients.map(p => (
                <PatientCard 
                  key={p.id} 
                  patient={p} 
                  isSelected={selectedPatientId === p.id}
                  onSelect={() => setSelectedPatientId(p.id)}
                  onUpdate={() => fetchPatients(viewDate)} 
                />
              ))}
              {/* Selected Patient Detail Panel */}
            {selectedPatient && (
              <div className="patient-detail-panel" style={{ maxHeight: '82vh', overflowY: 'auto' }}>
                <div className="detail-header">
                  <div>
                    <h2 className="detail-title">{selectedPatient.name}</h2>
                    <p className="detail-subtitle">Patient File & Clinical Insights</p>
                  </div>
                  <button className="close-panel-btn" onClick={() => setSelectedPatientId(null)} title="Close Panel">
                    ✕
                  </button>
                </div>

                <div>
                  <div className="detail-section-title">📞 Demographics</div>
                  <p style={{ color: '#cbd5e1', fontSize: '0.95rem', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)', margin: 0 }}>
                    <strong>Phone:</strong> {selectedPatient.phone || 'No phone number provided'}
                  </p>
                </div>

                <div>
                  <div className="detail-section-title">📊 Adherence Summary</div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '18px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ position: 'relative', width: '70px', height: '70px', flexShrink: 0 }}>
                      <svg className="progress-svg" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                        <circle className="progress-bg-ring" cx="50" cy="50" r="40" style={{ fill: 'none', stroke: 'rgba(255, 255, 255, 0.05)', strokeWidth: '8' }} />
                        <circle 
                          cx="50" 
                          cy="50" 
                          r="40" 
                          fill="none"
                          stroke="var(--teal)"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray="251.2"
                          style={{ 
                            strokeDashoffset: 251.2 - (251.2 * Math.round(((selectedPatient.medications || []).filter(m => m.taken).length / ((selectedPatient.medications || []).length || 1)) * 100)) / 100, 
                            transition: 'stroke-dashoffset 0.6s ease' 
                          }}
                        />
                      </svg>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontWeight: '700', fontSize: '1rem' }}>
                        {selectedPatient.medications && selectedPatient.medications.length > 0 
                          ? Math.round((selectedPatient.medications.filter(m => m.taken).length / selectedPatient.medications.length) * 100)
                          : 0}%
                      </div>
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', color: 'white' }}>Daily Compliance</h4>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                        {selectedPatient.medications ? selectedPatient.medications.filter(m => m.taken).length : 0} of {selectedPatient.medications ? selectedPatient.medications.length : 0} doses tracked today
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="detail-section-title">💊 Medication Schedule & Logs</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(!selectedPatient.medications || selectedPatient.medications.length === 0) ? (
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0', margin: 0 }}>No medications assigned to this patient.</p>
                    ) : (
                      selectedPatient.medications.map(med => (
                        <div key={med.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div>
                            <span style={{ fontWeight: '600', color: 'white', display: 'block', fontSize: '0.95rem' }}>{med.name}</span>
                            <span style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginTop: '2px' }}>🕐 {med.frequency}</span>
                          </div>
                          <span style={{ 
                            padding: '4px 10px', 
                            fontSize: '0.75rem', 
                            borderRadius: '99px', 
                            fontWeight: '600',
                            background: med.taken ? 'rgba(0, 255, 188, 0.12)' : 'rgba(255, 77, 77, 0.12)',
                            color: med.taken ? '#00ffbc' : '#ff4d4d'
                          }}>
                            {med.taken ? '✓ Logged' : '✗ Pending'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
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
