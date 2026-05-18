const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'medtrack.db');

let _db = null;
let _inTransaction = false;

function save() {
  if (!_db || _inTransaction) return;
  const data = _db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function getLastInsertRowid() {
  const result = _db.exec('SELECT last_insert_rowid()');
  return result.length > 0 ? result[0].values[0][0] : null;
}

// Proxy mimicking better-sqlite3 synchronous API
const db = {
  prepare(sql) {
    return {
      get(...args) {
        const stmt = _db.prepare(sql);
        if (args.length > 0) stmt.bind(args);
        const hasRow = stmt.step();
        const row = hasRow ? { ...stmt.getAsObject() } : undefined;
        stmt.free();
        return row;
      },
      all(...args) {
        const rows = [];
        const stmt = _db.prepare(sql);
        if (args.length > 0) stmt.bind(args);
        while (stmt.step()) rows.push({ ...stmt.getAsObject() });
        stmt.free();
        return rows;
      },
      run(...args) {
        _db.run(sql, args.length > 0 ? args : undefined);
        const rowid = getLastInsertRowid();
        save();
        return { lastInsertRowid: rowid, changes: _db.getRowsModified() };
      },
    };
  },
  exec(sql) {
    _db.exec(sql);
    save();
  },
  pragma() { /* no-op for sql.js */ },
  transaction(fn) {
    return () => {
      _inTransaction = true;
      _db.run('BEGIN TRANSACTION');
      try {
        fn();
        _db.run('COMMIT');
      } catch (e) {
        _db.run('ROLLBACK');
        throw e;
      } finally {
        _inTransaction = false;
        save();
      }
    };
  },
};

async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(fileBuffer);
    console.log('📂 Loaded existing database');
  } else {
    _db = new SQL.Database();
    console.log('🆕 Created new database');
  }

  // Create tables
  _db.exec(`
    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      doctor_id INTEGER,
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    );
    CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER,
      name TEXT NOT NULL,
      frequency TEXT NOT NULL,
      FOREIGN KEY (patient_id) REFERENCES medications(id)
    );
    CREATE TABLE IF NOT EXISTS medication_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medication_id INTEGER,
      date TEXT NOT NULL,
      taken INTEGER DEFAULT 0,
      FOREIGN KEY (medication_id) REFERENCES medications(id)
    );
  `);

  // Seed if empty
  const result = _db.exec('SELECT COUNT(*) as c FROM doctors');
  const count = result[0]?.values[0][0] ?? 0;
  if (count === 0) {
    console.log('🌱 Seeding database...');
    _db.run('INSERT INTO doctors (name, code) VALUES (?, ?)', ['Dr. Priya Rao', 'DR001']);
    const doctorId = getLastInsertRowid();

    const patients = [
      { name: 'Ravi Kumar',        phone: '9876543210', meds: [['Metformin 500mg','Twice daily'],['Lisinopril 10mg','Once daily'],['Amlodipine 5mg','Once daily']] },
      { name: 'Sunita Devi',       phone: '9823456789', meds: [['Atorvastatin 20mg','Once at night'],['Aspirin 75mg','Once daily']] },
      { name: 'Arjun Sharma',      phone: '9812345678', meds: [['Omeprazole 20mg','Before meals'],['Pantoprazole 40mg','Once daily'],['Domperidone 10mg','Three times daily'],['Multivitamin','Once daily']] },
      { name: 'Meena Pillai',      phone: '9801234567', meds: [['Levothyroxine 50mcg','Once daily (fasting)'],['Calcium 500mg','Twice daily']] },
      { name: 'Deepak Nair',       phone: '9798765432', meds: [['Metoprolol 25mg','Twice daily'],['Telmisartan 40mg','Once daily'],['Furosemide 20mg','Once daily']] },
      { name: 'Kavitha Reddy',     phone: '9787654321', meds: [['Glimepiride 2mg','Before breakfast'],['Voglibose 0.2mg','With meals']] },
      { name: 'Suresh Menon',      phone: '9776543210', meds: [['Clopidogrel 75mg','Once daily'],['Rosuvastatin 10mg','Once at night'],['Ramipril 5mg','Once daily'],['Bisoprolol 5mg','Once daily']] },
      { name: 'Ananya Iyer',       phone: '9765432109', meds: [['Ferrous Sulfate 200mg','Twice daily'],['Folic Acid 5mg','Once daily']] },
      { name: 'Prakash Verma',     phone: '9754321098', meds: [['Allopurinol 100mg','Once daily'],['Colchicine 0.5mg','As needed'],['Etoricoxib 60mg','Once daily']] },
      { name: 'Latha Subramaniam', phone: '9743210987', meds: [['Escitalopram 10mg','Once daily'],['Clonazepam 0.5mg','At bedtime'],['Vitamin D3 60000IU','Weekly']] },
      { name: 'Ramesh Gupta',      phone: '9732109876', meds: [['Sitagliptin 100mg','Once daily'],['Metformin 1000mg','Twice daily'],['Empagliflozin 10mg','Once daily'],['Vitamin B12 500mcg','Once daily']] },
      { name: 'Preethi Krishnan',  phone: '9721098765', meds: [['Montelukast 10mg','At bedtime'],['Salbutamol Inhaler','As needed'],['Fluticasone Inhaler','Twice daily']] },
    ];

    const getDates = () => {
      const dates = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
      }
      return dates;
    };
    const dates = getDates();

    _inTransaction = true;
    _db.run('BEGIN TRANSACTION');
    for (const p of patients) {
      _db.run('INSERT INTO patients (name, phone, doctor_id) VALUES (?, ?, ?)', [p.name, p.phone, doctorId]);
      const patientId = getLastInsertRowid();
      for (const [medName, freq] of p.meds) {
        _db.run('INSERT INTO medications (patient_id, name, frequency) VALUES (?, ?, ?)', [patientId, medName, freq]);
        const medId = getLastInsertRowid();
        for (const date of dates) {
          const taken = date < dates[dates.length - 1] ? (Math.random() > 0.3 ? 1 : 0) : 0;
          _db.run('INSERT INTO medication_logs (medication_id, date, taken) VALUES (?, ?, ?)', [medId, date, taken]);
        }
      }
    }
    _db.run('COMMIT');
    _inTransaction = false;
    save();
    console.log('✅ Database seeded successfully!');
  }
}

db.initDb = initDb;
module.exports = db;
