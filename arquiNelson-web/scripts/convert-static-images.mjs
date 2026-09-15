import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const targets = [
  path.join(root, 'public', 'img'),
  path.join(root, 'src', 'assets', 'img'),
];
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

function outputPath(file) {
  return file.replace(/\.(jpe?g|png)$/i, '.webp');
}

for (const target of targets) {
  const files = await walk(target);

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const out = outputPath(file);
    const image = sharp(file).rotate();

    if (ext === '.png') {
      await image.webp({ lossless: true, effort: 6 }).toFile(out);
    } else {
      await image.webp({ quality: 82, effort: 6 }).toFile(out);
    }

    const [before, after] = await Promise.all([stat(file), stat(out)]);
    const saved = before.size - after.size;
    const relativeIn = path.relative(root, file);
    const relativeOut = path.relative(root, out);
    console.log(`${relativeIn} -> ${relativeOut} (${before.size} -> ${after.size}, saved ${saved})`);
  }
}
