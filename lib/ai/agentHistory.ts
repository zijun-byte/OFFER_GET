import { promises as fs } from 'fs';
import path from 'path';
import type { AgentConfig } from './agentConfig';

export type AgentConfigVersion = AgentConfig & {
  savedAt: string;
};

const HISTORY_DIR = path.join(process.cwd(), 'ai-config', 'history');

export async function appendAgentConfigVersion(config: AgentConfig) {
  await fs.mkdir(HISTORY_DIR, { recursive: true });
  const history = await readAgentConfigVersions(config.id);
  if (history[0]?.promptVersion === config.promptVersion && history[0]?.prompt === config.prompt) return;
  history.unshift({ ...config, savedAt: new Date().toISOString() });
  await fs.writeFile(getHistoryPath(config.id), `${JSON.stringify(history.slice(0, 30), null, 2)}\n`, 'utf8');
}

export async function readAgentConfigVersions(agentId: string): Promise<AgentConfigVersion[]> {
  try {
    const content = await fs.readFile(getHistoryPath(agentId), 'utf8');
    return JSON.parse(content) as AgentConfigVersion[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

function getHistoryPath(agentId: string) {
  if (!/^[a-z0-9-]+$/i.test(agentId)) throw new Error('Invalid agent id.');
  return path.join(HISTORY_DIR, `${agentId}.json`);
}
