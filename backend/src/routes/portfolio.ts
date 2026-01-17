import { Router } from 'express';
import { db } from '../db';
import { authenticate, requireRole } from '../middleware/auth';

export const portfolioRouter = Router();

portfolioRouter.use(authenticate);

portfolioRouter.get('/', requireRole(['admin', 'editor']), async (_req, res) => {
  const [rows] = await db.query(
    `SELECT pe.id, pe.project_id, pe.sort_order, pe.is_visible, pe.title_override,
            p.name AS project_name
     FROM portfolio_entries pe
     INNER JOIN projects p ON p.id = pe.project_id
     ORDER BY pe.sort_order ASC, pe.id DESC`
  );

  const entries = Array.isArray(rows)
    ? rows.map((row: any) => ({
        id: row.id,
        projectId: row.project_id,
        order: row.sort_order,
        project: row.project_name,
        visible: !!row.is_visible,
        titleOverride: row.title_override
      }))
    : [];

  return res.json(entries);
});
