'use client';

import { useState } from 'react';
import styles from './AdminWorkbench.module.css';

type CompiledAgent = {
  id: string;
  name: string;
  role: string;
  order: number;
  enabled: boolean;
  provider: string;
  model: string;
  promptAppendix: string;
};

type CompileResult = {
  workflowId: 'resume-polish';
  name: string;
  explanation: string;
  agents: CompiledAgent[];
  mode: 'ai' | 'local-fallback';
};

const example = '建立一个简历润色编队：分析员先找出岗位匹配重点，润色员让表达更专业简洁，事实审核员严格禁止编造。三个角色都使用 DeepSeek。';

export default function WorkflowCompilerPanel() {
  const [instruction, setInstruction] = useState(example);
  const [draft, setDraft] = useState<CompileResult | null>(null);
  const [status, setStatus] = useState('输入自然语言后生成编队草稿');
  const [busy, setBusy] = useState(false);

  async function compile() {
    setBusy(true);
    setStatus('正在理解编队要求...');
    try {
      const response = await fetch('/api/admin/workflows/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction }),
      });
      if (!response.ok) throw new Error('compile failed');
      const payload = (await response.json()) as CompileResult;
      setDraft(payload);
      setStatus(payload.mode === 'ai' ? 'AI 已生成草稿，发布前请检查' : '已用本地规则生成草稿');
    } catch {
      setStatus('编译失败，请检查模型配置');
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (!draft) return;
    setBusy(true);
    setStatus('正在发布编队配置...');
    try {
      const response = await fetch('/api/admin/workflows/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      if (!response.ok) throw new Error('publish failed');
      const payload = (await response.json()) as { message: string };
      setStatus(payload.message);
    } catch {
      setStatus('发布失败，正式配置未改变');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>自然语言编队编译器</h2>
          <p>直接描述角色、职责、模型和约束。系统先生成可检查的草稿，确认后再发布到正式简历润色流程。</p>
        </div>
        <span className={styles.tag}>{status}</span>
      </div>
      <div className={styles.compilerLayout}>
        <div>
          <label className={styles.compilerField}>
            <span>用自然语言安排智能体</span>
            <textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} />
          </label>
          <div className={styles.debugActions}>
            <button className={styles.primaryButton} disabled={busy || !instruction.trim()} onClick={compile} type="button">
              {busy ? '处理中' : '生成编队草稿'}
            </button>
            {draft ? <button className={styles.ghostButton} disabled={busy} onClick={publish} type="button">确认发布</button> : null}
          </div>
        </div>
        <div className={styles.compiledWorkflow}>
          {draft ? (
            <>
              <p className={styles.compileExplanation}>{draft.explanation}</p>
              {draft.agents.map((agent) => (
                <article className={styles.compiledAgent} key={agent.id}>
                  <div className={styles.agentTop}>
                    <strong>{agent.order}. {agent.name}</strong>
                    <span className={styles.tag}>{agent.enabled ? '启用' : '停用'}</span>
                  </div>
                  <p>{agent.role}</p>
                  <small>{agent.provider} / {agent.model}</small>
                  {agent.promptAppendix ? <blockquote>{agent.promptAppendix}</blockquote> : null}
                </article>
              ))}
            </>
          ) : <p className={styles.emptyLog}>编译后的角色、顺序和追加规则会显示在这里。</p>}
        </div>
      </div>
    </section>
  );
}
