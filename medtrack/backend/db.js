require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

let supabase = null;

if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  console.log('⚡ Connected to Supabase Database!');
} else {
  console.error('❌ Supabase credentials missing in .env. Cannot proceed.');
  process.exit(1);
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
  } catch (err) {
    console.error('❌ Failed to initialize Supabase database:', err.message);
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
};
