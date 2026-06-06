import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { getDb } from './db/index.js';
import authRoutes from './routes/auth.js';
import pushupRoutes from './routes/pushups.js';
import wearableRoutes from './routes/wearables.js';
import integrationRoutes from './routes/integrations.js';

const PORT = Number(process.env.PORT) || 3001;
const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';

getDb();

const app = express();

app.use(
  cors({
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(passport.initialize());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'fitpulse-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/pushups', pushupRoutes);
app.use('/api/wearables', wearableRoutes);
app.use('/api/integrations', integrationRoutes);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
);

app.listen(PORT, () => {
  console.log(`FitPulse API running on http://localhost:${PORT}`);
  console.log(`  Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? 'enabled' : 'disabled'}`);
  console.log(`  GitHub OAuth: ${process.env.GITHUB_CLIENT_ID ? 'enabled' : 'disabled'}`);
});
