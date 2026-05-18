export default function MedicationItem({ med, onToggle }) {
  return (
    <div className={`med-item${med.taken ? ' is-taken' : ''}`}>
      <div className="med-item-info">
        <div className="med-item-name">{med.name}</div>
        <div className="med-item-freq">🕐 {med.frequency}</div>
      </div>
      <button
        id={`med-toggle-${med.id}`}
        className={`med-toggle-btn${med.taken ? ' taken' : ''}`}
        onClick={() => onToggle(med.id, med.taken)}
        aria-pressed={med.taken}
        aria-label={`${med.taken ? 'Mark as not taken' : 'Mark as taken'}: ${med.name}`}
      >
        {med.taken ? '✓ Taken' : 'Mark as Taken'}
      </button>
    </div>
  );
}
