import { NextResponse } from 'next/server';
import { runResumeExtractorAgent } from '../../../../lib/ai/agents/resumeExtractorAgent';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === 'string' ? body.text.trim() : '';

  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const result = await runResumeExtractorAgent(text);

  return NextResponse.json(result.draft, {
    headers: { 'X-Agent-Mode': result.mode },
  });
}
