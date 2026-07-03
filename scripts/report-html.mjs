// Sinh docs/REPORT.html tự chứa (ảnh nhúng base64) từ docs/REPORT.md.
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const DOCS = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const md = readFileSync(join(DOCS, 'REPORT.md'), 'utf8');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');

function img(src, alt) {
  const p = join(DOCS, src.replace('./', ''));
  if (!existsSync(p)) return `<p><em>[thiếu ảnh: ${src}]</em></p>`;
  const b64 = readFileSync(p).toString('base64');
  return `<figure><img alt="${esc(alt)}" src="data:image/png;base64,${b64}"/><figcaption>${esc(alt)}</figcaption></figure>`;
}

const lines = md.split('\n');
let html = '';
let i = 0;
let inList = false;
const closeList = () => { if (inList) { html += '</ul>'; inList = false; } };

while (i < lines.length) {
  const line = lines[i];
  // Bảng
  if (/^\|/.test(line) && i + 1 < lines.length && /^\|[\s:|-]+\|/.test(lines[i + 1])) {
    closeList();
    const header = line.split('|').slice(1, -1).map((c) => `<th>${inline(c.trim())}</th>`).join('');
    i += 2;
    let rows = '';
    while (i < lines.length && /^\|/.test(lines[i])) {
      const cells = lines[i].split('|').slice(1, -1).map((c) => `<td>${inline(c.trim())}</td>`).join('');
      rows += `<tr>${cells}</tr>`;
      i++;
    }
    html += `<table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>`;
    continue;
  }
  // Code fence
  if (/^```/.test(line)) {
    closeList();
    i++;
    let code = '';
    while (i < lines.length && !/^```/.test(lines[i])) { code += lines[i] + '\n'; i++; }
    i++;
    html += `<pre><code>${esc(code)}</code></pre>`;
    continue;
  }
  const imgM = line.match(/^!\[(.*?)\]\((.*?)\)/);
  if (imgM) { closeList(); html += img(imgM[2], imgM[1]); i++; continue; }
  if (/^### /.test(line)) { closeList(); html += `<h3>${inline(line.slice(4))}</h3>`; i++; continue; }
  if (/^## /.test(line)) { closeList(); html += `<h2>${inline(line.slice(3))}</h2>`; i++; continue; }
  if (/^# /.test(line)) { closeList(); html += `<h1>${inline(line.slice(2))}</h1>`; i++; continue; }
  if (/^---\s*$/.test(line)) { closeList(); html += '<hr/>'; i++; continue; }
  if (/^>\s?/.test(line)) { closeList(); html += `<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`; i++; continue; }
  if (/^- /.test(line)) { if (!inList) { html += '<ul>'; inList = true; } html += `<li>${inline(line.slice(2))}</li>`; i++; continue; }
  if (line.trim() === '') { closeList(); i++; continue; }
  closeList();
  html += `<p>${inline(line)}</p>`;
  i++;
}
closeList();

const doc = `<!doctype html><html lang="vi"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Báo cáo tính năng — ENSHIDO</title>
<style>
  body{font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;max-width:980px;margin:0 auto;padding:32px 20px;color:#1e293b;line-height:1.6}
  h1{font-size:30px;border-bottom:3px solid #6366f1;padding-bottom:10px}
  h2{font-size:23px;margin-top:40px;color:#4338ca}
  h3{font-size:18px;margin-top:28px}
  table{border-collapse:collapse;width:100%;margin:14px 0;font-size:14px}
  th,td{border:1px solid #e2e8f0;padding:8px 10px;text-align:left;vertical-align:top}
  th{background:#eef2ff}
  code{background:#f1f5f9;padding:1px 5px;border-radius:4px;font-size:13px}
  pre{background:#0f172a;color:#e2e8f0;padding:14px;border-radius:8px;overflow:auto}
  pre code{background:none;color:inherit}
  figure{margin:18px 0;text-align:center}
  img{max-width:100%;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.08)}
  figcaption{font-size:13px;color:#64748b;margin-top:6px}
  blockquote{border-left:4px solid #c7d2fe;background:#f8fafc;margin:10px 0;padding:6px 14px;color:#475569}
  hr{border:none;border-top:1px solid #e2e8f0;margin:28px 0}
  a{color:#4f46e5}
</style></head><body>${html}</body></html>`;

writeFileSync(join(DOCS, 'REPORT.html'), doc);
console.log('✔ docs/REPORT.html (' + Math.round(doc.length / 1024) + ' KB)');
