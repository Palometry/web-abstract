import { Router } from 'express';
import { db } from '../db';
import { authenticate, requireRole } from '../middleware/auth';

export const pagesRouter = Router();

pagesRouter.use(authenticate);

const parseJson = (value: unknown) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
};

pagesRouter.get('/', requireRole(['admin', 'editor']), async (_req, res) => {
  const [rows] = await db.query(
    `SELECT p.id, p.title, p.slug, p.status, COUNT(ps.id) AS sections
     FROM pages p
     LEFT JOIN page_sections ps ON ps.page_id = p.id
     GROUP BY p.id
     ORDER BY p.id DESC`
  );

  const pages = Array.isArray(rows)
    ? rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        status: row.status,
        sections: Number(row.sections) || 0
      }))
    : [];

  return res.json(pages);
});

pagesRouter.post('/', requireRole(['admin', 'editor']), async (req, res) => {
  const { title, slug, status, metaTitle, metaDescription } = req.body as {
    title?: string;
    slug?: string;
    status?: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
  };

  if (!title || !slug) {
    return res.status(400).json({ error: 'Title and slug are required.' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO pages (title, slug, status, meta_title, meta_description)
       VALUES (?, ?, ?, ?, ?)`,
      [
        title,
        slug,
        status ?? 'draft',
        metaTitle ?? null,
        metaDescription ?? null
      ]
    );
    return res.status(201).json({ id: (result as any).insertId });
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Slug already exists.' });
    }
    return res.status(500).json({ error: 'Failed to create page.' });
  }
});

pagesRouter.get('/:id', requireRole(['admin', 'editor']), async (req, res) => {
  const pageId = Number(req.params['id']);
  if (!Number.isFinite(pageId)) {
    return res.status(400).json({ error: 'Invalid page id.' });
  }

  const [pageRows] = await db.query(
    `SELECT id, title, slug, status, meta_title, meta_description
     FROM pages WHERE id = ? LIMIT 1`,
    [pageId]
  );
  const page = Array.isArray(pageRows) ? pageRows[0] : undefined;
  if (!page) {
    return res.status(404).json({ error: 'Page not found.' });
  }

  const [sectionRows] = await db.query(
    `SELECT id, section_key, title, description, image_url, sort_order, is_visible
     FROM page_sections
     WHERE page_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [pageId]
  );
  const sections = Array.isArray(sectionRows)
    ? sectionRows.map((row: any) => ({
        id: row.id,
        sectionKey: row.section_key,
        title: row.title,
        description: row.description,
        imageUrl: row.image_url,
        sortOrder: row.sort_order,
        isVisible: !!row.is_visible,
        blocks: [] as any[]
      }))
    : [];

  const sectionIds = sections.map((section) => section.id);
  let blocksBySection = new Map<number, any[]>();
  if (sectionIds.length) {
    const [blockRows] = await db.query(
      `SELECT id, section_id, block_type, content_json, sort_order, is_visible
       FROM section_blocks
       WHERE section_id IN (?)
       ORDER BY sort_order ASC, id ASC`,
      [sectionIds]
    );
    if (Array.isArray(blockRows)) {
      blockRows.forEach((row: any) => {
        const list = blocksBySection.get(row.section_id) ?? [];
        list.push({
          id: row.id,
          blockType: row.block_type,
          content: parseJson(row.content_json),
          sortOrder: row.sort_order,
          isVisible: !!row.is_visible
        });
        blocksBySection.set(row.section_id, list);
      });
    }
  }

  const result = {
    id: page.id,
    title: page.title,
    slug: page.slug,
    status: page.status,
    metaTitle: page.meta_title,
    metaDescription: page.meta_description,
    sections: sections.map((section) => ({
      ...section,
      blocks: blocksBySection.get(section.id) ?? []
    }))
  };

  return res.json(result);
});

pagesRouter.patch('/:id', requireRole(['admin', 'editor']), async (req, res) => {
  const pageId = Number(req.params['id']);
  if (!Number.isFinite(pageId)) {
    return res.status(400).json({ error: 'Invalid page id.' });
  }

  const { title, slug, status, metaTitle, metaDescription } = req.body as {
    title?: string;
    slug?: string;
    status?: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
  };

  const updates: string[] = [];
  const params: any[] = [];

  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title);
  }
  if (slug !== undefined) {
    updates.push('slug = ?');
    params.push(slug);
  }
  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
  }
  if (metaTitle !== undefined) {
    updates.push('meta_title = ?');
    params.push(metaTitle);
  }
  if (metaDescription !== undefined) {
    updates.push('meta_description = ?');
    params.push(metaDescription);
  }

  if (!updates.length) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  try {
    await db.query(`UPDATE pages SET ${updates.join(', ')} WHERE id = ?`, [...params, pageId]);
    return res.json({ ok: true });
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Slug already exists.' });
    }
    return res.status(500).json({ error: 'Failed to update page.' });
  }
});

