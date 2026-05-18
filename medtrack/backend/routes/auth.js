const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { name, code, role } = req.body;

  if (!name || !code || !role) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  if (role === 'doctor') {
    const doctor = db
      .prepare('SELECT * FROM doctors WHERE LOWER(name) = LOWER(?) AND code = ?')
      .get(name.trim(), code.trim());

    if (!doctor) {
      return res.status(401).json({ success: false, message: 'Invalid doctor credentials' });
    }

    return res.json({
      success: true,
      userId: doctor.id,
      role: 'doctor',
      displayName: doctor.name,
    });
  }

  if (role === 'patient') {
    const patient = db
      .prepare('SELECT * FROM patients WHERE LOWER(name) = LOWER(?) AND phone = ?')
      .get(name.trim(), code.trim());

    if (!patient) {
      return res.status(401).json({ success: false, message: 'Invalid patient credentials' });
    }

    return res.json({
      success: true,
      userId: patient.id,
      role: 'patient',
      displayName: patient.name,
    });
  }

  return res.status(400).json({ success: false, message: 'Invalid role' });
});

module.exports = router;
