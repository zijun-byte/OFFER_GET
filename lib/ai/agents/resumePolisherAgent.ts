import { polishResumeData, type ResumeData } from '../../../app/online-editor/resumePreviewData';
import { readAgentConfig } from '../agentConfig';
import { runJsonAgent } from '../agentRuntime';

type ResumePolisherResult = {
  resumeData: ResumeData;
  meta: {
    agentId: string;
    model: string;
    mode: 'ai' | 'local-fallback';
    provider: string;
    promptEnabled: boolean;
    promptVersion: string;
    error?: string;
  };
};

export async function runResumePolisherAgent(resumeData: ResumeData): Promise<ResumePolisherResult> {
  const config = await readAgentConfig('resume-polisher');

  if (!config.enabled) {
    return {
      resumeData: polishResumeData(resumeData),
      meta: {
        agentId: config.id,
        model: config.model,
        provider: config.provider,
        mode: 'local-fallback',
        promptEnabled: false,
        promptVersion: config.promptVersion,
      },
    };
  }

  try {
    const result = await runJsonAgent<{ resumeData: ResumeData }, { resumeData: ResumeData }>({
      agentId: 'resume-polisher',
      task: 'polish_resume_data',
      input: { resumeData },
    });

    return {
      resumeData: result.output.resumeData,
      meta: {
        agentId: result.meta.agentId,
        model: result.meta.model,
        provider: result.meta.provider,
        mode: 'ai',
        promptEnabled: true,
        promptVersion: result.meta.promptVersion,
      },
    };
  } catch (error) {
    const latestConfig = await readAgentConfig('resume-polisher').catch(() => config);

    return {
      resumeData: polishResumeData(resumeData),
      meta: {
        agentId: latestConfig.id,
        model: latestConfig.model,
        provider: latestConfig.provider,
        mode: 'local-fallback',
        promptEnabled: true,
        promptVersion: latestConfig.promptVersion,
        error: error instanceof Error ? error.message : 'Unknown AI provider error.',
      },
    };
  }
}
