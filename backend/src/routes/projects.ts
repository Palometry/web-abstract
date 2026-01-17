import { Router } from 'express';
import { db } from '../db';
import { authenticate, requireRole } from '../middleware/auth';

export const projectsRouter = Router();

projectsRouter.use(authenticate);

projectsRouter.get('/', requireRole(['admin', 'editor']), async (_req, res) => {
  const [rows] = await db.query(
    `SELECT p.id, p.name, p.client_name, p.address, p.status,
            MAX(CASE WHEN pe.is_visible = 1 THEN 1 ELSE 0 END) AS in_portfolio
     FROM projects p
     LEFT JOIN portfolio_entries pe ON pe.project_id = p.id
     GROUP BY p.id
     ORDER BY p.id DESC`
  );

  const projects = Array.isArray(rows)
    ? rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        clientName: row.client_name,
        address: row.address,
        status: row.status,
        portfolio: Boolean(row.in_portfolio)
      }))
    : [];

  return res.json(projects);
});

projectsRouter.post('/', requireRole(['admin', 'editor']), async (req, res) => {
  const { name, clientName, address, description, status, startDate, endDate } = req.body as {
    name?: string;
    clientName?: string;
    address?: string;
    description?: string | null;
    status?: string;
    startDate?: string | null;
    endDate?: string | null;
  };

  if (!name || !clientName || !address) {
    return res.status(400).json({ error: 'Name, clientName, and address are required.' });
  }

  const [result] = await db.query(
    `INSERT INTO projects (name, client_name, address, description, status, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      name,
      clientName,
      address,
      description ?? null,
      status ?? 'draft',
      startDate ?? null,
      endDate ?? null
    ]
  );

  return res.status(201).json({ id: (result as any).insertId });
});

projectsRouter.get('/:id', requireRole(['admin', 'editor']), async (req, res) => {
  const projectId = Number(req.params['id']);
  if (!Number.isFinite(projectId)) {
    return res.status(400).json({ error: 'Invalid project id.' });
  }

  const [rows] = await db.query(
    `SELECT p.id, p.name, p.client_name, p.address, p.description, p.status,
            p.start_date, p.end_date,
            MAX(CASE WHEN pe.is_visible = 1 THEN 1 ELSE 0 END) AS in_portfolio
     FROM projects p
     LEFT JOIN portfolio_entries pe ON pe.project_id = p.id
     WHERE p.id = ?
     GROUP BY p.id
     LIMIT 1`,
    [projectId]
  );

  const project = Array.isArray(rows) ? rows[0] : undefined;
  if (!project) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  const [portfolioRows] = await db.query(
    `SELECT id, title_override, sort_order, is_visible
     FROM portfolio_entries
     WHERE project_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [projectId]
  );
  const portfolio = Array.isArray(portfolioRows) ? portfolioRows[0] : undefined;

  const [imageRows] = await db.query(
    `SELECT pi.id, pi.media_id, pi.is_cover, pi.sort_order,
            m.file_url, m.title, m.alt_text
     FROM project_images pi
     INNER JOIN media_assets m ON m.id = pi.media_id
     WHERE pi.project_id = ?
     ORDER BY pi.is_cover DESC, pi.sort_order ASC, pi.id ASC`,
    [projectId]
  );
  const images = Array.isArray(imageRows)
    ? imageRows.map((row: any) => ({
        id: row.id,
        mediaId: row.media_id,
        fileUrl: row.file_url,
        title: row.title,
        altText: row.alt_text,
        isCover: !!row.is_cover,
        sortOrder: row.sort_order
      }))
    : [];

  return res.json({
    id: project.id,
    name: project.name,
    clientName: project.client_name,
    address: project.address,
    description: project.description,
    status: project.status,
    startDate: project.start_date,
    endDate: project.end_date,
    portfolio: !!project.in_portfolio,
    portfolioEntry: portfolio
      ? {
          id: portfolio.id,
          titleOverride: portfolio.title_override,
          sortOrder: portfolio.sort_order,
          isVisible: !!portfolio.is_visible
        }
      : null,
    images
  });
});

projectsRouter.patch('/:id', requireRole(['admin', 'editor']), async (req, res) => {
  const projectId = Number(req.params['id']);
  if (!Number.isFinite(projectId)) {
    return res.status(400).json({ error: 'Invalid project id.' });
  }

  const { name, clientName, address, description, status, startDate, endDate } = req.body as {
    name?: string;
    clientName?: string;
    address?: string;
    description?: string | null;
    status?: string;
    startDate?: string | null;
    endDate?: string | null;
  };

  const updates: string[] = [];
  const params: any[] = [];

  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  if (clientName !== undefined) {
    updates.push('client_name = ?');
    params.push(clientName);
  }
  if (address !== undefined) {
    updates.push('address = ?');
    params.push(address);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
  }
  if (startDate !== undefined) {
    updates.push('start_date = ?');
    params.push(startDate);
  }
  if (endDate !== undefined) {
    updates.push('end_date = ?');
    params.push(endDate);
  }

  if (!updates.length) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  await db.query(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, [
    ...params,
    projectId
  ]);
  return res.json({ ok: true });
});

