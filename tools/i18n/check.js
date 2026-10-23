// Kiểm tra bản dịch còn thiếu / Report missing translations.
// Usage (from repo root): npm --prefix tools/i18n install && node tools/i18n/check.js [lang]
const fs = require('fs'), path = require('path'), vm = require('vm'), { execFileSync } = require('child_process');
const root = path.resolve(__dirname, '../..');
const tmp = path.join(require('os').tmpdir(), 'aiteam-keys.json');
execFileSync(process.execPath, [path.join(__dirname, 'extract.js'), path.join(root, 'index.html'), tmp], { stdio: 'inherit' });
const keys = JSON.parse(fs.readFileSync(tmp, 'utf8'));
const ctx = { window: {} }; vm.createContext(ctx);
const dir = path.join(root, 'locales');
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.js'))) vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx);
const L = ctx.window.AITEAM_LOCALES, only = process.argv[2];
const ph = s => (s.match(/\{\d+\}/g) || []).sort().join(',');
let bad = 0;
for (const lang of Object.keys(L).sort()) {
  if (only && lang !== only) continue;
  const d = L[lang], missing = keys.filter(k => !(k in d)), viaEn = missing.filter(k => L.en && k in L.en);
  const phErr = Object.keys(d).filter(k => !k.startsWith('@') && ph(k) !== ph(d[k]));
  if (phErr.length) bad++;
  console.log(`${lang}: ${keys.length - missing.length}/${keys.length} translated, ${viaEn.length} fall back to English, ${missing.length - viaEn.length} fall back to Vietnamese, ${phErr.length} placeholder errors${d['@guide'] ? '' : ', NO @guide'}`);
  if (only) { missing.forEach(k => console.log('  - ' + k)); phErr.forEach(k => console.log('  ! placeholders: ' + k)); }
}
if (L.en && keys.some(k => !(k in L.en))) { console.log('English must cover every key (it is the fallback for all languages).'); bad++; }
process.exitCode = bad ? 1 : 0;
