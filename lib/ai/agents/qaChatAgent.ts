import { runJsonAgent } from '../agentRuntime';

export type QaChatDraft = { company?: string; role?: string; resume?: string };
export type QaChatHistoryMessage = { role: 'ai' | 'user'; content: string };
type QaChatOutput = { reply?: unknown; suggestions?: unknown };

export async function runQaChatAgent(input: {
  draft: QaChatDraft;
  history: QaChatHistoryMessage[];
  message: string;
}) {
  const result = await runJsonAgent<typeof input, QaChatOutput>({
    agentId: 'qa-chat',
    task: 'answer_job_preparation_question',
    input,
  });
  const reply = typeof result.output.reply === 'string' ? result.output.reply.trim() : '';
  if (!reply) throw new Error('AI provider returned no reply.');

  const suggestions = Array.isArray(result.output.suggestions)
    ? result.output.suggestions
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];

  return { reply, suggestions, meta: result.meta };
}
