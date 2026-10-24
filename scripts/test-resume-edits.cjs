const { readFileSync } = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const output = ts.transpileModule(readFileSync('lib/resumeEdits.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleScope = { exports: {} };
vm.runInNewContext(output, { exports: moduleScope.exports, structuredClone, Set, Object, JSON, Error });
const { applyResumeEdits, isResumeData, needsConfirmation } = moduleScope.exports;
function fixture() { return { basics: { name: '测试用户', targetRole: '产品', city: '', phone: '', email: '', summary: '' }, education: [], experiences: [{ id: 'e1', organization: '学校乐队', role: '成员', type: 'campus', startDate: '', endDate: '', bullets: [] }], projects: [], skills: [] }; }
test('updates by ID, without appending or mutating the original', () => {
  const before = fixture();
  const after = applyResumeEdits(before, [{ op: 'set', section: 'experiences', id: 'e1', field: 'role', value: '负责人' }], '1');
  assert.equal(after.experiences.length, 1); assert.equal(after.experiences[0].role, '负责人'); assert.equal(before.experiences[0].role, '成员');
});
test('rejects missing targets and unsafe fields, without partial application', () => {
  const before = fixture();
  for (const edit of [{ op: 'set', section: 'experiences', id: 'missing', field: 'role', value: 'x' }, { op: 'set', section: 'basics', field: '__proto__', value: 'x' }, { op: 'set', section: 'basics', field: 'name', value: {} }]) assert.throws(() => applyResumeEdits(before, [edit], '1'));
  assert.equal(before.basics.name, '测试用户');
});
test('replayed additions and identical new entries do not duplicate', () => {
  const edits = [{ op: 'add', section: 'skills', value: { title: 'Excel', details: [] } }];
  const first = applyResumeEdits(fixture(), edits, 'same');
  assert.equal(applyResumeEdits(first, edits, 'same').skills.length, 1);
  assert.equal(applyResumeEdits(first, edits, 'different').skills.length, 1);
});
test('destructive edits require confirmation and remove only the named ID', () => {
  const edits = [{ op: 'remove', section: 'experiences', id: 'e1' }];
  assert.equal(needsConfirmation(edits), true); assert.equal(applyResumeEdits(fixture(), edits, '1').experiences.length, 0);
  assert.equal(needsConfirmation([{ op: 'set', section: 'basics', field: 'name', value: '' }]), true);
});
test('rejects malformed resumes and duplicate IDs', () => {
  const bad = fixture(); bad.experiences.push(bad.experiences[0]);
  assert.equal(isResumeData(bad), false); assert.equal(isResumeData({}), false);
});

function mockEditRoute(modelOutput) {
  const source = ts.transpileModule(readFileSync('app/api/resume/edit/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  const mocks = {
    'next/server': { NextResponse: { json: (body, init) => Response.json(body, init) } },
    '../../../../lib/ai/agentConfig': { readAgentConfig: async () => ({ enabled: true }) },
    '../../../../lib/ai/providers/openaiCompatible': { runOpenAICompatibleJson: async () => modelOutput },
    '../../../../lib/resumeEdits': moduleScope.exports,
    '../../../../lib/limitedRequest': { limitedBody: async (request) => new Uint8Array(await request.arrayBuffer()) },
  };
  vm.runInNewContext(source, { exports, require: (id) => { if (!mocks[id]) throw new Error(id); return mocks[id]; }, TextDecoder, JSON, String, Error });
  return exports.POST;
}
function editRequest() { return new Request('http://localhost/api/resume/edit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instruction: '把乐队职位改成负责人', resumeData: fixture() }) }); }
test('edit API returns a validated proposal, without writing data', async () => {
  const response = await mockEditRoute({ message: '准备修改', edits: [{ op: 'set', section: 'experiences', id: 'e1', field: 'role', value: '负责人' }] })(editRequest());
  assert.equal(response.status, 200); const payload = await response.json(); assert.equal(payload.edits.length, 1); assert.equal(payload.resumeData, undefined);
});
test('ambiguous model output becomes a question, never a mutation', async () => {
  const response = await mockEditRoute({ clarification: '你要修改哪一段经历？', edits: [{ op: 'remove', section: 'experiences', id: 'e1' }] })(editRequest());
  const payload = await response.json(); assert.equal(payload.clarification, true); assert.equal(payload.edits.length, 0);
});
test('invalid model output fails safely instead of pretending success', async () => {
  const response = await mockEditRoute({ edits: [{ op: 'set', section: 'basics', field: '__proto__', value: 'bad' }] })(editRequest());
  assert.equal(response.status, 503); assert.match((await response.json()).error, /原简历未改动/);
});
