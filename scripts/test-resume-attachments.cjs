const { test } = require('node:test');
const assert = require('node:assert/strict');
const PizZip = require('pizzip');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
async function upload(name, bytes, type) {
  const form = new FormData(); form.append('file', new Blob([bytes], { type }), name);
  const response = await fetch(`${base}/api/resume/attachment`, { method: 'POST', body: form });
  return { status: response.status, body: await response.json() };
}
test('TXT import preserves text and does not write a resume', async () => {
  const result = await upload('resume.txt', '测试用户\n产品经理', 'text/plain');
  assert.equal(result.status, 200); assert.match(result.body.text, /产品经理/); assert.equal(result.body.resumeData, undefined);
});
test('DOCX import extracts paragraph text', async () => {
  const zip = new PizZip(); zip.file('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>测试用户</w:t></w:r></w:p><w:p><w:r><w:t>产品经理</w:t></w:r></w:p></w:body></w:document>');
  const result = await upload('resume.docx', zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  assert.equal(result.status, 200); assert.match(result.body.text, /测试用户\n产品经理/);
});
test('PDF import reads text', async () => {
  const stream = 'BT /F1 12 Tf 50 750 Td (Resume Test) Tj ET';
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((obj, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map((n) => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const result = await upload('resume.pdf', pdf, 'application/pdf');
  assert.equal(result.status, 200); assert.match(result.body.text, /Resume Test/);
});
test('rejects renamed binaries and unknown extensions', async () => {
  assert.equal((await upload('fake.pdf', 'not a pdf', 'application/pdf')).status, 422);
  assert.equal((await upload('old.doc', 'text', 'application/msword')).status, 422);
});
test('rejects malformed edit requests before any model call', async () => {
  const result = await fetch(`${base}/api/resume/edit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instruction: '改姓名', resumeData: {} }) });
  assert.equal(result.status, 400);
});
