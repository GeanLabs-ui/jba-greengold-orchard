import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

// Preserve the approved artwork; trim transparent outer padding for browser favicons.
const source = fileURLToPath(new URL('../asserts/favicon.png', import.meta.url));
const output = new URL('../apps/web/public/brand/', import.meta.url);
const icons = [
  ['favicon-16.png', 16],
  ['favicon-32.png', 32],
  ['apple-touch-icon.png', 180],
  ['app-icon-192.png', 192],
  ['app-icon-512.png', 512],
];

const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let left = info.width;
let top = info.height;
let right = -1;
let bottom = -1;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 16) {
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
}
if (right < left || bottom < top) throw new Error('Icon artwork is fully transparent.');
const artworkBounds = { left, top, width: right - left + 1, height: bottom - top + 1 };

for (const [name, size] of icons) {
  const artwork = sharp(source);
  if (name.startsWith('favicon-')) artwork.extract(artworkBounds);
  await artwork.resize(size, size, { fit: 'contain', background: '#00000000' }).png().toFile(fileURLToPath(new URL(name, output)));
  console.log(`Generated ${name} (${size} x ${size})`);
}
