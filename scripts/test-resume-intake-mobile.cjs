const { readFileSync } = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');
function load() {
  let calls = 0;
  const exports = {};
  const source = ts.transpileModule(readFileSync('lib/ai/agents/resumeIntakeAgent.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, require: () => ({ runJsonAgent: async () => { calls++; return { output: { patch: { targetRole: '产品经理' }, nextQuestion: '姓名和作品集都可跳过' } }; } }) });
  return { run: exports.runResumeIntakeAgent, calls: () => calls };
}
const fixture = () => ({ basics: { name: '测试', city: '', phone: '', email: '', targetRole: '', portfolio: '' }, education: [], experiences: [], projects: [], skills: [] });
test('portfolio writes only portfolio and does not call a model', async () => {
  const agent = load(); const before = fixture();
  const result = await agent.run({ answer: 'https://example.com/work', currentResumeData: before, stepId: 'portfolio', nextStep: 'education' });
  assert.equal(result.resumeData.basics.portfolio, 'https://example.com/work');
  assert.equal(result.resumeData.basics.name, before.basics.name);
  assert.equal(before.basics.portfolio, ''); assert.equal(agent.calls(), 0);
  assert.match(result.nextQuestion, /学校/);
});
test('no portfolio never overwrites an existing URL', async () => {
  const agent = load(); const before = fixture(); before.basics.portfolio = 'https://example.com';
  const result = await agent.run({ answer: '没有', currentResumeData: before, stepId: 'portfolio', nextStep: 'education' });
  assert.equal(result.resumeData.basics.portfolio, before.basics.portfolio); assert.equal(agent.calls(), 0);
});
test('old model prompts cannot combine basics and optional portfolio', async () => {
  const agent = load();
  const result = await agent.run({ answer: '产品经理', currentResumeData: fixture(), stepId: 'targetRole', nextStep: 'basics' });
  assert.match(result.nextQuestion, /下一题单独/); assert.doesNotMatch(result.nextQuestion, /可跳过/);
});
