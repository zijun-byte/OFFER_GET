import { NextResponse } from 'next/server';
import { runResumeExtractorAgent } from '../../../../lib/ai/agents/resumeExtractorAgent';
import { limitedBody } from '../../../../lib/limitedRequest';

export async function POST(request: Request) {
  const body = await limitedBody(request, 200000).then((bytes) => JSON.parse(new TextDecoder().decode(bytes))).catch(() => null);
  const text = typeof body?.text === 'string' ? body.text.trim() : '';

  if (!text || text.length > 40000) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const result = await runResumeExtractorAgent(text);

  return NextResponse.json(result.draft, {
    headers: { 'X-Agent-Mode': result.mode },
  });
}
