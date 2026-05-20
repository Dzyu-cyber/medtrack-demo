const express = require('express');
const router = express.Router();
const db = require('../db');

let _io = null;

// Inject socket.io instance
router.setIO = (io) => {
  _io = io;
};

// GET /api/medications/:patientId?date=YYYY-MM-DD
router.get('/:patientId', async (req, res) => {
  const { patientId } = req.params;
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'date query param is required' });
  }

  try {
    const patient = await db.getPatientById(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const medications = await db.getMedicationsByPatientId(patientId);

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

    res.json({
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      medications: medsWithStatus,
    });
  } catch (error) {
    console.error('Error fetching medications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/medications/log
router.patch('/log', async (req, res) => {
  const { medicationId, date, taken } = req.body;

  if (medicationId === undefined || !date || taken === undefined) {
    return res.status(400).json({ error: 'medicationId, date, and taken are required' });
  }

  try {
    // Get the medication to find the patient
    const med = await db.getMedicationById(medicationId);
    if (!med) {
      return res.status(404).json({ error: 'Medication not found' });
    }

    // Upsert the log entry
    await db.upsertMedicationLog(medicationId, date, taken);

    // Emit real-time update via Socket.IO
    if (_io) {
      _io.emit('medication_updated', {
        patientId: med.patient_id,
        medicationId,
        date,
        taken: !!taken,
      });
    }

    res.json({ success: true, medicationId, date, taken: !!taken });
  } catch (error) {
    console.error('Error logging medication:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/medications
router.post('/', async (req, res) => {
  const { patientId, name, frequency } = req.body;

  if (!patientId || !name || !frequency) {
    return res.status(400).json({ error: 'patientId, name, and frequency are required' });
  }

  try {
    const med = await db.createMedication(patientId, name, frequency);
    res.json({ success: true, medication: med });
  } catch (error) {
    console.error('Error assigning medication:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
