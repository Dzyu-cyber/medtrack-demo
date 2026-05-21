import { useState } from 'react';
import axios from 'axios';

const PRESET_MEDICINES = [
  { name: 'Metformin 500mg', frequency: 'Twice daily (after meals)', problem: 'Diabetes Management' },
  { name: 'Insulin Glargine 100 U/mL', frequency: 'Once daily at bedtime', problem: 'Diabetes Management' },
  { name: 'Aspirin 100mg', frequency: 'Once daily with water', problem: 'Hypertension' },
  { name: 'Amlodipine 5mg', frequency: 'Once daily in the morning', problem: 'Cardiovascular' },
  { name: 'Lisinopril 10mg', frequency: 'Once daily in the morning', problem: 'Cardiovascular' },
  { name: 'Atorvastatin 20mg', frequency: 'Once daily in the evening', problem: 'Cardiovascular' },
  { name: 'Metoprolol 50mg', frequency: 'Once daily with meals', problem: 'Cardiovascular' },
  { name: 'Amoxicillin 500mg', frequency: 'Three times daily for 7 days', problem: 'Bacterial Infection' },
  { name: 'Azithromycin 250mg', frequency: 'Once daily for 5 days', problem: 'Respiratory Infection' },
  { name: 'Vitamin D3 2000 IU', frequency: 'Once daily in the morning', problem: 'Immunity / Vitamins' },
  { name: 'Multivitamin', frequency: 'Once daily after breakfast', problem: 'General Health' },
  { name: 'Omega-3 Fish Oil 1000mg', frequency: 'Twice daily with meals', problem: 'Cardiovascular' },
  { name: 'Ibuprofen 400mg', frequency: 'Every 6 hours as needed for pain', problem: 'Pain & Inflammation' },
  { name: 'Acetaminophen 500mg', frequency: 'Every 4-6 hours as needed', problem: 'Pain & Inflammation' },
];

export default function PatientCard({ patient, onUpdate, isSelected, onSelect }) {
  const medications = patient?.medications || [];
  const total = medications.length;
  const taken = medications.filter(m => m?.taken).length;
  const pct = total > 0 ? Math.round((taken / total) * 100) : 0;

  // Assign Medication Modal State
  const [showModal, setShowModal] = useState(false);
  const [medName, setMedName] = useState('');
  const [medFreq, setMedFreq] = useState('');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAssignClick = (e) => {
    e.stopPropagation();
    setShowModal(true);
  };

  const handlePresetChange = (e) => {
    const val = e.target.value;
    setSelectedPresetIndex(val);
    if (val === 'custom' || val === '') {
      setMedName('');
      setMedFreq('');
    } else {
      const selected = PRESET_MEDICINES[parseInt(val, 10)];
      if (selected) {
        setMedName(selected.name);
        setMedFreq(selected.frequency);
      }
    }
  };

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
        setSelectedPresetIndex('');
        setShowModal(false);
        if (onUpdate) onUpdate(); // Refresh list
      }
    } catch (err) {
      console.error('Failed to assign medication', err);
      setError('Failed to assign medication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className={`patient-card ${isSelected ? 'selected-active' : ''}`} 
      onClick={onSelect}
    >
      <div className="patient-card-header">
        <div className="patient-name">{patient?.name || 'Unnamed Patient'}</div>
        <div className="patient-phone">📞 {patient?.phone || 'No phone number'}</div>
      </div>

      <div className="patient-card-divider" />

      <div className="med-list">
        {total === 0 ? (
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', padding: '10px 0', textAlign: 'center' }}>
            No medicines assigned yet.
          </div>
        ) : (
          medications.map(med => (
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

      <div className="compliance-bar-wrap" style={{ marginTop: 'auto', paddingTop: '10px' }}>
        <div className="compliance-bar">
          <div
            className="compliance-fill"
            style={{
              width: `${pct}%`,
              background: pct === 100 ? '#00ffbc' : pct >= 50 ? '#38bdf8' : '#ff4d4d',
              boxShadow: pct === 100 ? '0 0 10px rgba(0, 255, 188, 0.4)' : 'none'
            }}
          />
        </div>
        <span className="compliance-pct" style={{ color: pct === 100 ? '#00ffbc' : pct >= 50 ? '#38bdf8' : '#ff4d4d', fontWeight: '700' }}>{pct}%</span>
      </div>

      <div className="patient-card-footer" style={{ marginTop: '10px' }}>
        <button
          className="assign-med-btn"
          onClick={handleAssignClick}
          type="button"
        >
          ➕ Assign Medicine
        </button>
      </div>

      {/* Assign Medication Modal */}
      {showModal && (
        <div className="modal-overlay" style={{ cursor: 'default' }} onClick={(e) => { e.stopPropagation(); setShowModal(false); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ fontSize: '1.25rem' }}>
                Assign Medication to <span style={{ color: 'var(--teal)' }}>{patient?.name}</span>
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAssignSubmit}>
              <div className="modal-body">
                {/* Preset Dropdown */}
                <div className="form-group preset-select-group">
                  <label htmlFor={`preset-${patient.id}`}>Quick Select Medicine Preset</label>
                  <select
                    id={`preset-${patient.id}`}
                    value={selectedPresetIndex}
                    onChange={handlePresetChange}
                  >
                    <option value="">-- Choose Predefined Medicine --</option>
                    {PRESET_MEDICINES.map((preset, index) => (
                      <option key={index} value={index}>
                        [{preset.problem}] {preset.name}
                      </option>
                    ))}
                    <option value="custom">✍️ Custom Medication (Type manually...)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor={`med-name-${patient.id}`}>Medication Name</label>
                  <input
                    id={`med-name-${patient.id}`}
                    type="text"
                    placeholder="e.g. Metformin 500mg"
                    value={medName}
                    onChange={e => setMedName(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor={`med-freq-${patient.id}`}>Frequency / Instructions</label>
                  <input
                    id={`med-freq-${patient.id}`}
                    type="text"
                    placeholder="e.g. Twice daily (after meals)"
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
