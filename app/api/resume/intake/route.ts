import { NextResponse } from 'next/server';
import {
  runResumeIntakeAgent,
  type GuidedStepId,
} from '../../../../lib/ai/agents/resumeIntakeAgent';
import type { ResumeData } from '../../../online-editor/resumePreviewData';

const guidedStepIds: GuidedStepId[] = ['targetRole', 'basics', 'education', 'experience', 'project', 'skills'];

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const answer = typeof body?.answer === 'string' ? body.answer.trim() : '';
  const stepId = body?.stepId as GuidedStepId | undefined;
  const nextStep = body?.nextStep === null ? null : body?.nextStep as GuidedStepId | undefined;
  const currentResumeData = body?.resumeData as ResumeData | undefined;

  if (!answer || !stepId || !guidedStepIds.includes(stepId) || !currentResumeData) {
    return NextResponse.json({ error: 'answer, stepId, and resumeData are required' }, { status: 400 });
  }

  if (nextStep !== null && (!nextStep || !guidedStepIds.includes(nextStep))) {
    return NextResponse.json({ error: 'nextStep is invalid' }, { status: 400 });
  }

  const result = await runResumeIntakeAgent({
    answer,
    currentResumeData,
    nextStep,
    stepId,
  });

  return NextResponse.json(result);
}
