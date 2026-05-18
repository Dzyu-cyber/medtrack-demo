const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const db = require('./db');

const authRoutes = require('./routes/auth');
const patientsRoutes = require('./routes/patients');
const medicationsRoutes = require('./routes/medications');
const { registerSocketHandlers } = require('./socket');

async function main() {
  await db.initDb();

  const app = express();
  const httpServer = http.createServer(app);

  const io = new Server(httpServer, {
    cors: { origin: 'http://localhost:5173', methods: ['GET', 'POST', 'PATCH'] },
  });

  app.use(cors({ origin: 'http://localhost:5173' }));
  app.use(express.json());

  medicationsRoutes.setIO(io);

  app.use('/api/auth', authRoutes);
  app.use('/api/patients', patientsRoutes);
  app.use('/api/medications', medicationsRoutes);

  registerSocketHandlers(io);

  app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

  const PORT = 3001;
  httpServer.listen(PORT, () => {
    console.log(`\n🚀 MedTrack backend → http://localhost:${PORT}\n`);
  });
}

main().catch(console.error);
