const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/auth/register-doctor
router.post('/register-doctor', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required' });
  }

  try {
    const trimmedUsername = username.trim();
    const exists = await db.checkDoctorUsernameExists(trimmedUsername);
    if (exists) {
      return res.status(400).json({ success: false, message: 'Username is already taken' });
    }

    await db.createDoctor(trimmedUsername, password);
    return res.json({ success: true, message: 'Account created successfully' });
  } catch (error) {
    console.error('Doctor registration error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  try {
    const trimmedUsername = username.trim();

    if (role === 'doctor') {
      const doctor = await db.getDoctorByUsernameAndPassword(trimmedUsername, password);

      if (!doctor) {
        return res.status(401).json({ success: false, message: 'Invalid username or password' });
      }

      return res.json({
        success: true,
        userId: doctor.id,
        role: 'doctor',
        displayName: doctor.username,
      });
    }

    if (role === 'patient') {
      const patient = await db.getPatientByUsernameAndPassword(trimmedUsername, password);

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
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
