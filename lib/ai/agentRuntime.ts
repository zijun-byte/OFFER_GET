import { readAgentConfig, type AgentConfig } from './agentConfig';
import { runOpenAICompatibleJson } from './providers/openaiCompatible';

export type AgentRunMeta = {
  agentId: string;
  model: string;
  mode: 'ai';
  provider: string;
  promptVersion: string;
};

type RunJsonAgentOptions<TInput> = {
  agentId: string;
  input: TInput;
  task: string;
};

export async function runJsonAgent<TInput, TOutput>({
  agentId,
  input,
  task,
}: RunJsonAgentOptions<TInput>): Promise<{ output: TOutput; config: AgentConfig; meta: AgentRunMeta }> {
  const config = await readAgentConfig(agentId);

  if (!config.enabled) {
    throw new Error(`Agent ${agentId} is disabled.`);
  }

  const output = await runOpenAICompatibleJson<TOutput>({
    model: config.model,
    provider: config.provider,
    temperature: config.temperature,
    messages: [
      { role: 'system', content: config.prompt },
      {
        role: 'user',
        content: JSON.stringify({
          task,
          input,
        }),
      },
    ],
  });

  return {
    output,
    config,
    meta: {
      agentId: config.id,
      model: config.model,
      mode: 'ai',
      provider: config.provider,
      promptVersion: config.promptVersion,
    },
  };
}
