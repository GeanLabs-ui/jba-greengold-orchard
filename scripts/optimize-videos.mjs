import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

// Run once when adding/replacing a public video; never recompress on every build.
const [input, name] = process.argv.slice(2);
if (!input || !/^[a-z0-9-]+$/.test(name || '')) throw new Error('Usage: npm run videos:optimize -- <source> <name>');
const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
const source = readFileSync(input);
const hash = createHash('sha256').update(source).update('video-v2').digest('hex').slice(0, 12);
const dir = path.resolve('apps/web/public/videos/optimized');
mkdirSync(dir, { recursive: true });
function encode(suffix, args) {
  const file = `${name}-${hash}-${suffix}`;
  if (!existsSync(path.join(dir, file))) {
    const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-n', '-i', path.resolve(input), ...args, path.join(dir, file)], { stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error('Video encoding failed');
  }
  return `/videos/optimized/${file}`;
}
const output = {};
for (const [variant, width, crf] of [['desktop', 1920, 30], ['mobile', 640, 32]]) {
  output[variant] = encode(`${variant}.mp4`, ['-map', '0:v:0', '-an', '-vf', `scale=w='min(${width},iw)':h=-2,fps=24`, '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-g', '48', '-movflags', '+faststart']);
}
output.poster = encode('poster.webp', ['-ss', '3', '-frames:v', '1', '-vf', "scale=w='min(1280,iw)':h=-2", '-c:v', 'libwebp', '-quality', '82']);
writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output, null, 2));
