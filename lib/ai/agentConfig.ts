import { promises as fs } from 'fs';
import path from 'path';

import photoEnhancerConfig from '../../ai-config/agents/photo-enhancer.json';
import resumeAnalystConfig from '../../ai-config/agents/resume-analyst.json';
import resumeExtractorConfig from '../../ai-config/agents/resume-extractor.json';
import resumeGuardConfig from '../../ai-config/agents/resume-guard.json';
import resumeIntakeConfig from '../../ai-config/agents/resume-intake.json';
import resumePolisherConfig from '../../ai-config/agents/resume-polisher.json';
import workflowCompilerConfig from '../../ai-config/agents/workflow-compiler.json';
export type AgentKind = 'text-json' | 'image-generation';
export type AgentBinding = 'unbound' | 'photo-enhance';

export type AgentConfig = {
  id: string;
  name: string;
  model: string;
  provider: string;
  promptVersion: string;
  temperature: number;
  enabled: boolean;
  prompt: string;
  kind: AgentKind;
  binding: AgentBinding;
};

export type CreateAgentInput = Omit<AgentConfig, 'id' | 'promptVersion'> & {
  promptVersion?: string;
};

const AGENT_CONFIG_DIR = path.join(process.cwd(), 'ai-config', 'agents');
const CANONICAL_AGENT_NAMES: Record<string, string> = {
  'photo-enhancer': '证件照优化 Agent',
  'resume-analyst': '简历分析智能体',
  'resume-extractor': '简历字段提取智能体',
  'resume-guard': '简历事实守卫智能体',
  'resume-intake': '简历逐步问答智能体',
  'resume-polisher': '简历润色智能体',
  'workflow-compiler': '自然语言编队编译器',
};
const BUNDLED_AGENT_CONFIGS: Record<string, unknown> = {
  'photo-enhancer': photoEnhancerConfig,
  'resume-analyst': resumeAnalystConfig,
  'resume-extractor': resumeExtractorConfig,
  'resume-guard': resumeGuardConfig,
  'resume-intake': resumeIntakeConfig,
  'resume-polisher': resumePolisherConfig,
  'workflow-compiler': workflowCompilerConfig,
};

export async function readAgentConfig(agentId: string): Promise<AgentConfig> {
  const filePath = getAgentConfigPath(agentId);

  try {
    const content = await fs.readFile(filePath, 'utf8');
    return normalizeAgentConfig(JSON.parse(content) as Partial<AgentConfig>, agentId);
  } catch (error) {
    const bundledConfig = BUNDLED_AGENT_CONFIGS[agentId];
    if (bundledConfig) return normalizeAgentConfig(bundledConfig as Partial<AgentConfig>, agentId);
    throw error;
  }
}
export async function listAgentConfigs(): Promise<AgentConfig[]> {
  try {
    const files = await fs.readdir(AGENT_CONFIG_DIR);
    const configs = await Promise.all(
      files.filter((file) => file.endsWith('.json')).map((file) => readAgentConfig(file.slice(0, -5))),
    );
    return configs.sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
  } catch {
    return Object.keys(BUNDLED_AGENT_CONFIGS)
      .map((agentId) => normalizeAgentConfig(BUNDLED_AGENT_CONFIGS[agentId] as Partial<AgentConfig>, agentId))
      .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
  }
}
export async function readAgentByBinding(binding: AgentBinding): Promise<AgentConfig | null> {
  const agents = await listAgentConfigs();
  return agents.find((agent) => agent.binding === binding) || null;
}

export async function createAgentConfig(input: CreateAgentInput): Promise<AgentConfig> {
  const id = `agent-${Date.now().toString(36)}`;
  const config = normalizeAgentConfig(
    {
      ...input,
      id,
      promptVersion: input.promptVersion?.trim() || `${new Date().toISOString().slice(0, 10)}-v1`,
    },
    id,
  );
  await writeAgentConfig(id, config);
  return config;
}

export async function writeAgentConfig(agentId: string, nextConfig: AgentConfig) {
  const filePath = getAgentConfigPath(agentId);
  await fs.writeFile(filePath, `${JSON.stringify(normalizeAgentConfig(nextConfig, agentId), null, 2)}\n`, 'utf8');
}

function normalizeAgentConfig(config: Partial<AgentConfig>, fallbackId: string): AgentConfig {
  return {
    id: config.id || fallbackId,
    name: CANONICAL_AGENT_NAMES[config.id || fallbackId] || config.name || fallbackId,
    model: config.model || '',
    provider: config.provider || 'deepseek',
    promptVersion: config.promptVersion || 'v1',
    temperature: typeof config.temperature === 'number' ? config.temperature : 0,
    enabled: config.enabled !== false,
    prompt: config.prompt || '',
    kind: config.kind === 'image-generation' ? 'image-generation' : 'text-json',
    binding: config.binding === 'photo-enhance' ? 'photo-enhance' : 'unbound',
  };
}

function getAgentConfigPath(agentId: string) {
  if (!/^[a-z0-9-]+$/i.test(agentId)) {
    throw new Error('Invalid agent id.');
  }

  return path.join(AGENT_CONFIG_DIR, `${agentId}.json`);
}