pagesRouter.delete('/:id', requireRole(['admin', 'editor']), async (req, res) => {
  const pageId = Number(req.params['id']);
  if (!Number.isFinite(pageId)) {
    return res.status(400).json({ error: 'Invalid page id.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [sectionRows] = await connection.query(
      `SELECT id FROM page_sections WHERE page_id = ?`,
      [pageId]
    );
    const sectionIds = Array.isArray(sectionRows)
      ? sectionRows.map((row: any) => row.id)
      : [];
    if (sectionIds.length) {
      await connection.query(`DELETE FROM section_blocks WHERE section_id IN (?)`, [sectionIds]);
    }
    await connection.query(`DELETE FROM page_sections WHERE page_id = ?`, [pageId]);
    const [result] = await connection.query(`DELETE FROM pages WHERE id = ?`, [pageId]);
    await connection.commit();
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Page not found.' });
    }
    return res.status(204).send();
  } catch {
    await connection.rollback();
    return res.status(500).json({ error: 'Failed to delete page.' });
  } finally {
    connection.release();
  }
});

pagesRouter.get('/:id/sections', requireRole(['admin', 'editor']), async (req, res) => {
  const pageId = Number(req.params['id']);
  if (!Number.isFinite(pageId)) {
    return res.status(400).json({ error: 'Invalid page id.' });
  }

  const [rows] = await db.query(
    `SELECT id, section_key, title, description, image_url, sort_order, is_visible
     FROM page_sections
     WHERE page_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [pageId]
  );

  const sections = Array.isArray(rows)
    ? rows.map((row: any) => ({
        id: row.id,
        sectionKey: row.section_key,
        title: row.title,
        description: row.description,
        imageUrl: row.image_url,
        sortOrder: row.sort_order,
        isVisible: !!row.is_visible
      }))
    : [];

  return res.json(sections);
});

pagesRouter.post('/:id/sections', requireRole(['admin', 'editor']), async (req, res) => {
  const pageId = Number(req.params['id']);
  if (!Number.isFinite(pageId)) {
    return res.status(400).json({ error: 'Invalid page id.' });
  }

  const { sectionKey: rawSectionKey, title, description, imageUrl, sortOrder, isVisible } = req.body as {
    sectionKey?: string;
    title?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    sortOrder?: number;
    isVisible?: boolean;
  };

  const sectionKey = rawSectionKey ? String(rawSectionKey).trim() : '';
  if (!sectionKey) {
    return res.status(400).json({ error: 'sectionKey is required.' });
  }

  const [pageRows] = await db.query('SELECT id FROM pages WHERE id = ? LIMIT 1', [pageId]);
  const page = Array.isArray(pageRows) ? pageRows[0] : undefined;
  if (!page) {
    return res.status(404).json({ error: 'Page not found.' });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO page_sections (page_id, section_key, title, description, image_url, sort_order, is_visible)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        pageId,
        sectionKey,
        title ?? null,
        description ?? null,
        imageUrl ?? null,
        sortOrder ?? 0,
        isVisible ? 1 : 0
      ]
    );
    return res.status(201).json({ id: (result as any).insertId });
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'sectionKey already exists for this page.' });
    }
    return res.status(500).json({ error: 'Failed to create section.' });
  }
});

pagesRouter.patch('/sections/:id', requireRole(['admin', 'editor']), async (req, res) => {
  const sectionId = Number(req.params['id']);
  if (!Number.isFinite(sectionId)) {
    return res.status(400).json({ error: 'Invalid section id.' });
  }

  const { sectionKey: rawSectionKey, title, description, imageUrl, sortOrder, isVisible } = req.body as {
    sectionKey?: string;
    title?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    sortOrder?: number;
    isVisible?: boolean;
  };

  const updates: string[] = [];
  const params: any[] = [];

  if (rawSectionKey !== undefined) {
    const sectionKey = String(rawSectionKey).trim();
    if (!sectionKey) {
      return res.status(400).json({ error: 'sectionKey is required.' });
    }
    updates.push('section_key = ?');
    params.push(sectionKey);
  }
  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  if (imageUrl !== undefined) {
    updates.push('image_url = ?');
    params.push(imageUrl);
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
    return res.status(400).json({ error: 'No fields to update.' });
  }

  try {
    await db.query(`UPDATE page_sections SET ${updates.join(', ')} WHERE id = ?`, [
      ...params,
      sectionId
    ]);
    return res.json({ ok: true });
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'sectionKey already exists for this page.' });
    }
    return res.status(500).json({ error: 'Failed to update section.' });
  }
});

pagesRouter.delete('/sections/:id', requireRole(['admin', 'editor']), async (req, res) => {
  const sectionId = Number(req.params['id']);
  if (!Number.isFinite(sectionId)) {
    return res.status(400).json({ error: 'Invalid section id.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('DELETE FROM section_blocks WHERE section_id = ?', [sectionId]);
    const [result] = await connection.query('DELETE FROM page_sections WHERE id = ?', [sectionId]);
    await connection.commit();
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Section not found.' });
    }
    return res.status(204).send();
  } catch {
    await connection.rollback();
    return res.status(500).json({ error: 'Failed to delete section.' });
  } finally {
    connection.release();
  }
});

pagesRouter.get('/sections/:id/blocks', requireRole(['admin', 'editor']), async (req, res) => {
  const sectionId = Number(req.params['id']);
  if (!Number.isFinite(sectionId)) {
    return res.status(400).json({ error: 'Invalid section id.' });
  }

  const [rows] = await db.query(
    `SELECT id, block_type, content_json, sort_order, is_visible
     FROM section_blocks
     WHERE section_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [sectionId]
  );

  const blocks = Array.isArray(rows)
    ? rows.map((row: any) => ({
        id: row.id,
        blockType: row.block_type,
        content: parseJson(row.content_json),
        sortOrder: row.sort_order,
        isVisible: !!row.is_visible
      }))
    : [];

  return res.json(blocks);
});

