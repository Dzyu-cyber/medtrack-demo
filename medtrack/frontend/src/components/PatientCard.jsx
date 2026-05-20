import { useState } from 'react';
import axios from 'axios';

export default function PatientCard({ patient, onUpdate }) {
  const total = patient.medications.length;
  const taken = patient.medications.filter(m => m.taken).length;
  const pct = total > 0 ? Math.round((taken / total) * 100) : 0;

  // Assign Medication Modal State
  const [showModal, setShowModal] = useState(false);
  const [medName, setMedName] = useState('');
  const [medFreq, setMedFreq] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!medName.trim() || !medFreq.trim()) return;

    setLoading(true);
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const { data } = await axios.post(`${apiUrl}/api/medications`, {
        patientId: patient.id,
        name: medName.trim(),
        frequency: medFreq.trim()
      });

      if (data.success) {
        setMedName('');
        setMedFreq('');
        setShowModal(false);
        if (onUpdate) onUpdate(); // Refresh the list
      }
    } catch (err) {
      console.error('Failed to assign medication', err);
      setError('Failed to assign medication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="patient-card">
      <div className="patient-card-header">
        <div className="patient-name">{patient.name}</div>
        <div className="patient-phone">📞 {patient.phone || 'No phone number'}</div>
      </div>

      <div className="patient-card-divider" />

      <div className="med-list">
        {total === 0 ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--gray-600)', padding: '10px 0', textAlign: 'center' }}>
            No medicines assigned yet.
          </div>
        ) : (
          patient.medications.map(med => (
            <div key={med.id} className="med-row">
              <span className="med-row-name">{med.name}</span>
              <span
                className={`med-status-icon ${med.taken ? 'taken' : 'not-taken'}`}
                title={med.taken ? 'Taken' : 'Not taken'}
              >
                {med.taken ? '✓' : '✗'}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="compliance-bar-wrap">
        <div className="compliance-bar">
          <div
            className="compliance-fill"
            style={{
              width: `${pct}%`,
              background: pct === 100 ? 'var(--teal)' : pct >= 50 ? '#f5a623' : 'var(--red)',
            }}
          />
        </div>
        <span className="compliance-pct">{pct}%</span>
      </div>

      <div className="patient-card-footer">
        <button
          className="assign-med-btn"
          onClick={() => setShowModal(true)}
          type="button"
        >
          ➕ Assign Medicine
        </button>
      </div>

      {/* Assign Medication Modal */}
      {showModal && (
        <div className="modal-overlay" style={{ cursor: 'default' }} onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ fontSize: '1.2rem' }}>
                Assign Medication to <span style={{ color: 'var(--teal)' }}>{patient.name}</span>
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAssignSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor={`med-name-${patient.id}`}>Medication Name</label>
                  <input
                    id={`med-name-${patient.id}`}
                    type="text"
                    placeholder="Metformin 500mg"
                    value={medName}
                    onChange={e => setMedName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label htmlFor={`med-freq-${patient.id}`}>Frequency / Instructions</label>
                  <input
                    id={`med-freq-${patient.id}`}
                    type="text"
                    placeholder="Twice daily (after meals)"
                    value={medFreq}
                    onChange={e => setMedFreq(e.target.value)}
                    required
                  />
                </div>
                {error && <div className="login-error">⚠️ {error}</div>}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Assigning…' : 'Assign Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
