import { polishResumeData, type ResumeData } from '../../../app/online-editor/resumePreviewData';
import { readAgentConfig } from '../agentConfig';
import { runJsonAgent } from '../agentRuntime';
import { appendAgentRunLog } from '../runLog';
import { createResumeSuggestions, type ResumeSuggestion } from '../resumeSuggestions';

type ResumeAnalysis = {
  targetRole?: string;
  strengths?: string[];
  risks?: string[];
  polishFocus?: string[];
};

type GuardResult = {
  valid: boolean;
  issues: string[];
  safeResumeData: ResumeData;
};

type WorkflowStepTrace = {
  agentId: string;
  debugOutput?: unknown;
  model: string;
  mode: 'ai' | 'local-fallback' | 'skipped';
  provider: string;
  promptVersion: string;
  status: 'success' | 'fallback' | 'skipped';
  summary: string;
};

export type ResumePolishWorkflowResult = {
  resumeData: ResumeData;
  suggestions: ResumeSuggestion[];
  meta: {
    workflowId: 'resume-polish';
    mode: 'ai' | 'local-fallback';
    trace: WorkflowStepTrace[];
  };
};

export async function runResumePolishWorkflow(resumeData: ResumeData): Promise<ResumePolishWorkflowResult> {
  const startedAt = Date.now();
  const trace: WorkflowStepTrace[] = [];
  const analysis = await runAnalystStep(resumeData, trace);
  const polishedResumeData = await runPolisherStep(resumeData, analysis, trace);
  const guardedResumeData = await runGuardStep(resumeData, polishedResumeData, trace);

  trace.push({
    agentId: 'resume-formatter',
    model: 'deterministic',
    mode: 'local-fallback',
    provider: 'local',
    promptVersion: 'formatter-v1',
    status: 'success',
    summary: 'Formatter returned normalized resumeData structure.',
  });

  const suggestions = createResumeSuggestions(resumeData, guardedResumeData);
  const mode = trace.some((step) => step.mode === 'ai') ? 'ai' : 'local-fallback';
  const result: ResumePolishWorkflowResult = {
    resumeData: guardedResumeData,
    suggestions,
    meta: {
      workflowId: 'resume-polish',
      mode,
      trace,
    },
  };

  await appendAgentRunLog({
    id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    workflowId: 'resume-polish',
    createdAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    mode,
    suggestionCount: suggestions.length,
    inputSummary: `${resumeData.basics.targetRole || '未填写目标岗位'} · ${resumeData.experiences.length} 段经历 · ${resumeData.projects.length} 个项目`,
    trace: trace.map((step) => ({
      agentId: step.agentId,
      provider: step.provider,
      model: step.model,
      promptVersion: step.promptVersion,
      status: step.status,
      summary: step.summary,
    })),
  });

  return result;
}

async function runAnalystStep(resumeData: ResumeData, trace: WorkflowStepTrace[]) {
  const config = await readAgentConfig('resume-analyst');

  if (!config.enabled) {
    trace.push(createSkippedTrace(config, 'Analyst disabled. Workflow continues without analysis.'));
    return createLocalAnalysis(resumeData);
  }

  try {
    const result = await runJsonAgent<{ resumeData: ResumeData }, ResumeAnalysis>({
      agentId: 'resume-analyst',
      task: 'analyze_resume_for_polish',
      input: { resumeData },
    });

    trace.push({
      agentId: result.meta.agentId,
      model: result.meta.model,
      mode: 'ai',
      provider: result.meta.provider,
      promptVersion: result.meta.promptVersion,
      status: 'success',
      summary: 'Analyst produced polish focus and risk notes.',
    });

    return result.output;
  } catch (error) {
    trace.push(createFallbackTrace(config, error, 'Analyst failed. Used local resume analysis.'));
    return createLocalAnalysis(resumeData);
  }
}

