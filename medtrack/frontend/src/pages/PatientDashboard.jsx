import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MedicationItem from '../components/MedicationItem';

const toISO = (d) => d.toISOString().split('T')[0];
const fmtDate = (d) =>
  d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateStr = toISO(today);

  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [patientName, setPatientName] = useState(user.displayName);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(
          `http://localhost:3001/api/medications/${user.userId}`,
          { params: { date: dateStr } }
        );
        setPatientName(data.name);
        setMeds(data.medications);
      } catch (e) {
        console.error('Failed to fetch medications', e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user.userId, dateStr]);

  const handleToggle = async (medId, currentTaken) => {
    const newTaken = !currentTaken;
    // Optimistic update
    setMeds(prev => prev.map(m => m.id === medId ? { ...m, taken: newTaken } : m));
    try {
      await axios.patch('http://localhost:3001/api/medications/log', {
        medicationId: medId,
        date: dateStr,
        taken: newTaken,
      });
    } catch (e) {
      // Revert on failure
      setMeds(prev => prev.map(m => m.id === medId ? { ...m, taken: currentTaken } : m));
      console.error('Failed to update medication', e);
    }
  };

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  const takenCount = meds.filter(m => m.taken).length;

  return (
    <div className="page-wrap">
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

      <main className="patient-dashboard-body">
        <p className="patient-date-label">📅 {fmtDate(today)}</p>

        {!loading && meds.length > 0 && (
          <div className="compliance-summary">
            <span className="compliance-summary-text">
              ✅ {takenCount} of {meds.length} medications taken today
            </span>
            <div className="compliance-bar" style={{ marginTop: '8px', marginBottom: '20px' }}>
              <div
                className="compliance-fill"
                style={{ width: `${meds.length ? (takenCount / meds.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

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
      </main>
    </div>
  );
}
