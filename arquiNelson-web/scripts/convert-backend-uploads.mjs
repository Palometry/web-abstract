import { mkdir, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const frontendRoot = process.cwd();
const repoRoot = path.resolve(frontendRoot, '..');
const backendRoot = path.join(repoRoot, 'backend-laravel');
const uploadsRoot = path.join(backendRoot, 'public', 'uploads');
const mapPath = path.join(backendRoot, 'database', 'upload-webp-map.json');
const deleteOriginals = process.argv.includes('--delete-originals');
const extensions = new Set(['.jpg', '.jpeg', '.png']);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else if (extensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }

  return files;
}

function toWebpPath(file) {
  return file.replace(/\.(jpe?g|png)$/i, '.webp');
}

function toPublicUrl(file) {
  const relative = path.relative(path.join(backendRoot, 'public'), file);
  return `/${relative.replaceAll(path.sep, '/')}`;
}

await mkdir(path.dirname(mapPath), { recursive: true });

const files = await walk(uploadsRoot);
const map = [];

for (const file of files) {
  const out = toWebpPath(file);
  const tmp = `${out}.tmp`;
  try {
    await sharp(file).rotate().webp({ quality: 82, effort: 6 }).toFile(tmp);
  } catch (error) {
    console.warn(`Skipped unsupported image: ${path.relative(repoRoot, file)} (${error.message})`);
    continue;
  }

  const [before, after] = await Promise.all([stat(file), stat(tmp)]);

  if (after.size >= before.size) {
    await rm(tmp);
    console.log(`${toPublicUrl(file)} skipped (webp is larger: ${before.size} -> ${after.size})`);
    continue;
  }

  await rename(tmp, out);

  const entry = {
    oldUrl: toPublicUrl(file),
    newUrl: toPublicUrl(out),
    oldRelativePath: path.relative(path.join(backendRoot, 'public'), file).replaceAll(path.sep, '/'),
    newRelativePath: path.relative(path.join(backendRoot, 'public'), out).replaceAll(path.sep, '/'),
    oldSize: before.size,
    newSize: after.size,
  };

  map.push(entry);

  const saved = before.size - after.size;
  console.log(`${entry.oldUrl} -> ${entry.newUrl} (${before.size} -> ${after.size}, saved ${saved})`);

  if (deleteOriginals) {
    await rm(file);
  }
}

await writeFile(mapPath, `${JSON.stringify(map, null, 2)}\n`);
console.log(`Wrote ${map.length} entries to ${path.relative(repoRoot, mapPath)}`);
