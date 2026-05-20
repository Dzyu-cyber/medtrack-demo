const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/patients?doctorId=X&date=YYYY-MM-DD
router.get('/', async (req, res) => {
  const { doctorId, date } = req.query;

  if (!doctorId || !date) {
    return res.status(400).json({ error: 'doctorId and date are required' });
  }

  try {
    const patients = await db.getPatientsByDoctorId(doctorId);

    const result = await Promise.all(
      patients.map(async (patient) => {
        const medications = await db.getMedicationsByPatientId(patient.id);

        const medsWithStatus = await Promise.all(
          medications.map(async (med) => {
            const log = await db.getMedicationLog(med.id, date);

            return {
              id: med.id,
              name: med.name,
              frequency: med.frequency,
              taken: log ? log.taken === 1 : false,
            };
          })
        );

        return {
          id: patient.id,
          name: patient.name,
          phone: patient.phone,
          medications: medsWithStatus,
        };
      })
    );

    res.json(result);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/patients
router.post('/', async (req, res) => {
  const { name, username, password, phone, doctorId } = req.body;

  if (!name || !username || !password || !doctorId) {
    return res.status(400).json({ error: 'name, username, password, and doctorId are required' });
  }

  try {
    const trimmedUsername = username.trim();
    const exists = await db.checkPatientUsernameExists(trimmedUsername);
    if (exists) {
      return res.status(400).json({ error: 'Username is already taken by another patient' });
    }

    const patient = await db.createPatient(name.trim(), trimmedUsername, password, phone || null, doctorId);
    res.json(patient);
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
