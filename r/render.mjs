// node render.mjs [W=540] [mode=stills|all] ; renders origin.html -> frames/
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const W = +(process.argv[2] || 540), mode = process.argv[3] || 'stills', H = W * 16 / 9;
const OUT = new URL('./frames/', import.meta.url).pathname; mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await p.goto(pathToFileURL(new URL('./origin.html', import.meta.url).pathname).href);
await p.evaluate(() => window.__ready());
const times = mode === 'stills' ? [1.0, 2.8, 3.6, 4.8, 6.2, 7.5, 9.0, 11.0, 12.2, 13.2, 14.2, 15.2, 16.2, 17.2, 18.2, 19.5, 20.8, 21.6] : Array.from({ length: 22 * 30 }, (_, i) => i / 30);
let n = 0;
for (const t of times) { await p.evaluate(t => window.__u(t), t); await p.screenshot({ path: OUT + (mode === 'stills' ? 's' + String(t).replace('.', '_') : 'f' + String(n++).padStart(5, '0')) + '.png' }); }
await b.close(); console.log('done', times.length);
