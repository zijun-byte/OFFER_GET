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

const RESUME_EXTRACTOR_ENTITY_RULES = [
  '',
  '[ENTITY_EXTRACTION_RULES]',
  '\u5f53\u7528\u6237\u8bf4\u201c\u5728 X \u5de5\u4f5c\u3001\u5728 X \u5f53\u8fc7\u3001\u5728 X \u6559\u5b66\u3001\u5728 X \u4efb\u804c\u3001\u4e3a X \u670d\u52a1\u201d\u65f6\uff0c\u5fc5\u987b\u7528\u8bed\u4e49\u8bc6\u522b X \u662f\u96c7\u4e3b\u3001\u673a\u6784\u3001\u5e97\u94fa\u6216\u9879\u76ee\u4e3b\u4f53\uff0c\u5e76\u5199\u5165 organization\u3002',
  '\u4e0d\u5f97\u4ec5\u4f9d\u8d56\u201c\u516c\u53f8\u3001\u96c6\u56e2\u3001\u673a\u6784\u201d\u8fd9\u7c7b\u540e\u7f00\u3002\u540d\u79f0\u53ef\u4ee5\u662f\u7ebf\u4e0b\u5e97\u94fa\u3001\u827a\u672f\u673a\u6784\u3001\u97f3\u54cd\u5e97\u3001\u4f53\u80b2\u5f69\u7968\u5e97\u7b49\u3002',
  '\u4f8b\u5982\uff1a\u201c\u6211\u5728\u6167\u535a\u827a\u672f\u7434\u884c\u5f53\u8fc7\u5409\u4ed6\u8001\u5e08\u201d\u5fc5\u987b\u63d0\u53d6 organization=\u201c\u6167\u535a\u827a\u672f\u7434\u884c\u201d\u3001role=\u201c\u5409\u4ed6\u8001\u5e08\u201d\uff1b\u201c\u6211\u5728 X \u97f3\u54cd\u505a\u9500\u552e\u201d\u5fc5\u987b\u63d0\u53d6 organization=\u201cX \u97f3\u54cd\u201d\u3002',
  '\u82e5\u53ea\u6709\u5730\u540d\u6216\u54c1\u724c\u540d\u3001\u4e14\u6ca1\u6709\u660e\u786e\u4efb\u804c\u5173\u7cfb\uff0c\u4e0d\u5f97\u81ea\u884c\u731c\u6d4b\u4e3a\u673a\u6784\u3002',
].join('\n');

function withRequiredAgentRules(prompt: string, agentId: string) {
  if (agentId !== 'resume-extractor' || prompt.includes('[ENTITY_EXTRACTION_RULES]')) return prompt;
  return prompt + RESUME_EXTRACTOR_ENTITY_RULES;
}
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
    prompt: withRequiredAgentRules(config.prompt || '', config.id || fallbackId),
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