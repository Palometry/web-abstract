import { Router } from 'express';
import { db } from '../db';
import { authenticate, requireRole } from '../middleware/auth';

export const portfolioRouter = Router();

async function fetchPortfolioDetail(portfolioId: number) {
  const [rows] = await db.query(
    `SELECT pe.id, pe.project_id, pe.title_override, pe.category, pe.summary, pe.autocad_url,
            pe.sort_order, pe.is_visible, p.name AS project_name
     FROM portfolio_entries pe
     LEFT JOIN projects p ON p.id = pe.project_id
     WHERE pe.id = ?
     LIMIT 1`,
    [portfolioId]
  );

  const entry = Array.isArray(rows) ? rows[0] : undefined;
  if (!entry) {
    return null;
  }

  const [imageRows] = await db.query(
    `SELECT pi.id, pi.media_id, pi.image_type, pi.sort_order,
            m.file_url, m.title, m.alt_text
     FROM portfolio_images pi
     INNER JOIN media_assets m ON m.id = pi.media_id
     WHERE pi.portfolio_id = ?
     ORDER BY pi.sort_order ASC, pi.id ASC`,
    [portfolioId]
  );

  let cover = null as null | {
    id: number;
    mediaId: number;
    fileUrl: string;
    title: string | null;
    altText: string | null;
    imageType: string;
    sortOrder: number;
  };
  const hero: typeof cover[] = [];
  const gallery: typeof cover[] = [];

  if (Array.isArray(imageRows)) {
    for (const row of imageRows as any[]) {
      const image = {
        id: row.id,
        mediaId: row.media_id,
        fileUrl: row.file_url,
        title: row.title ?? null,
        altText: row.alt_text ?? null,
        imageType: row.image_type,
        sortOrder: row.sort_order
      };
      if (row.image_type === 'cover') {
        if (!cover) {
          cover = image;
        }
      } else if (row.image_type === 'hero') {
        hero.push(image);
      } else {
        gallery.push(image);
      }
    }
  }

  const [specRows] = await db.query(
    `SELECT id, label, value, sort_order
     FROM portfolio_specs
     WHERE portfolio_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [portfolioId]
  );

  const specs = Array.isArray(specRows)
    ? specRows.map((row: any) => ({
        id: row.id,
        label: row.label,
        value: row.value,
        sortOrder: row.sort_order
      }))
    : [];

  const [tagRows] = await db.query(
    `SELECT id, tag, sort_order
     FROM portfolio_tags
     WHERE portfolio_id = ?
     ORDER BY sort_order ASC, id ASC`,
    [portfolioId]
  );

  const tags = Array.isArray(tagRows)
    ? tagRows.map((row: any) => ({
        id: row.id,
        tag: row.tag,
        sortOrder: row.sort_order
      }))
    : [];

  const [blockRows] = await db.query(
    `SELECT pb.id, pb.block_type, pb.text_content, pb.media_id, pb.caption,
            pb.layout, pb.sort_order, pb.is_visible, m.file_url
     FROM portfolio_blocks pb
     LEFT JOIN media_assets m ON m.id = pb.media_id
     WHERE pb.portfolio_id = ?
     ORDER BY pb.sort_order ASC, pb.id ASC`,
    [portfolioId]
  );

  const blocks = Array.isArray(blockRows)
    ? blockRows.map((row: any) => ({
        id: row.id,
        blockType: row.block_type,
        textContent: row.text_content,
        mediaId: row.media_id,
        fileUrl: row.file_url ?? null,
        caption: row.caption,
        layout: row.layout,
        sortOrder: row.sort_order,
        isVisible: !!row.is_visible
      }))
    : [];

  return {
    id: entry.id,
    projectId: entry.project_id,
    projectName: entry.project_name ?? null,
    titleOverride: entry.title_override ?? null,
    category: entry.category ?? null,
    summary: entry.summary ?? null,
    autocadUrl: entry.autocad_url ?? null,
    sortOrder: entry.sort_order,
    isVisible: !!entry.is_visible,
    images: {
      cover,
      hero,
      gallery
    },
    specs,
    tags,
    blocks
  };
}

portfolioRouter.get('/public', async (_req, res) => {
  const [rows] = await db.query(
    `SELECT pe.id, pe.title_override, pe.category, pe.summary, pe.sort_order,
            p.name AS project_name,
            (
              SELECT m.file_url
              FROM portfolio_images pi
              INNER JOIN media_assets m ON m.id = pi.media_id
              WHERE pi.portfolio_id = pe.id AND pi.image_type IN ('cover', 'hero')
              ORDER BY
                CASE WHEN pi.image_type = 'cover' THEN 0 ELSE 1 END,
                pi.sort_order ASC,
                pi.id ASC
              LIMIT 1
            ) AS cover_url
     FROM portfolio_entries pe
     LEFT JOIN projects p ON p.id = pe.project_id
     WHERE pe.is_visible = 1
     ORDER BY pe.sort_order ASC, pe.id DESC`
  );

  const entries = Array.isArray(rows)
    ? rows.map((row: any) => ({
        id: row.id,
        title: row.title_override || row.project_name || 'Proyecto',
        category: row.category ?? null,
        description: row.summary ?? null,
        coverImage: row.cover_url ?? null
      }))
    : [];

  return res.json(entries);
});

portfolioRouter.get('/public/:id', async (req, res) => {
  const portfolioId = Number(req.params['id']);
  if (!Number.isFinite(portfolioId)) {
    return res.status(400).json({ error: 'Invalid portfolio id.' });
  }

  const detail = await fetchPortfolioDetail(portfolioId);
  if (!detail || !detail.isVisible) {
    return res.status(404).json({ error: 'Portfolio entry not found.' });
  }

  return res.json({
    id: detail.id,
    title: detail.titleOverride || detail.projectName || 'Proyecto',
    category: detail.category,
    description: detail.summary,
    autocadUrl: detail.autocadUrl,
    heroImages: (detail.images.hero.length
      ? detail.images.hero.map((img) => img?.fileUrl)
      : detail.images.cover
        ? [detail.images.cover.fileUrl]
        : []
    ).filter(Boolean),
    coverImage: detail.images.cover?.fileUrl ?? null,
    gallery: detail.images.gallery.map((img) => img?.fileUrl).filter(Boolean),
    specs: detail.specs.map((spec) => ({
      label: spec.label,
      value: spec.value
    })),
    tags: detail.tags.map((tag) => tag.tag),
    blocks: detail.blocks.map((block) => ({
      type: block.blockType,
      text: block.textContent ?? null,
      src: block.fileUrl ?? null,
      caption: block.caption ?? null,
      layout: block.layout ?? 'inline'
    }))
  });
});

portfolioRouter.use(authenticate);

portfolioRouter.get('/', requireRole(['admin', 'editor']), async (_req, res) => {
  const [rows] = await db.query(
    `SELECT pe.id, pe.project_id, pe.sort_order, pe.is_visible, pe.title_override,
            p.name AS project_name
     FROM portfolio_entries pe
     LEFT JOIN projects p ON p.id = pe.project_id
     ORDER BY pe.sort_order ASC, pe.id DESC`
  );

  const entries = Array.isArray(rows)
    ? rows.map((row: any) => ({
        id: row.id,
        projectId: row.project_id,
        order: row.sort_order,
        project: row.project_name ?? 'Sin proyecto',
        visible: !!row.is_visible,
        titleOverride: row.title_override
      }))
    : [];

  return res.json(entries);
});

portfolioRouter.get('/:id', requireRole(['admin', 'editor']), async (req, res) => {
  const portfolioId = Number(req.params['id']);
  if (!Number.isFinite(portfolioId)) {
    return res.status(400).json({ error: 'Invalid portfolio id.' });
  }

  const detail = await fetchPortfolioDetail(portfolioId);
  if (!detail) {
    return res.status(404).json({ error: 'Portfolio entry not found.' });
  }

  return res.json(detail);
});

portfolioRouter.put('/:id', requireRole(['admin', 'editor']), async (req, res) => {
  const portfolioId = Number(req.params['id']);
  if (!Number.isFinite(portfolioId)) {
    return res.status(400).json({ error: 'Invalid portfolio id.' });
  }

  const {
    titleOverride,
    category,
    summary,
    autocadUrl,
    sortOrder,
    isVisible,
    coverMediaId,
    heroMediaIds,
    galleryMediaIds,
    specs,
    tags,
    blocks
  } = req.body as {
    titleOverride?: string | null;
    category?: string | null;
    summary?: string | null;
    autocadUrl?: string | null;
    sortOrder?: number;
    isVisible?: boolean;
    coverMediaId?: number | null;
    heroMediaIds?: number[];
    galleryMediaIds?: number[];
    specs?: { label: string; value: string }[];
    tags?: string[];
    blocks?: {
      blockType: 'text' | 'image';
      textContent?: string | null;
      mediaId?: number | null;
      caption?: string | null;
      layout?: 'wide' | 'inline';
      isVisible?: boolean;
    }[];
  };

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query('SELECT id FROM portfolio_entries WHERE id = ? LIMIT 1', [
      portfolioId
    ]);
    if (!Array.isArray(rows) || !rows[0]) {
      await connection.rollback();
      return res.status(404).json({ error: 'Portfolio entry not found.' });
    }

    const updates: string[] = [];
    const params: any[] = [];
    if (titleOverride !== undefined) {
      updates.push('title_override = ?');
      params.push(titleOverride);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }
    if (summary !== undefined) {
      updates.push('summary = ?');
      params.push(summary);
    }
    if (autocadUrl !== undefined) {
      updates.push('autocad_url = ?');
      params.push(autocadUrl);
    }
    if (sortOrder !== undefined) {
      updates.push('sort_order = ?');
      params.push(sortOrder);
    }
    if (isVisible !== undefined) {
      updates.push('is_visible = ?');
      params.push(isVisible ? 1 : 0);
    }
    if (updates.length) {
      await connection.query(`UPDATE portfolio_entries SET ${updates.join(', ')} WHERE id = ?`, [
        ...params,
        portfolioId
      ]);
    }

    if (coverMediaId !== undefined || heroMediaIds !== undefined || galleryMediaIds !== undefined) {
      await connection.query('DELETE FROM portfolio_images WHERE portfolio_id = ?', [portfolioId]);

      if (coverMediaId) {
        await connection.query(
          `INSERT INTO portfolio_images (portfolio_id, media_id, image_type, sort_order)
           VALUES (?, ?, 'cover', 0)`,
          [portfolioId, coverMediaId]
        );
      }

      if (Array.isArray(heroMediaIds)) {
        for (const [index, mediaId] of heroMediaIds.entries()) {
          if (!mediaId) continue;
          await connection.query(
            `INSERT INTO portfolio_images (portfolio_id, media_id, image_type, sort_order)
             VALUES (?, ?, 'hero', ?)`,
            [portfolioId, mediaId, index]
          );
        }
      }

      if (Array.isArray(galleryMediaIds)) {
        for (const [index, mediaId] of galleryMediaIds.entries()) {
          if (!mediaId) continue;
          await connection.query(
            `INSERT INTO portfolio_images (portfolio_id, media_id, image_type, sort_order)
             VALUES (?, ?, 'gallery', ?)`,
            [portfolioId, mediaId, index]
          );
        }
      }
    }

    if (Array.isArray(specs)) {
      await connection.query('DELETE FROM portfolio_specs WHERE portfolio_id = ?', [portfolioId]);
      for (const [index, spec] of specs.entries()) {
        if (!spec?.label || !spec?.value) continue;
        await connection.query(
          `INSERT INTO portfolio_specs (portfolio_id, label, value, sort_order)
           VALUES (?, ?, ?, ?)`,
          [portfolioId, spec.label, spec.value, index]
        );
      }
    }

    if (Array.isArray(tags)) {
      await connection.query('DELETE FROM portfolio_tags WHERE portfolio_id = ?', [portfolioId]);
      for (const [index, tag] of tags.entries()) {
        if (!tag) continue;
        await connection.query(
          `INSERT INTO portfolio_tags (portfolio_id, tag, sort_order)
           VALUES (?, ?, ?)`,
          [portfolioId, tag, index]
        );
      }
    }

    if (Array.isArray(blocks)) {
      await connection.query('DELETE FROM portfolio_blocks WHERE portfolio_id = ?', [portfolioId]);
      for (const [index, block] of blocks.entries()) {
        if (!block?.blockType) continue;
        await connection.query(
          `INSERT INTO portfolio_blocks
           (portfolio_id, block_type, text_content, media_id, caption, layout, sort_order, is_visible)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            portfolioId,
            block.blockType,
            block.blockType === 'text' ? block.textContent ?? null : null,
            block.blockType === 'image' ? block.mediaId ?? null : null,
            block.caption ?? null,
            block.layout ?? 'inline',
            index,
            block.isVisible === false ? 0 : 1
          ]
        );
      }
    }

    await connection.commit();
    return res.json({ ok: true });
  } catch {
    await connection.rollback();
    return res.status(500).json({ error: 'Failed to update portfolio entry.' });
  } finally {
    connection.release();
  }
});
