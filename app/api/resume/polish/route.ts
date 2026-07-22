import { NextResponse } from 'next/server';
import { runResumePolishWorkflow } from '../../../../lib/ai/workflows/resumePolishWorkflow';
import type { ResumeData } from '../../../online-editor/resumePreviewData';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const resumeData = body?.resumeData as ResumeData | undefined;

  if (!resumeData || typeof resumeData !== 'object') {
    return NextResponse.json({ error: 'resumeData is required' }, { status: 400 });
  }

  const result = await runResumePolishWorkflow(resumeData);

  return NextResponse.json(result);
}
