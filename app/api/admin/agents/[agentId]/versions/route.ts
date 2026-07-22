import { NextResponse } from 'next/server';
import { readAgentConfigVersions } from '../../../../../../lib/ai/agentHistory';

type RouteContext = { params: Promise<{ agentId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { agentId } = await context.params;
  return NextResponse.json({ versions: await readAgentConfigVersions(agentId) });
}
