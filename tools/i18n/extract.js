// Tách chuỗi giao diện tiếng Việt bằng AST (acorn). node extract.js index.html out.json
const fs = require('fs'); const acorn = require('acorn'); const walk = require('acorn-walk');
const src = fs.readFileSync(process.argv[2], 'utf8');
const s = src.indexOf('<script>\n') + 9, e = src.lastIndexOf('</script>');
const html = src.slice(0, s), js = src.slice(s, e);
const VI = /[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹĂÂĐÊÔƠƯÀÁẠẢÃẰẮẶẲẴẦẤẬẨẪÈÉẸẺẼỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕỒỐỘỔỖỜỚỢỞỠÙÚỤỦŨỪỨỰỬỮỲÝỴỶỸ]/;
const EXCLUDE_FN = new Set(['runAutomatedTestSuite', 'typeGuideBlock', 'generateDirectorPlanPromptVi', 'generateWorkerBatchPromptVi', 'generateLeaderPromptVi',
  'generateDirectorReviewPromptVi', 'generateIndependentQAPromptVi', 'criteriaBlock', 'roomSourceBlock', 'detectDemoSignals', 'humanizeCodes', 'detectInitialLang']);
const EXCLUDE_VAR = new Set(['REPORT_TYPES', 'PROMPT_PRINCIPLES', 'FINAL_RESULT_TEMPLATE', 'GUIDE_HTML_VI', 'LANGS', 'REPORT_TYPES_EN', 'MODES_EN', 'LANG_ENGLISH_NAME', 'DATA_CLASS_EN', 'VI_CHARS']);
const REPORT_TYPE_UI_PROPS = new Set(['label', 'hint', 'resultHeading', 'dnHeading']);
const ast = acorn.parse(js, { ecmaVersion: 2022, ranges: true });
const excl = [];
for (const n of ast.body) {
  if (n.type === 'FunctionDeclaration' && EXCLUDE_FN.has(n.id.name)) excl.push(n.range);
  if (n.type === 'VariableDeclaration' && n.declarations.some(d => d.id.name && EXCLUDE_VAR.has(d.id.name))) excl.push(n.range);
}
const inExcl = r => excl.some(([a, b]) => r[0] >= a && r[1] <= b);
const keys = new Map();
const add = (k, where) => { k = k.replace(/\s+/g, ' ').trim(); if (k && VI.test(k) && !keys.has(k)) keys.set(k, where); };
const decode = t => t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&rarr;/g, '→');
const addFragments = (text, where) => {
  for (const m of text.matchAll(/\b(?:placeholder|title|aria-label)="([^"]*)"/g)) { let i = 0; add(decode(m[1]).replace(/\{\d+\}/g, () => `{${i++}}`), where + '-attr'); }
  for (const part of text.split(/<[^>]+>/)) for (const line of part.split('\n')) {
    let i = 0; add(decode(line).replace(/\{\d+\}/g, () => `{${i++}}`), where);
  }
};
walk.full(ast, node => {
  if (inExcl(node.range)) return;
  if (node.type === 'Literal' && typeof node.value === 'string' && VI.test(node.value)) addFragments(node.value, 'js');
  if (node.type === 'TemplateLiteral') {
    const txt = node.quasis.map((q, i) => q.value.cooked + (i < node.expressions.length ? `{${i}}` : '')).join('');
    if (VI.test(txt)) addFragments(txt, 'tpl');
  }
});
// REPORT_TYPES: chỉ lấy nhãn hiển thị (không lấy khung prompt)
for (const n of ast.body) {
  if (n.type !== 'VariableDeclaration') continue;
  for (const d of n.declarations) {
    if (d.id.name !== 'REPORT_TYPES' || !d.init) continue;
    for (const typeProp of d.init.properties) {
      for (const p of typeProp.value.properties || []) {
        const key = p.key.name || p.key.value;
        if (REPORT_TYPE_UI_PROPS.has(key) && p.value.type === 'Literal') add(p.value.value, 'rt');
        if (key === 'required' && p.value.type === 'ArrayExpression') p.value.elements.forEach(el => el.type === 'Literal' && add(el.value, 'rt'));
      }
    }
  }
}
// HTML tĩnh
const h = html.replace(/<style[\s\S]*?<\/style>/g, '');
for (const m of h.matchAll(/>([^<>]+)</g)) add(decode(m[1]), 'html');
for (const m of h.matchAll(/\b(?:placeholder|title|aria-label)=(["'])(.*?)\1/g)) add(decode(m[2]), 'attr');
const out = [...keys.keys()].sort();
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 0));
console.log(out.length, 'keys,', out.reduce((a, k) => a + k.length, 0), 'chars');
