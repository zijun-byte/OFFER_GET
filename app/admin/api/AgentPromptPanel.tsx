'use client';

import { useEffect, useState } from 'react';
import { shellStyles } from '../../components/SiteShell';
import styles from './ApiAdminPage.module.css';

type AgentKind = 'text-json' | 'image-generation';
type AgentBinding = 'unbound' | 'photo-enhance';

type AgentConfig = {
  id: string;
  name: string;
  kind: AgentKind;
  binding: AgentBinding;
  model: string;
  provider: string;
  promptVersion: string;
  temperature: number;
  enabled: boolean;
  prompt: string;
};

type AgentConfigVersion = AgentConfig & { savedAt: string };

type NewAgentDraft = Omit<AgentConfig, 'id'>;

const emptyImageAgent: NewAgentDraft = {
  binding: 'unbound',
  enabled: true,
  kind: 'image-generation',
  model: 'doubao-seedream-5-0-260128',
  name: '',
  prompt: '描述该图像角色必须保留或禁止改变的内容。',
  promptVersion: '',
  provider: 'ark',
  temperature: 0,
};

export default function AgentPromptPanel() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [versions, setVersions] = useState<AgentConfigVersion[]>([]);
  const [newAgent, setNewAgent] = useState<NewAgentDraft>(emptyImageAgent);
  const [status, setStatus] = useState('加载中');
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    if (!selectedAgentId) return;
    setConfig(null);
    setStatus('加载中');

    fetch(`/api/admin/agents/${selectedAgentId}`)
      .then((response) => response.json())
      .then((payload: AgentConfig) => {
        setConfig(payload);
        setStatus('已加载');
      })
      .catch(() => setStatus('加载失败'));

    fetch(`/api/admin/agents/${selectedAgentId}/versions`)
      .then((response) => response.json())
      .then((payload: { versions: AgentConfigVersion[] }) => setVersions(payload.versions))
      .catch(() => setVersions([]));
  }, [selectedAgentId]);

  async function loadAgents(preferredId?: string) {
    try {
      const response = await fetch('/api/admin/agents');
      const payload = (await response.json()) as { agents: AgentConfig[] };
      setAgents(payload.agents);
      setSelectedAgentId((current) => preferredId || current || payload.agents.find((agent) => agent.id === 'resume-intake')?.id || payload.agents[0]?.id || '');
    } catch {
      setStatus('角色列表加载失败');
    }
  }

  async function saveConfig() {
    if (!config) return;
    setIsSaving(true);
    setStatus('保存中');

    try {
      const response = await fetch(`/api/admin/agents/${config.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error('save failed');

      const payload = (await response.json()) as AgentConfig;
      setConfig(payload);
      await loadAgents(payload.id);
      const versionResponse = await fetch(`/api/admin/agents/${payload.id}/versions`);
      const versionPayload = (await versionResponse.json()) as { versions: AgentConfigVersion[] };
      setVersions(versionPayload.versions);
      setStatus('已保存，下一次对应功能调用会使用新配置');
    } catch {
      setStatus('保存失败');
    } finally {
      setIsSaving(false);
    }
  }

  async function createAgent() {
    if (!newAgent.name.trim() || !newAgent.prompt.trim()) {
      setStatus('请填写角色名称和 Prompt');
      return;
    }

    setIsCreating(true);
    setStatus('正在创建角色');
    try {
      const response = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAgent),
      });
      if (!response.ok) throw new Error('create failed');
      const agent = (await response.json()) as AgentConfig;
      await loadAgents(agent.id);
      setNewAgent(emptyImageAgent);
      setStatus(`已创建 ${agent.name}`);
    } catch {
      setStatus('创建失败，请检查模型和角色信息');
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <section className={styles.agentPanel} aria-labelledby="agent-prompt-title">
      <div className={styles.agentPanelHeader}>
        <div>
          <span className={styles.kicker}>智能体配置</span>
          <h2 id="agent-prompt-title">Agent 管理</h2>
          <p>创建独立角色，为它选择模型、Prompt 与产品功能绑定。图像角色和文本角色可共存，但每种供应商必须有对应后端适配器。</p>
        </div>
        <span className={styles.phase}>{status}</span>
      </div>

      <section className={styles.agentCreatePanel} aria-label="新建智能体角色">
        <div className={styles.createHeader}>
          <strong>新建角色</strong>
          <span>创建后不会自动绑定；请确认绑定功能后再保存使用。</span>
        </div>
        <div className={styles.agentCreateGrid}>
          <AgentTextField label="角色名称" value={newAgent.name} onChange={(name) => setNewAgent({ ...newAgent, name })} />
          <AgentSelectField label="角色类型" value={newAgent.kind} onChange={(kind) => setNewAgent({ ...newAgent, kind: kind as AgentKind, provider: kind === 'image-generation' ? 'ark' : 'deepseek' })} options={[['text-json', '文本 / JSON Agent'], ['image-generation', '图像生成 Agent']]} />
          <AgentSelectField label="功能绑定" value={newAgent.binding} onChange={(binding) => setNewAgent({ ...newAgent, binding: binding as AgentBinding })} options={[['unbound', '暂不绑定功能'], ['photo-enhance', '证件照优化']]} />
          <AgentTextField label="Provider" value={newAgent.provider} onChange={(provider) => setNewAgent({ ...newAgent, provider })} />
          <AgentTextField label="模型" value={newAgent.model} onChange={(model) => setNewAgent({ ...newAgent, model })} />
        </div>
        <label className={styles.agentField}>
          <span>角色 Prompt</span>
          <textarea className={styles.createPromptTextarea} value={newAgent.prompt} onChange={(event) => setNewAgent({ ...newAgent, prompt: event.target.value })} />
        </label>
        <div className={styles.agentActions}>
          <button className={shellStyles.button} disabled={isCreating} onClick={createAgent} type="button">{isCreating ? '创建中' : '创建独立 Agent'}</button>
        </div>
      </section>

      <div className={styles.agentSelector} aria-label="选择智能体">
        {agents.map((agent) => (
          <button className={`${styles.agentSelectorButton} ${selectedAgentId === agent.id ? styles.agentSelectorButtonActive : ''}`} key={agent.id} onClick={() => setSelectedAgentId(agent.id)} type="button">
            {agent.name}
          </button>
        ))}
      </div>

      {config ? (
        <>
          <div className={styles.agentControls}>
            <label className={styles.agentField}><span>启用真实模型</span><input checked={config.enabled} onChange={(event) => setConfig({ ...config, enabled: event.target.checked })} type="checkbox" /></label>
            <AgentSelectField label="角色类型" value={config.kind} onChange={(kind) => setConfig({ ...config, kind: kind as AgentKind })} options={[['text-json', '文本 / JSON Agent'], ['image-generation', '图像生成 Agent']]} />
            <AgentSelectField label="功能绑定" value={config.binding} onChange={(binding) => setConfig({ ...config, binding: binding as AgentBinding })} options={[['unbound', '暂不绑定功能'], ['photo-enhance', '证件照优化']]} />
            <AgentTextField label="Provider" value={config.provider} onChange={(provider) => setConfig({ ...config, provider })} />
            <AgentTextField label="模型" value={config.model} onChange={(model) => setConfig({ ...config, model })} />
            <AgentTextField label="Prompt 版本" value={config.promptVersion} onChange={(promptVersion) => setConfig({ ...config, promptVersion })} />
            <label className={styles.agentField}><span>温度</span><input max="1" min="0" onChange={(event) => setConfig({ ...config, temperature: Number(event.target.value) })} step="0.1" type="number" value={config.temperature} /></label>
          </div>
          <textarea className={styles.promptTextarea} onChange={(event) => setConfig({ ...config, prompt: event.target.value })} value={config.prompt} />
          {versions.length > 1 ? <PromptComparison versions={versions} /> : null}
          <div className={styles.agentActions}><button className={shellStyles.button} disabled={isSaving} onClick={saveConfig} type="button">{isSaving ? '保存中' : '保存角色配置'}</button></div>
        </>
      ) : <p className={styles.emptyText}>正在读取角色配置。</p>}
    </section>
  );
}

function AgentTextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className={styles.agentField}><span>{label}</span><input onChange={(event) => onChange(event.target.value)} value={value} /></label>;
}

function AgentSelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return <label className={styles.agentField}><span>{label}</span><select onChange={(event) => onChange(event.target.value)} value={value}>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
}

function PromptComparison({ versions }: { versions: AgentConfigVersion[] }) {
  return <section className={styles.promptCompare} aria-label="Prompt 版本对比"><div className={styles.compareHeader}><strong>Prompt 版本对比</strong><span>{versions[0].promptVersion} 对比 {versions[1].promptVersion}</span></div><div className={styles.compareGrid}><article><span>当前版本 · {versions[0].promptVersion}</span><pre>{versions[0].prompt}</pre></article><article><span>上一版本 · {versions[1].promptVersion}</span><pre>{versions[1].prompt}</pre></article></div></section>;
}