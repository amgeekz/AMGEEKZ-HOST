import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import apiRouter, { setSocketIo } from './src/routes/api';
import { BotService } from './src/services/botService';
import { syncFromFirestore } from './src/db/dbInstance';

const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  
  // Sync database with Firestore if config/service account is initialized
  try {
    await syncFromFirestore();
  } catch (syncErr) {
    console.error("💥 Failed loading Firestore initial state upon starting:", syncErr);
  }
  
  // Set up Socket.io with allowed CORS origins
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Share Socket.io context with API routes for live events dispatching
  setSocketIo(io);

  // Parse payloads
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Mount API paths
  app.use('/api', apiRouter);

  // Standard health check
  app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Socket configurations
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected to Realtime Socket.ID: ${socket.id}`);
    
    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected from Socket.ID: ${socket.id}`);
    });
  });

  // Standard daily simulation interval check (cron job simulation representation)
  // Run once immediately on boots, and then every 1 hour (represented as daily sweeps cron)
  try {
    BotService.cronDailyCleanup();
  } catch (cronErr) {
    console.error("Failed running startup daily cleanup:", cronErr);
  }
  
  const SWEEP_INTERVAL = 60 * 60 * 1000; // 1 hour
  setInterval(() => {
    try {
      BotService.cronDailyCleanup();
    } catch (err) {
      console.error("Cron sweep errored:", err);
    }
  }, SWEEP_INTERVAL);

  // Serve Frontend assets (Vite dev middleware vs production build folder)
  if (process.env.NODE_ENV !== 'production') {
    console.log('⚡ Development Mode: Mounting Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    console.log('🚀 Production Mode: Serving static compiled SPA elements...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(Number(PORT), '0.0.0.0', () => {
    const brand = process.env.VITE_BRAND_NAME || 'GeekzCS';
    console.log(`===============================================`);
    console.log(`📡 ${brand} WA Bot Hosting Server is ONLINE`);
    console.log(`🔗 Local Address: http://localhost:${PORT}`);
    console.log(`🌍 External URL Ingress running on port ${PORT}`);
    console.log(`===============================================`);
  });
}

startServer().catch((error) => {
  const brand = process.env.VITE_BRAND_NAME || 'GeekzCS';
  console.error(`💥 FAILED starting ${brand} server application:`, error);
});
