import { Router } from 'express';
import { db } from '../db';
import { authenticate, requireRole } from '../middleware/auth';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get('/', requireRole(['admin', 'editor']), async (_req, res) => {
  const [activeProjectsRows] = await db.query(
    `SELECT COUNT(*) AS total FROM projects WHERE status = 'active'`
  );
  const [newQuotesRows] = await db.query(
    `SELECT COUNT(*) AS total FROM quotes WHERE status = 'new'`
  );
  const [sentQuotesRows] = await db.query(
    `SELECT COUNT(*) AS total FROM quotes WHERE status = 'sent'`
  );
  const [publishedPagesRows] = await db.query(
    `SELECT COUNT(*) AS total FROM pages WHERE status = 'published'`
  );

  const activeProjects = Array.isArray(activeProjectsRows)
    ? Number(activeProjectsRows[0]?.total ?? 0)
    : 0;
  const newQuotes = Array.isArray(newQuotesRows) ? Number(newQuotesRows[0]?.total ?? 0) : 0;
  const sentQuotes = Array.isArray(sentQuotesRows) ? Number(sentQuotesRows[0]?.total ?? 0) : 0;
  const publishedPages = Array.isArray(publishedPagesRows)
    ? Number(publishedPagesRows[0]?.total ?? 0)
    : 0;

  const [activityRows] = await db.query(
    `SELECT type, happened_at, message
     FROM (
       SELECT 'quote' AS type, q.created_at AS happened_at,
              CONCAT('Cotizacion: ', q.project_name, ' (', q.status, ')') AS message
       FROM quotes q
       UNION ALL
       SELECT 'project' AS type, p.created_at AS happened_at,
              CONCAT('Proyecto: ', p.name, ' (', p.status, ')') AS message
       FROM projects p
       UNION ALL
       SELECT 'page' AS type, p.updated_at AS happened_at,
              CONCAT('Pagina: ', p.title, ' (', p.status, ')') AS message
       FROM pages p
     ) AS activity
     ORDER BY happened_at DESC
     LIMIT 6`
  );

  const activity = Array.isArray(activityRows)
    ? activityRows.map((row: any) => ({
        type: row.type,
        message: row.message,
        happenedAt: row.happened_at
      }))
    : [];

  return res.json({
    stats: {
      activeProjects,
      newQuotes,
      sentQuotes,
      publishedPages
    },
    activity
  });
});
