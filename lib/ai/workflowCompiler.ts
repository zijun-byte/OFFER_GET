import { readAgentConfig, type AgentConfig } from './agentConfig';
import { runJsonAgent } from './agentRuntime';

export type CompiledAgentDraft = {
  id: 'resume-analyst' | 'resume-polisher' | 'resume-guard';
  name: string;
  role: string;
  order: number;
  enabled: boolean;
  provider: string;
  model: string;
  promptAppendix: string;
};

export type WorkflowCompileResult = {
  workflowId: 'resume-polish';
  name: string;
  explanation: string;
  agents: CompiledAgentDraft[];
  mode: 'ai' | 'local-fallback';
};

type CompilerOutput = Omit<WorkflowCompileResult, 'mode'>;

export async function compileResumeWorkflow(instruction: string): Promise<WorkflowCompileResult> {
  const currentAgents = await Promise.all(
    ['resume-analyst', 'resume-polisher', 'resume-guard'].map((id) => readAgentConfig(id)),
  );

  try {
    const result = await runJsonAgent<
      { instruction: string; currentAgents: AgentConfig[] },
      CompilerOutput
    >({
      agentId: 'workflow-compiler',
      task: 'compile_natural_language_resume_agent_team',
      input: { instruction, currentAgents },
    });

    return normalizeCompileResult(result.output, currentAgents, 'ai');
  } catch {
    return createFallbackCompileResult(instruction, currentAgents);
  }
}

function normalizeCompileResult(
  output: CompilerOutput,
  currentAgents: AgentConfig[],
  mode: WorkflowCompileResult['mode'],
): WorkflowCompileResult {
  const allowed = new Set(['resume-analyst', 'resume-polisher', 'resume-guard']);
  const proposed = Array.isArray(output.agents) ? output.agents.filter((agent) => allowed.has(agent.id)) : [];
  const agents = currentAgents.map((current, index) => {
    const next = proposed.find((agent) => agent.id === current.id);
    return {
      id: current.id as CompiledAgentDraft['id'],
      name: next?.name?.trim() || current.name,
      role: next?.role?.trim() || defaultRole(current.id),
      order: index + 1,
      enabled: typeof next?.enabled === 'boolean' ? next.enabled : current.enabled,
      provider: next?.provider?.trim() || current.provider,
      model: next?.model?.trim() || current.model,
      promptAppendix: next?.promptAppendix?.trim() || '',
    };
  });

  return {
    workflowId: 'resume-polish',
    name: output.name?.trim() || '简历润色智能体编队',
    explanation: output.explanation?.trim() || '已将自然语言要求整理为可发布的智能体配置草稿。',
    agents,
    mode,
  };
}

function createFallbackCompileResult(instruction: string, currentAgents: AgentConfig[]): WorkflowCompileResult {
  const strict = /严格|禁止编造|真实性|事实/.test(instruction);
  const concise = /简洁|精简|不要啰嗦/.test(instruction);
  return normalizeCompileResult(
    {
      workflowId: 'resume-polish',
      name: '简历润色智能体编队',
      explanation: '真实模型暂时不可用，已用本地规则生成可编辑草稿。',
      agents: currentAgents.map((agent, index) => ({
        id: agent.id as CompiledAgentDraft['id'],
        name: agent.name,
        role: defaultRole(agent.id),
        order: index + 1,
        enabled: agent.enabled,
        provider: agent.provider,
        model: agent.model,
        promptAppendix: [strict ? '严格禁止新增、猜测或夸大用户未提供的事实。' : '', concise ? '表达应简洁，优先使用短句和明确动作。' : '', instruction].filter(Boolean).join('\n'),
      })),
    },
    currentAgents,
    'local-fallback',
  );
}

function defaultRole(agentId: string) {
  if (agentId === 'resume-analyst') return '分析目标岗位、简历优势、风险和润色重点';
  if (agentId === 'resume-polisher') return '根据分析结果优化表达，不新增事实';
  return '检查编造、夸大和结构错误，返回安全结果';
}
