import { NextResponse } from 'next/server';
import { compileResumeWorkflow } from '../../../../../lib/ai/workflowCompiler';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const instruction = typeof body?.instruction === 'string' ? body.instruction.trim() : '';
  if (!instruction) return NextResponse.json({ error: 'instruction is required' }, { status: 400 });
  return NextResponse.json(await compileResumeWorkflow(instruction));
}