pagesRouter.post('/sections/:id/blocks', requireRole(['admin', 'editor']), async (req, res) => {
  const sectionId = Number(req.params['id']);
  if (!Number.isFinite(sectionId)) {
    return res.status(400).json({ error: 'Invalid section id.' });
  }

  const { blockType, content, sortOrder, isVisible } = req.body as {
    blockType?: string;
    content?: unknown;
    sortOrder?: number;
    isVisible?: boolean;
  };

  if (!blockType) {
    return res.status(400).json({ error: 'blockType is required.' });
  }

  const [sectionRows] = await db.query('SELECT id FROM page_sections WHERE id = ? LIMIT 1', [
    sectionId
  ]);
  const section = Array.isArray(sectionRows) ? sectionRows[0] : undefined;
  if (!section) {
    return res.status(404).json({ error: 'Section not found.' });
  }

  const contentJson =
    typeof content === 'string' ? content : JSON.stringify(content ?? {});

  const [result] = await db.query(
    `INSERT INTO section_blocks (section_id, block_type, content_json, sort_order, is_visible)
     VALUES (?, ?, ?, ?, ?)`,
    [sectionId, blockType, contentJson, sortOrder ?? 0, isVisible ? 1 : 0]
  );

  return res.status(201).json({ id: (result as any).insertId });
});

pagesRouter.patch('/blocks/:id', requireRole(['admin', 'editor']), async (req, res) => {
  const blockId = Number(req.params['id']);
  if (!Number.isFinite(blockId)) {
    return res.status(400).json({ error: 'Invalid block id.' });
  }

  const { blockType, content, sortOrder, isVisible } = req.body as {
    blockType?: string;
    content?: unknown;
    sortOrder?: number;
    isVisible?: boolean;
  };

  const updates: string[] = [];
  const params: any[] = [];

  if (blockType !== undefined) {
    updates.push('block_type = ?');
    params.push(blockType);
  }
  if (content !== undefined) {
    const contentJson =
      typeof content === 'string' ? content : JSON.stringify(content ?? {});
    updates.push('content_json = ?');
    params.push(contentJson);
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
    return res.status(400).json({ error: 'No fields to update.' });
  }

  await db.query(`UPDATE section_blocks SET ${updates.join(', ')} WHERE id = ?`, [
    ...params,
    blockId
  ]);
  return res.json({ ok: true });
});

pagesRouter.delete('/blocks/:id', requireRole(['admin', 'editor']), async (req, res) => {
  const blockId = Number(req.params['id']);
  if (!Number.isFinite(blockId)) {
    return res.status(400).json({ error: 'Invalid block id.' });
  }

  const [result] = await db.query(`DELETE FROM section_blocks WHERE id = ?`, [blockId]);
  if ((result as any).affectedRows === 0) {
    return res.status(404).json({ error: 'Block not found.' });
  }
  return res.status(204).send();
});