projectsRouter.delete('/:id', requireRole(['admin', 'editor']), async (req, res) => {
  const projectId = Number(req.params['id']);
  if (!Number.isFinite(projectId)) {
    return res.status(400).json({ error: 'Invalid project id.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM project_images WHERE project_id = ?', [projectId]);
    await connection.query('DELETE FROM portfolio_entries WHERE project_id = ?', [projectId]);
    const [result] = await connection.query('DELETE FROM projects WHERE id = ?', [projectId]);
    await connection.commit();
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Project not found.' });
    }
    return res.status(204).send();
  } catch {
    await connection.rollback();
    return res.status(500).json({ error: 'Failed to delete project.' });
  } finally {
    connection.release();
  }
});

projectsRouter.put('/:id/portfolio', requireRole(['admin', 'editor']), async (req, res) => {
  const projectId = Number(req.params['id']);
  if (!Number.isFinite(projectId)) {
    return res.status(400).json({ error: 'Invalid project id.' });
  }

  const { titleOverride, sortOrder, isVisible } = req.body as {
    titleOverride?: string | null;
    sortOrder?: number;
    isVisible?: boolean;
  };

  const [projectRows] = await db.query('SELECT id FROM projects WHERE id = ? LIMIT 1', [projectId]);
  const project = Array.isArray(projectRows) ? projectRows[0] : undefined;
  if (!project) {
    return res.status(404).json({ error: 'Project not found.' });
  }

  const [existingRows] = await db.query(
    'SELECT id FROM portfolio_entries WHERE project_id = ? LIMIT 1',
    [projectId]
  );
  const existing = Array.isArray(existingRows) ? existingRows[0] : undefined;

  if (!existing) {
    const [result] = await db.query(
      `INSERT INTO portfolio_entries (project_id, title_override, sort_order, is_visible)
       VALUES (?, ?, ?, ?)`,
      [projectId, titleOverride ?? null, sortOrder ?? 0, isVisible === false ? 0 : 1]
    );
    return res.status(201).json({ id: (result as any).insertId });
  }

  const updates: string[] = [];
  const params: any[] = [];
  if (titleOverride !== undefined) {
    updates.push('title_override = ?');
    params.push(titleOverride);
  }
  if (sortOrder !== undefined) {
    updates.push('sort_order = ?');
    params.push(sortOrder);
  }
  if (isVisible !== undefined) {
    updates.push('is_visible = ?');
    params.push(isVisible ? 1 : 0);
  }
  if (!updates.length) {
    return res.json({ ok: true });
  }

  await db.query(`UPDATE portfolio_entries SET ${updates.join(', ')} WHERE project_id = ?`, [
    ...params,
    projectId
  ]);
  return res.json({ ok: true });
});

projectsRouter.delete('/:id/portfolio', requireRole(['admin', 'editor']), async (req, res) => {
  const projectId = Number(req.params['id']);
  if (!Number.isFinite(projectId)) {
    return res.status(400).json({ error: 'Invalid project id.' });
  }

  const [result] = await db.query('DELETE FROM portfolio_entries WHERE project_id = ?', [projectId]);
  if ((result as any).affectedRows === 0) {
    return res.status(404).json({ error: 'Portfolio entry not found.' });
  }
  return res.status(204).send();
});

projectsRouter.get('/:id/images', requireRole(['admin', 'editor']), async (req, res) => {
  const projectId = Number(req.params['id']);
  if (!Number.isFinite(projectId)) {
    return res.status(400).json({ error: 'Invalid project id.' });
  }

  const [rows] = await db.query(
    `SELECT pi.id, pi.media_id, pi.is_cover, pi.sort_order,
            m.file_url, m.title, m.alt_text
     FROM project_images pi
     INNER JOIN media_assets m ON m.id = pi.media_id
     WHERE pi.project_id = ?
     ORDER BY pi.is_cover DESC, pi.sort_order ASC, pi.id ASC`,
    [projectId]
  );

  const images = Array.isArray(rows)
    ? rows.map((row: any) => ({
        id: row.id,
        mediaId: row.media_id,
        fileUrl: row.file_url,
        title: row.title,
        altText: row.alt_text,
        isCover: !!row.is_cover,
        sortOrder: row.sort_order
      }))
    : [];

  return res.json(images);
});

