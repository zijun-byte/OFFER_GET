import { promises as fs } from 'fs';
import path from 'path';

export type AgentRunLog = {
  id: string;
  workflowId: string;
  createdAt: string;
  durationMs: number;
  mode: 'ai' | 'local-fallback';
  suggestionCount: number;
  inputSummary: string;
  trace: Array<{
    agentId: string;
    provider: string;
    model: string;
    promptVersion: string;
    status: string;
    summary: string;
  }>;
};

const LOG_DIR = path.join(process.cwd(), 'ai-config', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'agent-runs.jsonl');

export async function appendAgentRunLog(log: AgentRunLog) {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    await fs.appendFile(LOG_FILE, JSON.stringify(log) + String.fromCharCode(10), 'utf8');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    // Vercel functions run on a read-only deployment filesystem. Logging must
    // not turn an otherwise successful AI response into a failed request.
    if (process.env.VERCEL || code === 'EROFS' || code === 'EPERM') return;
    throw error;
  }
}
export async function readAgentRunLogs(limit = 50): Promise<AgentRunLog[]> {
  try {
    const content = await fs.readFile(LOG_FILE, 'utf8');
    return content
      .split(/\r?\n/)
      .filter(Boolean)
      .slice(-limit)
      .reverse()
      .map((line) => JSON.parse(line) as AgentRunLog);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}
