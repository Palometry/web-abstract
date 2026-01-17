import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { pagesRouter } from './routes/pages';
import { projectsRouter } from './routes/projects';
import { portfolioRouter } from './routes/portfolio';
import { quotesRouter } from './routes/quotes';
import { servicesRouter } from './routes/services';
import { dashboardRouter } from './routes/dashboard';

dotenv.config();

const app = express();
const port = Number(process.env['PORT'] || 4001);
const corsOrigin = process.env['CORS_ORIGIN'] || 'http://localhost:4200';

app.disable('etag');
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/pages', pagesRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/quotes', quotesRouter);
app.use('/api/services', servicesRouter);
app.use('/api/dashboard', dashboardRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
