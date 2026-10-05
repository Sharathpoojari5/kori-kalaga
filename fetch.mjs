// Finds free-licence cultural imagery on Wikimedia Commons and downloads it with its licence data.
// Keeps only CC0, public domain, CC BY and CC BY-SA. Skips NonCommercial / NoDerivs.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
const OUT = '/Users/sharath/kori-story/assets'; mkdirSync(OUT, { recursive: true });
const Q = {
  kambala: ['Kambala buffalo race', 'Kambala Dakshina Kannada', 'kambala race mud'],
  yakshagana: ['Yakshagana', 'Yakshagana Karnataka performance', 'Yakshagana headgear'],
  pili: ['Pilivesha tiger dance Mangalore', 'Huli vesha Karnataka', 'Pili Nalike'],
  paddy: ['Paddy field Dakshina Kannada', 'Udupi paddy field', 'rice field Karnataka coast monsoon'],
  coast: ['Mangalore coast fishing boat', 'Malpe beach', 'Tannirbhavi beach', 'Karavali Karnataka beach sunset'],
  temple: ['Temple festival Karnataka lamps', 'Mangalore temple procession', 'oil lamp deepa brass Karnataka', 'Karnataka temple festival night'],
  drums: ['Dollu Kunitha', 'Karnataka drummers festival', 'Tase drum', 'Chande drummers'],
  village: ['Dakshina Kannada village', 'Tulu Nadu', 'Mangalore tiled roof house', 'Udupi Krishna Matha festival'],
  coconut: ['coconut palm grove Karnataka', 'Western Ghats monsoon Karnataka'],
  rooster: ['rooster Karnataka village', 'country rooster India', 'Kori katta']
};
const FREE = /^(cc0|public domain|pd|cc[- ]by|cc[- ]by[- ]sa|attribution)/i;
const UA = { 'User-Agent': 'KoriKalagaTrailer/1.0 (roysonsalis2005@gmail.com)' };
const api = p => 'https://commons.wikimedia.org/w/api.php?format=json&origin=*&' + p;
const seen = new Set(); const kept = [];
for (const [theme, qs] of Object.entries(Q)) for (const q of qs) {
  const u = api('action=query&generator=search&gsrnamespace=6&gsrlimit=14&gsrsearch=' + encodeURIComponent(q) + '&prop=imageinfo&iiprop=url|size|extmetadata|mime&iiurlwidth=1600');
  let j; try { j = await (await fetch(u, { headers: UA })).json(); } catch (e) { console.log('fail', q); continue; }
  for (const p of Object.values(j.query?.pages || {})) {
    const ii = p.imageinfo?.[0]; if (!ii || seen.has(p.title)) continue; const m = ii.extmetadata || {}; const lic = (m.LicenseShortName?.value || '').trim();
    if (!FREE.test(lic) || /[- ]n[cd]\b/i.test(lic)) continue;
    if (!/jpe?g|png/.test(ii.mime) || ii.width < 1200) continue; seen.add(p.title);
    kept.push({ theme, q, title: p.title, url: ii.thumburl || ii.url, page: ii.descriptionurl, w: ii.width, h: ii.height, license: lic, author: (m.Artist?.value || '').replace(/<[^>]+>/g, '').trim().slice(0, 120), desc: (m.ImageDescription?.value || '').replace(/<[^>]+>/g, '').trim().slice(0, 160) });
  }
}
console.log('kept', kept.length);
let n = 0;
for (const k of kept) { const ext = k.url.split('?')[0].split('.').pop().toLowerCase(); k.file = `${k.theme}_${String(n++).padStart(3, '0')}.${ext}`; const f = `${OUT}/${k.file}`;
  if (!existsSync(f)) { try { let r; for (let t=0;t<4;t++){ r = await fetch(k.url, { headers: UA }); if (r.ok) break; await new Promise(x=>setTimeout(x,3000*(t+1))); } if(!r.ok){console.log('http',r.status,k.file); continue;} writeFileSync(f, Buffer.from(await r.arrayBuffer())); } catch (e) { console.log('dl fail', k.file); } await new Promise(r => setTimeout(r, 400)); } }
writeFileSync('/Users/sharath/kori-story/assets.json', JSON.stringify(kept, null, 1)); console.log('saved', kept.length);
