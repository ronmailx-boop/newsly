// מרנדר את promo.html לסרטון 1080x1920 (FHD 9:16) ב-30fps ומצמיד את
// פס הקול (audio/mix.wav - נוצר ע"י build-audio.sh).
// שימוש: node scripts/promo/render.mjs [--preview 1,8.5,20]
// דורש playwright (Chromium) ו-ffmpeg מותקנים. לא חלק מהאתר עצמו.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const FPS = 30;
const DURATION = 29.9;
// הסצנה (promo.html) מתוזמנת על ציר זמן "מקורי"; כאן ממפים אותו לזמני
// הקריינות בפועל: [זמן בסרטון, זמן בסצנה] = תחילת כל משפט בקריינות.
const TIME_MAP = [
  [0, 0], [0.25, 0.3], [3.22, 2.5], [8.68, 7.85], [13.22, 11.8], [15.5, 14.3],
  [18.75, 18.0], [22.91, 21.8], [26.3, 25.75], [29.9, 29.5],
];
function sceneTime(t) {
  for (let i = 0; i < TIME_MAP.length - 1; i++) {
    const [a, sa] = TIME_MAP[i];
    const [b, sb] = TIME_MAP[i + 1];
    if (t <= b) return sa + ((t - a) / (b - a)) * (sb - sa);
  }
  return TIME_MAP[TIME_MAP.length - 1][1];
}
const OUT_DIR = join(ROOT, 'media');
const AUDIO = join(HERE, 'audio', 'mix.wav');

const previewArg = process.argv.indexOf('--preview');
const previewTimes = previewArg > -1 ? process.argv[previewArg + 1].split(',').map(Number) : null;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(join(HERE, 'promo.html')).href);
await page.evaluate(() => document.fonts.ready);

async function frameAt(t, opts = {}) {
  await page.evaluate((time) => window.renderAt(time), sceneTime(t));
  return page.screenshot({ type: 'jpeg', quality: 95, ...opts });
}

if (previewTimes) {
  const dir = join(HERE, 'preview');
  mkdirSync(dir, { recursive: true });
  for (const t of previewTimes) {
    await frameAt(t, { path: join(dir, `t${t}.jpg`) });
  }
  await browser.close();
  process.exit(0);
}

mkdirSync(OUT_DIR, { recursive: true });
const ffmpeg = spawn('ffmpeg', [
  '-y', '-v', 'error',
  '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  '-i', AUDIO,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-profile:v', 'high', '-level', '4.0', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '160k',
  '-movflags', '+faststart', '-shortest',
  join(OUT_DIR, 'promo.mp4'),
], { stdio: ['pipe', 'inherit', 'inherit'] });

const total = Math.round(DURATION * FPS);
for (let i = 0; i < total; i++) {
  const buf = await frameAt(i / FPS);
  if (!ffmpeg.stdin.write(buf)) await new Promise((r) => ffmpeg.stdin.once('drain', r));
  if (i % 90 === 0) console.log(`frame ${i}/${total}`);
}
ffmpeg.stdin.end();
await new Promise((resolve, reject) => ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}`)))));

// פוסטר לתגית <video> - פריים הסיום (לוגו + שם)
await frameAt(29.2, { path: join(OUT_DIR, 'promo-poster.jpg'), quality: 82 });
await browser.close();
console.log('done');
