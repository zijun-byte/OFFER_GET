import { NextResponse } from 'next/server';
import { createAgentConfig, listAgentConfigs, type CreateAgentInput } from '../../../../lib/ai/agentConfig';

export async function GET() {
  return NextResponse.json({ agents: await listAgentConfigs() });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Partial<CreateAgentInput> | null;
  if (!body || typeof body.name !== 'string' || !body.name.trim() || typeof body.prompt !== 'string' || !body.prompt.trim()) {
    return NextResponse.json({ error: '角色名称和 Prompt 必填。' }, { status: 400 });
  }

  if (body.kind !== 'text-json' && body.kind !== 'image-generation') {
    return NextResponse.json({ error: 'Agent 类型无效。' }, { status: 400 });
  }

  const agent = await createAgentConfig({
    binding: body.binding === 'photo-enhance' ? 'photo-enhance' : 'unbound',
    enabled: body.enabled !== false,
    kind: body.kind,
    model: typeof body.model === 'string' ? body.model.trim() : '',
    name: body.name.trim(),
    prompt: body.prompt,
    promptVersion: typeof body.promptVersion === 'string' ? body.promptVersion : undefined,
    provider: typeof body.provider === 'string' ? body.provider.trim() : '',
    temperature: typeof body.temperature === 'number' ? body.temperature : 0,
  });

  return NextResponse.json(agent, { status: 201 });
}
