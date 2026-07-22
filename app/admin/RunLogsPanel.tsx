'use client';

import { useEffect, useState } from 'react';
import styles from './AdminWorkbench.module.css';

type RunLog = {
  id: string;
  createdAt: string;
  durationMs: number;
  inputSummary: string;
  mode: string;
  suggestionCount: number;
  trace: Array<{ agentId: string; provider: string; model: string; promptVersion: string; status: string; summary: string }>;
};

export default function RunLogsPanel() {
  const [logs, setLogs] = useState<RunLog[]>([]);
  const [status, setStatus] = useState('加载中');

  useEffect(() => {
    fetch('/api/admin/logs')
      .then((response) => response.json())
      .then((payload: { logs: RunLog[] }) => {
        setLogs(payload.logs);
        setStatus(payload.logs.length > 0 ? `共 ${payload.logs.length} 次运行` : '暂无运行记录');
      })
      .catch(() => setStatus('日志加载失败'));
  }, []);

  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>智能体调用日志</h2>
          <p>记录模型、Prompt 版本、耗时和运行状态。默认仅保存简历结构摘要，不保存完整用户简历。</p>
        </div>
        <span className={styles.tag}>{status}</span>
      </div>
      <div className={styles.logList}>
        {logs.map((log) => (
          <details className={styles.logItem} key={log.id}>
            <summary>
              <span>
                <strong>{log.inputSummary}</strong>
                <small>{new Date(log.createdAt).toLocaleString('zh-CN')} · {log.durationMs} ms · {log.suggestionCount} 条建议</small>
              </span>
              <span className={styles.tag}>{log.mode}</span>
            </summary>
            <div className={styles.traceList}>
              {log.trace.map((step, index) => (
                <div className={styles.traceItem} key={`${log.id}-${step.agentId}-${index}`}>
                  <strong>{index + 1}. {step.agentId}</strong>
                  <span>{step.provider} / {step.model}</span>
                  <span>Prompt: {step.promptVersion}</span>
                  <span>{step.status} · {step.summary}</span>
                </div>
              ))}
            </div>
          </details>
        ))}
        {logs.length === 0 ? <p className={styles.emptyLog}>运行一次“基础润色”后，日志会显示在这里。</p> : null}
      </div>
    </section>
  );
}
