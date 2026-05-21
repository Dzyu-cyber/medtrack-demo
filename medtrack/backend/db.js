require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

let supabase = null;
let sqliteDb = null;
const dbPath = path.join(__dirname, 'medtrack.db');

if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  console.log('⚡ Connected to Supabase Database!');
} else {
  console.error('❌ Supabase credentials missing in .env. Cannot proceed.');
  process.exit(1);
}

// ---------------------------------------------------------
// SQLite DB Helper & Initialization
// ---------------------------------------------------------
async function initSQLite() {
  const SQL = await initSqlJs();
  if (fs.existsSync(dbPath)) {
    const filebuffer = fs.readFileSync(dbPath);
    sqliteDb = new SQL.Database(filebuffer);
  } else {
    sqliteDb = new SQL.Database();
  }

  // Create tables if they do not exist
  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS vitals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id TEXT NOT NULL,
      systolic INTEGER,
      diastolic INTEGER,
      heart_rate INTEGER,
      notes TEXT,
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS cabinet_stock (
      medication_id TEXT PRIMARY KEY,
      stock INTEGER NOT NULL,
      low_stock_threshold INTEGER DEFAULT 5
    );
  `);
  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS refill_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id TEXT NOT NULL,
      medication_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  saveSQLite();
}

function saveSQLite() {
  if (!sqliteDb) return;
  const data = sqliteDb.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

// ---------------------------------------------------------
// DB Initialization
// ---------------------------------------------------------
async function initDb() {
  try {
    // Verify connection by doing a simple health check query
    const { data, error } = await supabase.from('doctors').select('id').limit(1);
    if (error) {
      console.error('❌ Supabase connection health check failed:', error.message);
    } else {
      console.log('✅ Supabase connection verified successfully. Ready.');
    }

    // Initialize SQLite side-by-side
    await initSQLite();
    console.log('✅ Local SQLite database initialized side-by-side.');
  } catch (err) {
    console.error('❌ Failed to initialize databases:', err.message);
  }
}

// ---------------------------------------------------------
// Unified Adapter Query APIs (Async - Supabase Only)
// ---------------------------------------------------------

async function createDoctor(username, password) {
  const { data, error } = await supabase
    .from('doctors')
    .insert({ username, password })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getDoctorByUsername(username) {
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('username', username)
    .maybeSingle();
  if (error) throw error;
  return data || undefined;
}

async function getDoctorByUsernameAndPassword(username, password) {
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .maybeSingle();
  if (error) throw error;
  return data || undefined;
}

async function checkDoctorUsernameExists(username) {
  const { data, error } = await supabase
    .from('doctors')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

async function createPatient(name, username, password, phone, doctorId) {
  const { data, error } = await supabase
    .from('patients')
    .insert({ name, username, password, phone, doctor_id: doctorId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getPatientByUsernameAndPassword(username, password) {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .maybeSingle();
  if (error) throw error;
  return data || undefined;
}

async function checkPatientUsernameExists(username) {
  const { data, error } = await supabase
    .from('patients')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

async function getPatientById(id) {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data || undefined;
}

async function getPatientsByDoctorId(doctorId) {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('id', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function getMedicationsByPatientId(patientId) {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('patient_id', patientId)
    .order('id', { ascending: true });
  if (error) throw error;
  return data || [];
}

async function getMedicationById(id) {
  const { data, error } = await supabase
    .from('medications')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data || undefined;
}

async function createMedication(patientId, name, frequency) {
  const { data, error } = await supabase
    .from('medications')
    .insert({ patient_id: patientId, name, frequency })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function getMedicationLog(medicationId, date) {
  const { data, error } = await supabase
    .from('medication_logs')
    .select('*')
    .eq('medication_id', medicationId)
    .eq('date', date)
    .maybeSingle();
  if (error) throw error;
  return data ? { ...data, taken: data.taken ? 1 : 0 } : undefined;
}

async function upsertMedicationLog(medicationId, date, taken) {
  const { error } = await supabase
    .from('medication_logs')
    .upsert({ medication_id: medicationId, date, taken: !!taken }, { onConflict: 'medication_id,date' });
  if (error) throw error;
}

async function getDoctorById(id) {
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data || undefined;
}

function getVitals(patientId, date) {
  if (!sqliteDb) return undefined;
  const stmt = sqliteDb.prepare("SELECT * FROM vitals WHERE patient_id = :pId AND date = :date");
  stmt.bind({ ':pId': String(patientId), ':date': date });
  let result = undefined;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

function saveVitals(patientId, date, systolic, diastolic, heartRate, notes) {
  if (!sqliteDb) return;
  const existing = getVitals(patientId, date);
  if (existing) {
    sqliteDb.run(
      "UPDATE vitals SET systolic = ?, diastolic = ?, heart_rate = ?, notes = ? WHERE patient_id = ? AND date = ?",
      [systolic ? Number(systolic) : null, diastolic ? Number(diastolic) : null, heartRate ? Number(heartRate) : null, notes || null, String(patientId), date]
    );
  } else {
    sqliteDb.run(
      "INSERT INTO vitals (patient_id, date, systolic, diastolic, heart_rate, notes) VALUES (?, ?, ?, ?, ?, ?)",
      [String(patientId), date, systolic ? Number(systolic) : null, diastolic ? Number(diastolic) : null, heartRate ? Number(heartRate) : null, notes || null]
    );
  }
  saveSQLite();
}

function getCabinetStock(medicationId) {
  if (!sqliteDb) return 30;
  const stmt = sqliteDb.prepare("SELECT stock FROM cabinet_stock WHERE medication_id = :medId");
  stmt.bind({ ':medId': String(medicationId) });
  let stock = 30;
  if (stmt.step()) {
    stock = stmt.getAsObject().stock;
  } else {
    stmt.free();
    sqliteDb.run("INSERT INTO cabinet_stock (medication_id, stock) VALUES (?, ?)", [String(medicationId), 30]);
    saveSQLite();
    return 30;
  }
  stmt.free();
  return stock;
}

function updateCabinetStock(medicationId, stock) {
  if (!sqliteDb) return;
  sqliteDb.run(
    "INSERT INTO cabinet_stock (medication_id, stock) VALUES (?, ?) ON CONFLICT(medication_id) DO UPDATE SET stock = excluded.stock",
    [String(medicationId), Number(stock)]
  );
  saveSQLite();
}

function decrementCabinetStock(medicationId) {
  if (!sqliteDb) return 30;
  const current = getCabinetStock(medicationId);
  const next = Math.max(0, current - 1);
  updateCabinetStock(medicationId, next);
  return next;
}

function incrementCabinetStock(medicationId) {
  if (!sqliteDb) return 30;
  const current = getCabinetStock(medicationId);
  const next = current + 1;
  updateCabinetStock(medicationId, next);
  return next;
}

function getRefillRequests(patientId) {
  if (!sqliteDb) return [];
  const stmt = sqliteDb.prepare("SELECT * FROM refill_requests WHERE patient_id = :pId ORDER BY requested_at DESC");
  stmt.bind({ ':pId': String(patientId) });
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function getRefillRequestsForPatients(patientIds) {
  if (!sqliteDb || patientIds.length === 0) return [];
  const placeholders = patientIds.map(() => '?').join(',');
  const stmt = sqliteDb.prepare(`SELECT * FROM refill_requests WHERE patient_id IN (${placeholders}) ORDER BY requested_at DESC`);
  stmt.bind(patientIds.map(String));
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function createRefillRequest(patientId, medicationId) {
  if (!sqliteDb) return;
  const stmt = sqliteDb.prepare("SELECT * FROM refill_requests WHERE medication_id = :medId AND status = 'pending'");
  stmt.bind({ ':medId': String(medicationId) });
  const exists = stmt.step();
  stmt.free();
  
  if (!exists) {
    sqliteDb.run(
      "INSERT INTO refill_requests (patient_id, medication_id, status) VALUES (?, ?, 'pending')",
      [String(patientId), String(medicationId)]
    );
    saveSQLite();
  }
}

function approveRefillRequest(requestId) {
  if (!sqliteDb) return null;
  const stmt = sqliteDb.prepare("SELECT medication_id FROM refill_requests WHERE id = :id");
  stmt.bind({ ':id': Number(requestId) });
  let medId = null;
  if (stmt.step()) {
    medId = stmt.getAsObject().medication_id;
  }
  stmt.free();
  
  if (medId) {
    sqliteDb.run("UPDATE refill_requests SET status = 'approved' WHERE id = ?", [Number(requestId)]);
    updateCabinetStock(medId, 30);
    saveSQLite();
    return medId;
  }
  return null;
}

async function getWeeklyAdherence(patientId, dateStr) {
  const medications = await getMedicationsByPatientId(patientId);
  if (medications.length === 0) {
    return [];
  }
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const baseDate = new Date(dateStr);
  
  const results = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(baseDate.getTime() - i * 24 * 60 * 60 * 1000);
    const curDateStr = d.toISOString().split('T')[0];
    const dayName = dayNames[d.getUTCDay()];
    
    let takenCount = 0;
    for (const med of medications) {
      const log = await getMedicationLog(med.id, curDateStr);
      if (log && log.taken === 1) {
        takenCount++;
      }
    }
    
    const pct = Math.round((takenCount / medications.length) * 100);
    results.push({
      day: dayName,
      date: curDateStr,
      pct: pct
    });
  }
  return results;
}

module.exports = {
  initDb,
  createDoctor,
  getDoctorByUsername,
  getDoctorByUsernameAndPassword,
  checkDoctorUsernameExists,
  createPatient,
  getPatientByUsernameAndPassword,
  checkPatientUsernameExists,
  getPatientById,
  getPatientsByDoctorId,
  getMedicationsByPatientId,
  getMedicationById,
  createMedication,
  getMedicationLog,
  upsertMedicationLog,
  isSupabaseActive: () => true,
  
  // SQLite & Hybrid additions
  getDoctorById,
  getVitals,
  saveVitals,
  getCabinetStock,
  updateCabinetStock,
  decrementCabinetStock,
  incrementCabinetStock,
  getRefillRequests,
  getRefillRequestsForPatients,
  createRefillRequest,
  approveRefillRequest,
  getWeeklyAdherence,
};
