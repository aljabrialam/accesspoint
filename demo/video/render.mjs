// Renders index.html frame by frame (deterministic, via window.render(t)) at 4K.
//   node render.mjs --stills 4,20,50       -> stills/t-<s>.jpg (1920x1080) for review
//   node render.mjs                        -> base.mp4, 3840x2160 at 30 fps (frames streamed into ffmpeg)
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const FPS = 30;
const args = process.argv.slice(2);
const stillsArg = args.includes('--stills') ? args[args.indexOf('--stills') + 1] : null;
const scale = stillsArg ? 1 : 2;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
await page.goto(`${pathToFileURL(join(here, 'index.html')).href}?t=0`);
await page.evaluate(() => document.fonts.ready);
const duration = await page.evaluate(() => window.DURATION);

async function shot(t, opts = {}) {
  await page.evaluate((tt) => window.render(tt), t);
  return page.screenshot({ type: 'jpeg', quality: 95, ...opts });
}

if (stillsArg) {
  mkdirSync(join(here, 'stills'), { recursive: true });
  for (const s of stillsArg.split(',').map(Number)) await shot(s, { path: join(here, 'stills', `t-${s}.jpg`) });
  console.log('stills written');
} else {
  const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '12', '-pix_fmt', 'yuv420p', join(here, 'base.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (code) => (code === 0 ? res() : rej(new Error(`ffmpeg exited ${code}`)))));
  const total = Math.round(duration * FPS);
  const t0 = Date.now();
  for (let i = 0; i < total; i++) {
    const buf = await shot(i / FPS);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 300 === 0) console.log(`frame ${i}/${total} (${Math.round((Date.now() - t0) / 1000)}s)`);
  }
  ff.stdin.end();
  await done;
  console.log(`done: ${total} frames -> base.mp4 (3840x2160)`);
}
await browser.close();
