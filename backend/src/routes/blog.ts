import { Router } from 'express';
import { db } from '../db';
import { authenticate, requireRole } from '../middleware/auth';

export const blogRouter = Router();

blogRouter.get('/public', async (_req, res) => {
  const [rows] = await db.query(
    `SELECT id, title, slug, excerpt, cover_image_url, published_at, created_at
     FROM blog_posts
     WHERE status = 'published'
     ORDER BY COALESCE(published_at, created_at) DESC, id DESC`
  );

  const posts = Array.isArray(rows)
    ? rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        excerpt: row.excerpt ?? null,
        coverImageUrl: row.cover_image_url ?? null,
        publishedAt: row.published_at ?? null,
        createdAt: row.created_at ?? null
      }))
    : [];

  return res.json(posts);
});

blogRouter.get('/public/:slug', async (req, res) => {
  const slug = String(req.params['slug'] || '').trim();
  if (!slug) {
    return res.status(400).json({ error: 'Invalid blog slug.' });
  }

  const numericId = Number(slug);
  const [rows] = await db.query(
    `SELECT id, title, slug, excerpt, content, cover_image_url, published_at, created_at
     FROM blog_posts
     WHERE status = 'published' AND (slug = ? OR id = ?)
     LIMIT 1`,
    [slug, Number.isFinite(numericId) ? numericId : -1]
  );

  const post = Array.isArray(rows) ? rows[0] : undefined;
  if (!post) {
    return res.status(404).json({ error: 'Blog post not found.' });
  }

  return res.json({
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? null,
    content: post.content ?? null,
    coverImageUrl: post.cover_image_url ?? null,
    publishedAt: post.published_at ?? null,
    createdAt: post.created_at ?? null
  });
});

blogRouter.use(authenticate);

blogRouter.get('/', requireRole(['admin', 'editor']), async (_req, res) => {
  const [rows] = await db.query(
    `SELECT id, title, slug, status, published_at, created_at
     FROM blog_posts
     ORDER BY created_at DESC, id DESC`
  );

  const posts = Array.isArray(rows)
    ? rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        status: row.status,
        publishedAt: row.published_at ?? null,
        createdAt: row.created_at ?? null
      }))
    : [];

  return res.json(posts);
});

blogRouter.post('/', requireRole(['admin', 'editor']), async (req, res) => {
  const { title, slug, excerpt, content, coverImageUrl, status, publishedAt } = req.body as {
    title?: string;
    slug?: string;
    excerpt?: string | null;
    content?: string | null;
    coverImageUrl?: string | null;
    status?: 'draft' | 'published' | string;
    publishedAt?: string | null;
  };

  if (!title || !slug) {
    return res.status(400).json({ error: 'Title and slug are required.' });
  }

  const finalStatus = status === 'published' ? 'published' : 'draft';
  const finalPublishedAt =
    finalStatus === 'published' ? publishedAt ?? new Date().toISOString() : publishedAt ?? null;

  try {
    const [result] = await db.query(
      `INSERT INTO blog_posts
       (title, slug, excerpt, content, cover_image_url, status, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        slug,
        excerpt ?? null,
        content ?? null,
        coverImageUrl ?? null,
        finalStatus,
        finalPublishedAt
      ]
    );
    return res.status(201).json({ id: (result as any).insertId });
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Slug already exists.' });
    }
    return res.status(500).json({ error: 'Failed to create blog post.' });
  }
});

blogRouter.get('/:id', requireRole(['admin', 'editor']), async (req, res) => {
  const postId = Number(req.params['id']);
  if (!Number.isFinite(postId)) {
    return res.status(400).json({ error: 'Invalid blog id.' });
  }

  const [rows] = await db.query(
    `SELECT id, title, slug, excerpt, content, cover_image_url, status, published_at
     FROM blog_posts
     WHERE id = ?
     LIMIT 1`,
    [postId]
  );

  const post = Array.isArray(rows) ? rows[0] : undefined;
  if (!post) {
    return res.status(404).json({ error: 'Blog post not found.' });
  }

  return res.json({
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? null,
    content: post.content ?? null,
    coverImageUrl: post.cover_image_url ?? null,
    status: post.status,
    publishedAt: post.published_at ?? null
  });
});

blogRouter.patch('/:id', requireRole(['admin', 'editor']), async (req, res) => {
  const postId = Number(req.params['id']);
  if (!Number.isFinite(postId)) {
    return res.status(400).json({ error: 'Invalid blog id.' });
  }

  const { title, slug, excerpt, content, coverImageUrl, status, publishedAt } = req.body as {
    title?: string;
    slug?: string;
    excerpt?: string | null;
    content?: string | null;
    coverImageUrl?: string | null;
    status?: 'draft' | 'published' | string;
    publishedAt?: string | null;
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
  if (excerpt !== undefined) {
    updates.push('excerpt = ?');
    params.push(excerpt ?? null);
  }
  if (content !== undefined) {
    updates.push('content = ?');
    params.push(content ?? null);
  }
  if (coverImageUrl !== undefined) {
    updates.push('cover_image_url = ?');
    params.push(coverImageUrl ?? null);
  }
  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status === 'published' ? 'published' : 'draft');
    if (status === 'published' && publishedAt === undefined) {
      updates.push('published_at = COALESCE(published_at, ?)');
      params.push(new Date().toISOString());
    }
  }
  if (publishedAt !== undefined) {
    updates.push('published_at = ?');
    params.push(publishedAt ?? null);
  }

  if (!updates.length) {
    return res.status(400).json({ error: 'No fields to update.' });
  }

  try {
    await db.query(`UPDATE blog_posts SET ${updates.join(', ')} WHERE id = ?`, [
      ...params,
      postId
    ]);
    return res.json({ ok: true });
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Slug already exists.' });
    }
    return res.status(500).json({ error: 'Failed to update blog post.' });
  }
});

blogRouter.delete('/:id', requireRole(['admin', 'editor']), async (req, res) => {
  const postId = Number(req.params['id']);
  if (!Number.isFinite(postId)) {
    return res.status(400).json({ error: 'Invalid blog id.' });
  }

  const [result] = await db.query('DELETE FROM blog_posts WHERE id = ?', [postId]);
  if ((result as any).affectedRows === 0) {
    return res.status(404).json({ error: 'Blog post not found.' });
  }
  return res.status(204).send();
});