projectsRouter.post('/:id/images', requireRole(['admin', 'editor']), async (req, res) => {
  const projectId = Number(req.params['id']);
  if (!Number.isFinite(projectId)) {
    return res.status(400).json({ error: 'Invalid project id.' });
  }

  const { fileUrl, title, altText, isCover, sortOrder } = req.body as {
    fileUrl?: string;
    title?: string | null;
    altText?: string | null;
    isCover?: boolean;
    sortOrder?: number;
  };

  if (!fileUrl) {
    return res.status(400).json({ error: 'fileUrl is required.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    if (isCover) {
      await connection.query(
        'UPDATE project_images SET is_cover = 0 WHERE project_id = ?',
        [projectId]
      );
    }
    const [mediaResult] = await connection.query(
      `INSERT INTO media_assets (file_url, title, alt_text)
       VALUES (?, ?, ?)`,
      [fileUrl, title ?? null, altText ?? null]
    );
    const mediaId = (mediaResult as any).insertId as number;
    const [imageResult] = await connection.query(
      `INSERT INTO project_images (project_id, media_id, is_cover, sort_order)
       VALUES (?, ?, ?, ?)`,
      [projectId, mediaId, isCover ? 1 : 0, sortOrder ?? 0]
    );
    await connection.commit();
    return res.status(201).json({ id: (imageResult as any).insertId });
  } catch {
    await connection.rollback();
    return res.status(500).json({ error: 'Failed to add image.' });
  } finally {
    connection.release();
  }
});

projectsRouter.patch('/:id/images/:imageId', requireRole(['admin', 'editor']), async (req, res) => {
  const projectId = Number(req.params['id']);
  const imageId = Number(req.params['imageId']);
  if (!Number.isFinite(projectId) || !Number.isFinite(imageId)) {
    return res.status(400).json({ error: 'Invalid ids.' });
  }

  const { fileUrl, title, altText, isCover, sortOrder } = req.body as {
    fileUrl?: string | null;
    title?: string | null;
    altText?: string | null;
    isCover?: boolean;
    sortOrder?: number;
  };

  const [rows] = await db.query(
    `SELECT media_id FROM project_images WHERE id = ? AND project_id = ? LIMIT 1`,
    [imageId, projectId]
  );
  const record = Array.isArray(rows) ? rows[0] : undefined;
  if (!record) {
    return res.status(404).json({ error: 'Image not found.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    if (isCover) {
      await connection.query(
        'UPDATE project_images SET is_cover = 0 WHERE project_id = ?',
        [projectId]
      );
    }

    const imageUpdates: string[] = [];
    const imageParams: any[] = [];
    if (isCover !== undefined) {
      imageUpdates.push('is_cover = ?');
      imageParams.push(isCover ? 1 : 0);
    }
    if (sortOrder !== undefined) {
      imageUpdates.push('sort_order = ?');
      imageParams.push(sortOrder);
    }
    if (imageUpdates.length) {
      await connection.query(
        `UPDATE project_images SET ${imageUpdates.join(', ')} WHERE id = ? AND project_id = ?`,
        [...imageParams, imageId, projectId]
      );
    }

    const mediaUpdates: string[] = [];
    const mediaParams: any[] = [];
    if (fileUrl !== undefined) {
      mediaUpdates.push('file_url = ?');
      mediaParams.push(fileUrl);
    }
    if (title !== undefined) {
      mediaUpdates.push('title = ?');
      mediaParams.push(title);
    }
    if (altText !== undefined) {
      mediaUpdates.push('alt_text = ?');
      mediaParams.push(altText);
    }
    if (mediaUpdates.length) {
      await connection.query(
        `UPDATE media_assets SET ${mediaUpdates.join(', ')} WHERE id = ?`,
        [...mediaParams, record.media_id]
      );
    }

    await connection.commit();
    return res.json({ ok: true });
  } catch {
    await connection.rollback();
    return res.status(500).json({ error: 'Failed to update image.' });
  } finally {
    connection.release();
  }
});

projectsRouter.delete('/:id/images/:imageId', requireRole(['admin', 'editor']), async (req, res) => {
  const projectId = Number(req.params['id']);
  const imageId = Number(req.params['imageId']);
  if (!Number.isFinite(projectId) || !Number.isFinite(imageId)) {
    return res.status(400).json({ error: 'Invalid ids.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      `SELECT media_id FROM project_images WHERE id = ? AND project_id = ? LIMIT 1`,
      [imageId, projectId]
    );
    const record = Array.isArray(rows) ? rows[0] : undefined;
    if (!record) {
      await connection.rollback();
      return res.status(404).json({ error: 'Image not found.' });
    }

    await connection.query('DELETE FROM project_images WHERE id = ? AND project_id = ?', [
      imageId,
      projectId
    ]);

    const [countRows] = await connection.query(
      'SELECT COUNT(*) AS total FROM project_images WHERE media_id = ?',
      [record.media_id]
    );
    const total = Array.isArray(countRows) ? Number(countRows[0]?.total) : 0;
    if (total === 0) {
      await connection.query('DELETE FROM media_assets WHERE id = ?', [record.media_id]);
    }

    await connection.commit();
    return res.status(204).send();
  } catch {
    await connection.rollback();
    return res.status(500).json({ error: 'Failed to delete image.' });
  } finally {
    connection.release();
  }
});
