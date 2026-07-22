import { NextResponse } from 'next/server';
import { readAgentConfig, writeAgentConfig, type AgentConfig } from '../../../../../lib/ai/agentConfig';
import { appendAgentConfigVersion } from '../../../../../lib/ai/agentHistory';

type RouteContext = {
  params: Promise<{
    agentId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { agentId } = await context.params;
  const config = await readAgentConfig(agentId);

  return NextResponse.json(config);
}

export async function PUT(request: Request, context: RouteContext) {
  const { agentId } = await context.params;
  const currentConfig = await readAgentConfig(agentId);
  const body = (await request.json().catch(() => null)) as Partial<AgentConfig> | null;

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'agent config payload is required' }, { status: 400 });
  }

  const nextConfig: AgentConfig = {
    ...currentConfig,
    binding: body.binding === 'photo-enhance' ? 'photo-enhance' : body.binding === 'unbound' ? 'unbound' : currentConfig.binding,
    enabled: typeof body.enabled === 'boolean' ? body.enabled : currentConfig.enabled,
    kind: body.kind === 'image-generation' ? 'image-generation' : body.kind === 'text-json' ? 'text-json' : currentConfig.kind,
    model: typeof body.model === 'string' ? body.model.trim() || currentConfig.model : currentConfig.model,
    name: typeof body.name === 'string' ? body.name.trim() || currentConfig.name : currentConfig.name,
    prompt: typeof body.prompt === 'string' ? body.prompt : currentConfig.prompt,
    promptVersion:
      typeof body.promptVersion === 'string'
        ? body.promptVersion.trim() || currentConfig.promptVersion
        : currentConfig.promptVersion,
    provider: typeof body.provider === 'string' ? body.provider.trim() || currentConfig.provider : currentConfig.provider,
    temperature: typeof body.temperature === 'number' ? body.temperature : currentConfig.temperature,
  };

  await appendAgentConfigVersion(currentConfig);
  await writeAgentConfig(agentId, nextConfig);
  await appendAgentConfigVersion(nextConfig);

  return NextResponse.json(nextConfig);
}
