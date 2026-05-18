const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/patients?doctorId=X&date=YYYY-MM-DD
router.get('/', (req, res) => {
  const { doctorId, date } = req.query;

  if (!doctorId || !date) {
    return res.status(400).json({ error: 'doctorId and date are required' });
  }

  const patients = db
    .prepare('SELECT * FROM patients WHERE doctor_id = ?')
    .all(doctorId);

  const result = patients.map((patient) => {
    const medications = db
      .prepare('SELECT * FROM medications WHERE patient_id = ?')
      .all(patient.id);

    const medsWithStatus = medications.map((med) => {
      const log = db
        .prepare(
          'SELECT taken FROM medication_logs WHERE medication_id = ? AND date = ?'
        )
        .get(med.id, date);

      return {
        id: med.id,
        name: med.name,
        frequency: med.frequency,
        taken: log ? log.taken === 1 : false,
      };
    });

    return {
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      medications: medsWithStatus,
    };
  });

  res.json(result);
});

module.exports = router;