async function runPolisherStep(resumeData: ResumeData, analysis: ResumeAnalysis, trace: WorkflowStepTrace[]) {
  const config = await readAgentConfig('resume-polisher');

  if (!config.enabled) {
    trace.push(createSkippedTrace(config, 'Polisher disabled. Used local polish fallback.'));
    return polishResumeData(resumeData);
  }

  try {
    const result = await runJsonAgent<
      { resumeData: ResumeData; analysis: ResumeAnalysis },
      { resumeData: ResumeData; debugNote?: string | number }
    >({
      agentId: 'resume-polisher',
      task: 'polish_resume_data_with_analysis',
      input: { resumeData, analysis },
    });

    trace.push({
      agentId: result.meta.agentId,
      debugOutput: result.output.debugNote,
      model: result.meta.model,
      mode: 'ai',
      provider: result.meta.provider,
      promptVersion: result.meta.promptVersion,
      status: 'success',
      summary: 'Polisher returned updated resumeData.',
    });

    return result.output.resumeData;
  } catch (error) {
    trace.push(createFallbackTrace(config, error, 'Polisher failed. Used local polish fallback.'));
    return polishResumeData(resumeData);
  }
}

async function runGuardStep(
  originalResumeData: ResumeData,
  polishedResumeData: ResumeData,
  trace: WorkflowStepTrace[],
) {
  const config = await readAgentConfig('resume-guard');

  if (!config.enabled) {
    trace.push(createSkippedTrace(config, 'Guard disabled. Returned polished resumeData without AI guard.'));
    return polishedResumeData;
  }

  try {
    const result = await runJsonAgent<
      { originalResumeData: ResumeData; polishedResumeData: ResumeData },
      GuardResult
    >({
      agentId: 'resume-guard',
      task: 'guard_resume_polish_result',
      input: { originalResumeData, polishedResumeData },
    });

    trace.push({
      agentId: result.meta.agentId,
      model: result.meta.model,
      mode: 'ai',
      provider: result.meta.provider,
      promptVersion: result.meta.promptVersion,
      status: result.output.valid ? 'success' : 'fallback',
      summary: result.output.valid
        ? 'Guard approved polished resumeData.'
        : `Guard found issues: ${result.output.issues.join('; ')}`,
    });

    return result.output.safeResumeData || originalResumeData;
  } catch (error) {
    trace.push(createFallbackTrace(config, error, 'Guard failed. Returned polished resumeData.'));
    return polishedResumeData;
  }
}

function createLocalAnalysis(resumeData: ResumeData): ResumeAnalysis {
  return {
    targetRole: resumeData.basics.targetRole,
    strengths: [
      resumeData.projects.length > 0 ? 'has_project_experience' : '',
      resumeData.experiences.length > 0 ? 'has_work_or_internship_experience' : '',
      resumeData.skills.length > 0 ? 'has_skill_section' : '',
    ].filter(Boolean),
    risks: [
      resumeData.basics.summary ? '' : 'missing_summary',
      resumeData.projects.length > 0 || resumeData.experiences.length > 0 ? '' : 'missing_experience_or_project',
    ].filter(Boolean),
    polishFocus: ['clarity', 'action_verbs', 'resume_style'],
  };
}

function createSkippedTrace(config: Awaited<ReturnType<typeof readAgentConfig>>, summary: string): WorkflowStepTrace {
  return {
    agentId: config.id,
    model: config.model,
    mode: 'skipped',
    provider: config.provider,
    promptVersion: config.promptVersion,
    status: 'skipped',
    summary,
  };
}

function createFallbackTrace(
  config: Awaited<ReturnType<typeof readAgentConfig>>,
  error: unknown,
  summary: string,
): WorkflowStepTrace {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  return {
    agentId: config.id,
    model: config.model,
    mode: 'local-fallback',
    provider: config.provider,
    promptVersion: config.promptVersion,
    status: 'fallback',
    summary: `${summary} ${errorMessage}`,
  };
}
