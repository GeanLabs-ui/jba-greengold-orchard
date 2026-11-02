import { readdir, readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../apps/web/', import.meta.url));
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : join(dir, entry.name)))).flat();
}
const sourceFiles = (await walk(join(root, 'src'))).filter(file => /\.(jsx?|css)$/.test(file) && !file.includes('.test.'));
const sources = await Promise.all(sourceFiles.map(async file => [file, await readFile(file, 'utf8')]));
const images = (await walk(join(root, 'public'))).filter(file => /\.(png|jpe?g)$/i.test(file));
let before = 0, after = 0, count = 0;
const replacements = {};
for (const input of images) {
  const url = '/' + input.slice(join(root, 'public').length + 1).replaceAll('\\', '/');
  // Preserve app icons, logos and assets not actually used by a page.
  if (!/^\/(pages|products)\//.test(url)) continue;
  const dynamicObjective = url.startsWith('/pages/objectives/');
  const nextUrl = url.replace(/\.(png|jpe?g)$/i, '.webp');
  if (!dynamicObjective && !sources.some(([, text]) => text.includes(url) || text.includes(nextUrl))) continue;
  const output = input.slice(0, -extname(input).length) + '.webp';
  const originalSize = (await stat(input)).size;
  if (!await stat(output).catch(() => null)) {
    await sharp(input).rotate().resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82, effort: 6 }).toFile(output);
  }
  const optimizedSize = (await stat(output)).size;
  if (optimizedSize >= originalSize) continue;
  replacements[url] = nextUrl;
  before += originalSize; after += optimizedSize; count++;
}
// Print paths for review; never rewrite application source or delete originals.
console.log(JSON.stringify({ count, originalBytes: before, optimizedBytes: after, reductionPercent: Math.round((1 - after / before) * 100), replacements }, null, 2));
