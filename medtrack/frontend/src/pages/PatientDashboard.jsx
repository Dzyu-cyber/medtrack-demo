import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MedicationItem from '../components/MedicationItem';
import { socket } from '../socket';

const toISO = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};
const fmtDate = (d) =>
  d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateStr = toISO(today);

  // States
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [patientName, setPatientName] = useState(user.displayName);
  const [cabinetStock, setCabinetStock] = useState({});
  const [doctor, setDoctor] = useState(null);
  const [weeklyTrendData, setWeeklyTrendData] = useState([]);

  // Vitals & Notes States
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [dailyNotes, setDailyNotes] = useState('');
  const [notesSuccess, setNotesSuccess] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);

  const fetchDashboardData = async () => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    try {
      // 1. Fetch Medications
      const medsRes = await axios.get(`${apiBase}/api/medications/${user.userId}`, {
        params: { date: dateStr }
      });
      setPatientName(medsRes.data.name);
      setMeds(medsRes.data.medications);

      // 2. Fetch Cabinet Stock
      const stockRes = await axios.get(`${apiBase}/api/medications/${user.userId}/cabinet`);
      setCabinetStock(stockRes.data);

      // 3. Fetch Assigned Doctor
      try {
        const docRes = await axios.get(`${apiBase}/api/patients/${user.userId}/doctor`);
        setDoctor(docRes.data);
      } catch (err) {
        console.warn("No doctor assigned yet.");
      }

      // 4. Fetch Weekly Adherence
      try {
        const trendRes = await axios.get(`${apiBase}/api/patients/${user.userId}/weekly-adherence`, {
          params: { date: dateStr }
        });
        setWeeklyTrendData(trendRes.data);
      } catch (err) {
        console.error("Failed to load adherence history", err);
      }

      // 5. Fetch Daily Vitals
      try {
        const vitalsRes = await axios.get(`${apiBase}/api/patients/${user.userId}/vitals`, {
          params: { date: dateStr }
        });
        if (vitalsRes.data) {
          setSystolic(vitalsRes.data.systolic || '');
          setDiastolic(vitalsRes.data.diastolic || '');
          setHeartRate(vitalsRes.data.heart_rate || '');
          setDailyNotes(vitalsRes.data.notes || '');
        }
      } catch (err) {
        console.error("Failed to load today's vitals", err);
      }
    } catch (e) {
      console.error('Failed to load patient dashboard', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchDashboardData();
  }, [user.userId, dateStr]);

  // Real-Time Socket Listeners
  useEffect(() => {
    const handleStockUpdate = ({ patientId, medicationId, stock }) => {
      if (String(patientId) !== String(user.userId)) return;
      setCabinetStock(prev => ({
        ...prev,
        [medicationId]: stock
      }));
    };

    const handleRefillApproved = ({ patientId, medicationId, stock }) => {
      if (String(patientId) !== String(user.userId)) return;
      setCabinetStock(prev => ({
        ...prev,
        [medicationId]: stock
      }));
      // Re-fetch historical adherence
      axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/patients/${user.userId}/weekly-adherence`, {
        params: { date: dateStr }
      }).then(res => setWeeklyTrendData(res.data)).catch(console.error);
    };

    const handleMedicationAssigned = ({ patientId }) => {
      if (String(patientId) !== String(user.userId)) return;
      // Re-fetch all dashboard details
      fetchDashboardData();
    };

    const handleMedicationDeleted = ({ patientId }) => {
      if (String(patientId) !== String(user.userId)) return;
      // Re-fetch all dashboard details
      fetchDashboardData();
    };

    socket.on('stock_updated', handleStockUpdate);
    socket.on('refill_approved', handleRefillApproved);
    socket.on('medication_assigned', handleMedicationAssigned);
    socket.on('medication_deleted', handleMedicationDeleted);

    return () => {
      socket.off('stock_updated', handleStockUpdate);
      socket.off('refill_approved', handleRefillApproved);
      socket.off('medication_assigned', handleMedicationAssigned);
      socket.off('medication_deleted', handleMedicationDeleted);
    };
  }, [user.userId, dateStr]);

  const handleToggle = async (medId, currentTaken) => {
    const newTaken = !currentTaken;
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    // Optimistic UI updates
    setMeds(prev => prev.map(m => m.id === medId ? { ...m, taken: newTaken } : m));
    setCabinetStock(prev => {
      if (prev[medId] === undefined) return prev;
      return {
        ...prev,
        [medId]: newTaken ? Math.max(0, prev[medId] - 1) : prev[medId] + 1
      };
    });

    try {
      await axios.patch(`${apiBase}/api/medications/log`, {
        medicationId: medId,
        date: dateStr,
        taken: newTaken,
      });

      // Fetch updated weekly trend
      const trendRes = await axios.get(`${apiBase}/api/patients/${user.userId}/weekly-adherence`, {
        params: { date: dateStr }
      });
      setWeeklyTrendData(trendRes.data);
    } catch (e) {
      // Revert on failure
      setMeds(prev => prev.map(m => m.id === medId ? { ...m, taken: currentTaken } : m));
      setCabinetStock(prev => {
        if (prev[medId] === undefined) return prev;
        return {
          ...prev,
          [medId]: currentTaken ? Math.max(0, prev[medId] - 1) : prev[medId] + 1
        };
      });
      console.error('Failed to update medication log', e);
    }
  };

  const handleVitalsSubmit = async (e) => {
    e.preventDefault();
    setNotesLoading(true);
    setNotesSuccess(false);
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    try {
      await axios.post(`${apiBase}/api/patients/${user.userId}/vitals`, {
        date: dateStr,
        systolic: systolic ? Number(systolic) : null,
        diastolic: diastolic ? Number(diastolic) : null,
        heartRate: heartRate ? Number(heartRate) : null,
        notes: dailyNotes
      });
      setNotesSuccess(true);
      setTimeout(() => setNotesSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to record vitals", error);
      alert("Failed to record vitals. Please try again.");
    } finally {
      setNotesLoading(false);
    }
  };

  const handleRequestRefills = async () => {
    if (meds.length === 0) return;
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    try {
      let dispatched = false;
      for (const med of meds) {
        const stock = cabinetStock[med.id] || 0;
        if (stock < 10) { // Dispatch refill request for low or warning stocks
          await axios.post(`${apiBase}/api/medications/refill`, {
            patientId: user.userId,
            medicationId: med.id
          });
          dispatched = true;
        }
      }
      
      // Fallback: If no stocks are low, request a refill for all assigned medications
      if (!dispatched) {
        for (const med of meds) {
          await axios.post(`${apiBase}/api/medications/refill`, {
            patientId: user.userId,
            medicationId: med.id
          });
        }
      }

      alert(`Refill requests have been successfully dispatched to ${doctor ? doctor.name : 'your clinician'}.`);
    } catch (err) {
      console.error("Refill request dispatch failed", err);
      alert("Failed to submit refill request. Please try again.");
    }
  };

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  const takenCount = meds.filter(m => m.taken).length;
  const todayPct = meds.length ? Math.round((takenCount / meds.length) * 100) : 0;

  return (
    <div className="page-wrap patient-premium-theme">
      <header className="app-header">
        <div className="logo">
          <div className="logo-icon">💊</div>
          MedTrack
        </div>
        <div className="header-right">
          <span className="header-user">
            My Medications — <strong>{patientName}</strong>
          </span>
          <button id="patient-logout-btn" className="btn btn-outline" onClick={handleLogout}>
            ↩ Logout
          </button>
        </div>
      </header>

      <main className="patient-dashboard-body" style={{ maxWidth: '680px', margin: '0 auto', width: '100%', padding: '40px 20px' }}>
        <p className="patient-date-label" style={{ margin: '0 auto 24px auto', textAlign: 'center', display: 'block', width: 'fit-content' }}>
          📅 {fmtDate(today)}
        </p>

        {/* ─── Daily Intake circular gauge card ─── */}
        {!loading && meds.length > 0 && (
          <div className="compliance-summary" style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap', marginBottom: '24px', justifyContent: 'center' }}>
            <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
              <svg className="progress-svg" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                <circle cx="50" cy="50" r="40" style={{ fill: 'none', stroke: 'rgba(255, 255, 255, 0.05)', strokeWidth: '8' }} />
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
                    strokeDashoffset: 251.2 - (251.2 * todayPct) / 100, 
                    transition: 'stroke-dashoffset 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' 
                  }}
                />
              </svg>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontWeight: '700', fontSize: '1.15rem', color: '#ffffff' }}>
                {todayPct}%
              </div>
            </div>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <span className="compliance-summary-text" style={{ display: 'block', fontSize: '1.25rem' }}>
                Your Daily Intake Score
              </span>
              <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: '0.95rem' }}>
                You have taken <strong>{takenCount}</strong> of <strong>{meds.length}</strong> assigned medications today.
              </p>
            </div>
          </div>
        )}

        {/* ─── Today's Schedule Card ─── */}
        <div className="patient-card-panel" style={{ marginBottom: '24px' }}>
          <h3 className="patient-panel-title">📝 Today's Schedule</h3>
          {loading ? (
            <div className="loading-wrap">
              <div className="spinner" />
              <span>Loading your medications…</span>
            </div>
          ) : meds.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: '2.5rem' }}>💊</div>
              <p>No medications assigned yet.</p>
            </div>
          ) : (
            <div className="meds-list">
              {meds.map(med => (
                <MedicationItem key={med.id} med={med} onToggle={handleToggle} />
              ))}
            </div>
          )}
        </div>

        {/* ─── Adherence Calendar Card ─── */}
        <div className="patient-card-panel">
          <h3 className="patient-panel-title">🔥 Adherence Calendar</h3>
          <div className="calendar-grid" style={{ marginTop: '16px' }}>
            {weeklyTrendData.map((d) => {
              const isPerfect = d.pct === 100;
              const isPartial = d.pct > 0 && d.pct < 100;
              const isMissed = d.pct === 0;
              const isTodayCol = d.date === dateStr;

              return (
                <div key={d.date || d.day} className="calendar-day-col">
                  <span className="calendar-day-name" style={{ color: isTodayCol ? 'var(--teal)' : '#94a3b8' }}>{d.day}</span>
                  <div 
                    className={`calendar-day-dot ${isPerfect ? 'perfect' : isPartial ? 'partial' : isMissed ? 'missed' : ''}`}
                    title={`${d.day} (${d.date}): ${d.pct}% adherence`}
                    style={{ boxShadow: isTodayCol ? '0 0 8px rgba(0, 255, 188, 0.4)' : 'none' }}
                  >
                    {isPerfect ? '✓' : isPartial ? '◒' : '✗'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
