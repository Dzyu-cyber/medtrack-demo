export default function PatientCard({ patient }) {
  const total = patient.medications.length;
  const taken = patient.medications.filter(m => m.taken).length;
  const pct = total > 0 ? Math.round((taken / total) * 100) : 0;

  return (
    <div className="patient-card">
      <div className="patient-card-header">
        <div className="patient-name">{patient.name}</div>
        <div className="patient-phone">📞 {patient.phone}</div>
      </div>

      <div className="patient-card-divider" />

      <div className="med-list">
        {patient.medications.map(med => (
          <div key={med.id} className="med-row">
            <span className="med-row-name">{med.name}</span>
            <span
              className={`med-status-icon ${med.taken ? 'taken' : 'not-taken'}`}
              title={med.taken ? 'Taken' : 'Not taken'}
            >
              {med.taken ? '✓' : '✗'}
            </span>
          </div>
        ))}
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
    </div>
  );
}
