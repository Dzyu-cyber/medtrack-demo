const express = require('express');
const router = express.Router();
const db = require('../db');

let _io = null;

// Inject socket.io instance
router.setIO = (io) => {
  _io = io;
};

// GET /api/medications/:patientId?date=YYYY-MM-DD
router.get('/:patientId', (req, res) => {
  const { patientId } = req.params;
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'date query param is required' });
  }

  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const medications = db
    .prepare('SELECT * FROM medications WHERE patient_id = ?')
    .all(patientId);

  const medsWithStatus = medications.map((med) => {
    const log = db
      .prepare('SELECT taken FROM medication_logs WHERE medication_id = ? AND date = ?')
      .get(med.id, date);

    return {
      id: med.id,
      name: med.name,
      frequency: med.frequency,
      taken: log ? log.taken === 1 : false,
    };
  });

  res.json({
    id: patient.id,
    name: patient.name,
    phone: patient.phone,
    medications: medsWithStatus,
  });
});

// PATCH /api/medications/log
router.patch('/log', (req, res) => {
  const { medicationId, date, taken } = req.body;

  if (medicationId === undefined || !date || taken === undefined) {
    return res.status(400).json({ error: 'medicationId, date, and taken are required' });
  }

  const takenInt = taken ? 1 : 0;

  // Get the medication to find the patient
  const med = db.prepare('SELECT * FROM medications WHERE id = ?').get(medicationId);
  if (!med) {
    return res.status(404).json({ error: 'Medication not found' });
  }

  // Upsert the log entry
  const existing = db
    .prepare('SELECT id FROM medication_logs WHERE medication_id = ? AND date = ?')
    .get(medicationId, date);

  if (existing) {
    db.prepare('UPDATE medication_logs SET taken = ? WHERE medication_id = ? AND date = ?')
      .run(takenInt, medicationId, date);
  } else {
    db.prepare('INSERT INTO medication_logs (medication_id, date, taken) VALUES (?, ?, ?)')
      .run(medicationId, date, takenInt);
  }

  // Emit real-time update via Socket.IO
  if (_io) {
    _io.emit('medication_updated', {
      patientId: med.patient_id,
      medicationId,
      date,
      taken: takenInt === 1,
    });
  }

  res.json({ success: true, medicationId, date, taken: takenInt === 1 });
});

module.exports = router;
