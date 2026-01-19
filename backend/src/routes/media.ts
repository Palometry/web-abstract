import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { db } from '../db';
import { authenticate, requireRole } from '../middleware/auth';

export const mediaRouter = Router();

type UploadPayload = {
  filename?: string;
  data?: string;
  mimeType?: string;
  title?: string;
  altText?: string;
};

function parseDataUrl(data: string): { buffer: Buffer; mimeType?: string } {
  if (data.startsWith('data:')) {
    const match = data.match(/^data:(.+);base64,(.+)$/);
    if (match) {
      return { mimeType: match[1], buffer: Buffer.from(match[2], 'base64') };
    }
  }
  return { buffer: Buffer.from(data, 'base64') };
}

function safeBaseName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
  return base.length ? base : 'media';
}

mediaRouter.post('/', authenticate, requireRole(['admin', 'editor']), async (req, res) => {
  const { filename, data, mimeType, title, altText } = req.body as UploadPayload;
  if (!data || !filename) {
    return res.status(400).json({ error: 'Archivo o nombre invalido.' });
  }

  const { buffer, mimeType: inferredMime } = parseDataUrl(data);
  if (!buffer.length) {
    return res.status(400).json({ error: 'Archivo vacio.' });
  }

  const ext = path.extname(filename) || '';
  const base = safeBaseName(path.basename(filename, ext));
  const unique = crypto.randomBytes(6).toString('hex');
  const safeName = `${base}-${Date.now()}-${unique}${ext || '.bin'}`;

  const uploadsRoot = path.resolve(process.cwd(), 'uploads', 'portfolio');
  await fs.mkdir(uploadsRoot, { recursive: true });
  const filePath = path.join(uploadsRoot, safeName);
  await fs.writeFile(filePath, buffer);

  const host = req.get('host') ?? `localhost:${process.env['PORT'] || 4001}`;
  const protocol = req.protocol || 'http';
  const fileUrl = `${protocol}://${host}/uploads/portfolio/${safeName}`;

  const [result] = await db.query(
    `INSERT INTO media_assets (file_url, file_path, mime_type, file_size, title, alt_text)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      fileUrl,
      filePath,
      mimeType ?? inferredMime ?? null,
      buffer.length,
      title ?? null,
      altText ?? null
    ]
  );

  return res.status(201).json({
    id: (result as any).insertId,
    fileUrl
  });
});
