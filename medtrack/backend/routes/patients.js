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

        // Fetch patient's vitals for the active date
        const vitals = await db.getVitals(patient.id, date);

        // Fetch patient's refill requests
        const refills = await db.getRefillRequests(patient.id);

        return {
          id: patient.id,
          name: patient.name,
          phone: patient.phone,
          medications: medsWithStatus,
          vitals: vitals || null,
          refills: refills || []
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

let _io = null;
router.setIO = (io) => {
  _io = io;
};

// GET /api/patients/:patientId/doctor
router.get('/:patientId/doctor', async (req, res) => {
  const { patientId } = req.params;
  try {
    const patient = await db.getPatientById(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    if (!patient.doctor_id) {
      return res.status(404).json({ error: 'No doctor assigned to this patient' });
    }
    const doctor = await db.getDoctorById(patient.doctor_id);
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    const specialties = [
      'Cardiology & Primary Care',
      'Neurology & Endocrinology',
      'General Family Medicine',
      'Pediatrics & Internal Health'
    ];
    const clinics = [
      'St. Jude Health Center',
      'Metro General Medical Plaza',
      'City Family Health Care',
      'Apex Wellness Cardiology'
    ];

    const idx = doctor.id % clinics.length;
    res.json({
      id: doctor.id,
      name: `Dr. ${doctor.username}`,
      specialty: specialties[idx],
      clinic: clinics[idx]
    });
  } catch (error) {
    console.error('Error fetching patient doctor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:patientId/weekly-adherence?date=YYYY-MM-DD
router.get('/:patientId/weekly-adherence', async (req, res) => {
  const { patientId } = req.params;
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'date query parameter is required' });
  }

  try {
    const history = await db.getWeeklyAdherence(patientId, date);
    res.json(history);
  } catch (error) {
    console.error('Error fetching weekly adherence:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:patientId/vitals?date=YYYY-MM-DD
router.get('/:patientId/vitals', async (req, res) => {
  const { patientId } = req.params;
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'date query parameter is required' });
  }

  try {
    const vitals = await db.getVitals(patientId, date);
    res.json(vitals || null);
  } catch (error) {
    console.error('Error fetching vitals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/patients/:patientId/vitals
router.post('/:patientId/vitals', async (req, res) => {
  const { patientId } = req.params;
  const { date, systolic, diastolic, heartRate, notes } = req.body;

  if (!date) {
    return res.status(400).json({ error: 'date is required' });
  }

  try {
    await db.saveVitals(patientId, date, systolic, diastolic, heartRate, notes);

    if (_io) {
      _io.emit('vitals_updated', {
        patientId,
        date,
        vitals: { systolic, diastolic, heartRate, notes }
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving vitals:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:patientId/refills
router.get('/:patientId/refills', async (req, res) => {
  const { patientId } = req.params;
  try {
    const refills = await db.getRefillRequests(patientId);
    res.json(refills);
  } catch (error) {
    console.error('Error fetching refills:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
