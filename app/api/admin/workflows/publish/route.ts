import { NextResponse } from 'next/server';
import { appendAgentConfigVersion } from '../../../../../lib/ai/agentHistory';
import { readAgentConfig, writeAgentConfig } from '../../../../../lib/ai/agentConfig';
import type { WorkflowCompileResult } from '../../../../../lib/ai/workflowCompiler';

export async function POST(request: Request) {
  const draft = (await request.json().catch(() => null)) as WorkflowCompileResult | null;
  if (!draft || !Array.isArray(draft.agents)) {
    return NextResponse.json({ error: 'compiled workflow draft is required' }, { status: 400 });
  }

  const published = [];
  for (const agent of draft.agents) {
    const current = await readAgentConfig(agent.id);
    await appendAgentConfigVersion(current);
    const appendix = agent.promptAppendix.trim();
    const basePrompt = current.prompt.split('\n\n自然语言编队追加规则：')[0];
    const next = {
      ...current,
      name: agent.name,
      enabled: agent.enabled,
      provider: agent.provider,
      model: agent.model,
      promptVersion: `${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}-nl-compiled`,
      prompt: appendix ? `${basePrompt}\n\n自然语言编队追加规则：\n${appendix}` : basePrompt,
    };
    await writeAgentConfig(agent.id, next);
    await appendAgentConfigVersion(next);
    published.push({ id: next.id, promptVersion: next.promptVersion });
  }

  return NextResponse.json({ published, message: '编队配置已发布，下一次简历润色生效。' });
}
