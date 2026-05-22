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

    // Update the cabinet stock
    let newStock = 30;
    if (taken) {
      newStock = db.decrementCabinetStock(medicationId);
    } else {
      newStock = db.incrementCabinetStock(medicationId);
    }

    // Emit real-time update via Socket.IO
    if (_io) {
      _io.emit('medication_updated', {
        patientId: med.patient_id,
        medicationId,
        date,
        taken: !!taken,
      });
      _io.emit('stock_updated', {
        patientId: med.patient_id,
        medicationId,
        stock: newStock
      });
    }

    res.json({ success: true, medicationId, date, taken: !!taken, stock: newStock });
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
    
    // Auto-initialize cabinet stock in SQLite to 30 doses
    db.updateCabinetStock(med.id, 30);

    // Emit real-time socket event so both client views know a new medication was assigned
    if (_io) {
      _io.emit('medication_assigned', {
        patientId,
        medication: med,
        stock: 30
      });
    }

    res.json({ success: true, medication: med });
  } catch (error) {
    console.error('Error assigning medication:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/medications/:patientId/cabinet
router.get('/:patientId/cabinet', async (req, res) => {
  const { patientId } = req.params;
  try {
    const medications = await db.getMedicationsByPatientId(patientId);
    const cabinet = {};
    for (const med of medications) {
      cabinet[med.id] = db.getCabinetStock(med.id);
    }
    res.json(cabinet);
  } catch (error) {
    console.error('Error fetching cabinet stock:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/medications/refill
router.post('/refill', async (req, res) => {
  const { patientId, medicationId } = req.body;
  if (!patientId || !medicationId) {
    return res.status(400).json({ error: 'patientId and medicationId are required' });
  }
  try {
    db.createRefillRequest(patientId, medicationId);
    if (_io) {
      _io.emit('refill_requested', {
        patientId,
        medicationId,
        status: 'pending'
      });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error requesting refill:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/medications/refill/approve
router.post('/refill/approve', async (req, res) => {
  const { requestId } = req.body;
  if (!requestId) {
    return res.status(400).json({ error: 'requestId is required' });
  }
  try {
    const medId = db.approveRefillRequest(requestId);
    if (!medId) {
      return res.status(404).json({ error: 'Refill request not found or invalid' });
    }

    const med = await db.getMedicationById(medId);
    const newStock = 30; // Refilled successfully

    if (_io) {
      _io.emit('refill_approved', {
        requestId,
        medicationId: medId,
        patientId: med ? med.patient_id : null,
        stock: newStock
      });

      if (med) {
        _io.emit('stock_updated', {
          patientId: med.patient_id,
          medicationId: medId,
          stock: newStock
        });
      }
    }
    res.json({ success: true, medicationId: medId, stock: newStock });
  } catch (error) {
    console.error('Error approving refill:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/medications/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const med = await db.getMedicationById(id);
    if (!med) {
      return res.status(404).json({ error: 'Medication not found' });
    }

    await db.deleteMedication(id);

    // Emit real-time update via Socket.IO
    if (_io) {
      _io.emit('medication_deleted', {
        patientId: med.patient_id,
        medicationId: id
      });
    }

    res.json({ success: true, medicationId: id });
  } catch (error) {
    console.error('Error deleting medication:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
