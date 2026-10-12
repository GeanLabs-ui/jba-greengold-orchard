import { readdir, stat } from 'node:fs/promises';
import { join, parse } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../apps/web/public/', import.meta.url));

async function walk(directory) {
  const entries = await readdir(directory);
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry);
    const details = await stat(path);
    if (details.isDirectory()) files.push(...await walk(path));
    else if (/\.(png|jpe?g)$/i.test(entry)) files.push(path);
  }
  return files;
}

const files = await walk(root);
for (const input of files) {
  const details = parse(input);
  const output = join(details.dir, `${details.name}.webp`);
  await sharp(input)
    .rotate()
    .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78, effort: 6 })
    .toFile(output);
}
console.log(JSON.stringify({ event: 'assets_optimized', count: files.length }));
