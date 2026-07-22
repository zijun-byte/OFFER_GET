'use client';

import { useMemo, useState } from 'react';
import AgentPromptPanel from './api/AgentPromptPanel';
import RunLogsPanel from './RunLogsPanel';
import WorkflowCompilerPanel from './WorkflowCompilerPanel';
import styles from './AdminWorkbench.module.css';

type TabKey = 'overview' | 'api' | 'workflow' | 'prompts' | 'debug' | 'logs' | 'templates';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'overview', label: '总览' },
  { key: 'api', label: 'API 模块' },
  { key: 'workflow', label: '智能体编队' },
  { key: 'prompts', label: 'Prompt 管理' },
  { key: 'debug', label: '调试台' },
  { key: 'logs', label: '调用日志' },
  { key: 'templates', label: '模板管理' },
];

const endpoints = [
  {
    path: '/api/resume/extract',
    phase: '已接入前端',
    summary: '简历提取入口，返回 ResumeExtractionDraft。',
  },
  {
    path: '/api/resume/polish',
    phase: '接入智能体层',
    summary: '简历润色入口，调用 resumePolishWorkflow / resume-polisher agent。',
  },
  {
    path: '/api/photo/enhance',
    phase: '已接入 Ark 图像模型',
    summary: '证件照优化入口，服务端调用 doubao-seedream-5-0-260128 图生图模型，不向前端暴露密钥。',
  },
  {
    path: '/api/interview/questions',
    phase: 'Mock',
    summary: '面试问题生成占位接口。',
  },
  {
    path: '/api/interview/answer-feedback',
    phase: 'Mock',
    summary: '面试回答反馈占位接口。',
  },
  {
    path: '/api/fortune/draw',
    phase: 'Mock',
    summary: '占卜模块占位接口。',
  },
];

const workflowAgents = [
  {
    name: 'Analyst Agent',
    role: '理解目标岗位和简历结构',
    provider: 'DeepSeek',
    model: 'deepseek-chat',
    status: '待接入',
  },
  {
    name: 'Polisher Agent',
    role: '润色已有 resumeData，不新增事实',
    provider: 'DeepSeek',
    model: 'deepseek-chat',
    status: '已接入',
  },
  {
    name: 'Guard Agent',
    role: '检查胡编、缺字段和 JSON 结构',
    provider: '可切换',
    model: '待配置',
    status: '下一步',
  },
  {
    name: 'Formatter',
    role: '稳定输出 resumeData',
    provider: '本地规则',
    model: 'deterministic',
    status: '规则层',
  },
];

const sampleResumeData = {
  basics: {
    name: '林若曦',
    targetRole: 'AIGC 产品运营实习生',
    city: '上海',
    phone: '13800000000',
    email: 'lin@example.com',
    portfolio: '',
    summary: '我对 AI 内容产品比较感兴趣，做过校园内容活动，也会整理数据。',
  },
  education: [
    {
      id: 'edu-debug-1',
      school: '华东理工大学',
      major: '市场营销',
      degree: '本科',
      startDate: '2023',
      endDate: '2027',
      highlights: ['主修消费者行为、品牌传播、数据分析'],
    },
  ],
  experiences: [],
  projects: [
    {
      id: 'project-debug-1',
      organization: '校园新媒体栏目增长项目',
      role: '项目成员',
      type: 'project',
      startDate: '2024.09',
      endDate: '2025.01',
      description: '负责选题、发布和复盘',
      bullets: ['做了每周选题表，发了图文和短内容', '看数据然后调整标题和封面'],
    },
  ],
  skills: [
    {
      id: 'skill-debug-1',
      title: '内容表达',
      source: 'confirmed',
      details: ['会写活动文案和复盘总结'],
    },
  ],
};

export default function AdminWorkbench() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [debugInput, setDebugInput] = useState(JSON.stringify(sampleResumeData, null, 2));
  const [debugResult, setDebugResult] = useState('等待调试运行。');
  const [isDebugging, setIsDebugging] = useState(false);

  const pageCopy = useMemo(() => {
    const active = tabs.find((tab) => tab.key === activeTab);
    return {
      title: active?.label || '后台工作台',
      description:
        '统一管理产品后台和智能体层：API 入口、Agent 编队、Prompt 配置、调试运行、调用日志和模板数据都从这里进入。',
    };
  }, [activeTab]);

  async function runDebug() {
    setIsDebugging(true);
    setDebugResult('正在调用 /api/resume/polish ...');

    try {
      const resumeData = JSON.parse(debugInput);
      const response = await fetch('/api/resume/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData }),
      });

      const payload = await response.json();
      setDebugResult(JSON.stringify(payload, null, 2));
    } catch (error) {
      setDebugResult(error instanceof Error ? error.message : '调试失败。');
    } finally {
      setIsDebugging(false);
    }
  }

  return (
    <main className={styles.root}>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.brand}>
            <strong>Offer_GET Admin</strong>
            <span>后台 + 智能体工作台</span>
          </div>
          <nav className={styles.nav} aria-label="后台导航">
            {tabs.map((tab) => (
              <button
                className={`${styles.navButton} ${activeTab === tab.key ? styles.navButtonActive : ''}`}
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <section className={styles.main}>
          <header className={styles.topbar}>
            <div>
              <h1>{pageCopy.title}</h1>
              <p>{pageCopy.description}</p>
            </div>
            <span className={styles.statusPill}>内部后台 · 不挂前台入口</span>
          </header>

          <div className={styles.content}>{renderTab(activeTab, debugInput, setDebugInput, debugResult, runDebug, isDebugging)}</div>
        </section>
      </div>
    </main>
  );
}

function renderTab(
  activeTab: TabKey,
  debugInput: string,
  setDebugInput: (value: string) => void,
  debugResult: string,
  runDebug: () => void,
  isDebugging: boolean,
) {
  if (activeTab === 'api') return <ApiModules />;
  if (activeTab === 'workflow') return <><WorkflowCompilerPanel /><Workflow /></>;
  if (activeTab === 'prompts') return <AgentPromptPanel />;
  if (activeTab === 'debug') {
    return (
      <DebugPanel
        debugInput={debugInput}
        debugResult={debugResult}
        isDebugging={isDebugging}
        runDebug={runDebug}
        setDebugInput={setDebugInput}
      />
    );
  }
  if (activeTab === 'logs') return <RunLogsPanel />;
  if (activeTab === 'templates') {
    return (
      <Placeholder title="模板管理">
        后续这里管理简历模板：模板名称、预览图、适用人群、导出配置、是否上架。它属于后台数据管理，不属于智能体层。
      </Placeholder>
    );
  }

  return (
    <>
      <section className={styles.statsGrid}>
        <Stat value="6" label="API 接口" />
        <Stat value="4" label="编队节点" />
        <Stat value="1" label="已接 Agent" />
        <Stat value="2" label="Mock 模块" />
      </section>
      <section className={styles.gridTwo}>
        <Panel title="后台层负责什么" description="管理产品数据、用户操作、模板、日志、API 权限、功能开关和调用统计。" />
        <Panel title="智能体层负责什么" description="组织 Agent 编队、选择模型供应商、执行 prompt、校验 AI 输出并返回结构化结果。" />
      </section>
      <Workflow />
    </>
  );
}

function ApiModules() {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>API 模块</h2>
          <p>这些是前端调用后台的产品能力入口。前端只碰 API，不直接碰模型或 Agent。</p>
        </div>
      </div>
      <div className={styles.gridTwo}>
        {endpoints.map((endpoint) => (
          <article className={styles.endpointCard} key={endpoint.path}>
            <div className={styles.endpointTop}>
              <div>
                <span className={styles.method}>POST</span>
                <div className={styles.endpointPath}>{endpoint.path}</div>
              </div>
              <span className={styles.tag}>{endpoint.phase}</span>
            </div>
            <p className={styles.description}>{endpoint.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Workflow() {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>简历润色智能体编队</h2>
          <p>当前正式流程按分析、润色、事实审核顺序运行；自然语言编译器发布后会更新各角色的模型、启用状态和追加规则。</p>
        </div>
      </div>
      <div className={styles.workflow}>
        {workflowAgents.map((agent) => (
          <article className={styles.agentCard} key={agent.name}>
            <div className={styles.agentTop}>
              <strong className={styles.agentName}>{agent.name}</strong>
              <span className={styles.tag}>{agent.status}</span>
            </div>
            <p className={styles.description}>{agent.role}</p>
            <div className={styles.agentMeta}>
              <span>Provider: {agent.provider}</span>
              <span>Model: {agent.model}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DebugPanel({
  debugInput,
  debugResult,
  isDebugging,
  runDebug,
  setDebugInput,
}: {
  debugInput: string;
  debugResult: string;
  isDebugging: boolean;
  runDebug: () => void;
  setDebugInput: (value: string) => void;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>简历润色调试台</h2>
          <p>这里直接调用 `/api/resume/polish`，用于验证智能体层、prompt 和供应商配置是否生效。</p>
        </div>
      </div>
      <div className={styles.debugGrid}>
        <div>
          <textarea className={styles.debugTextarea} onChange={(event) => setDebugInput(event.target.value)} value={debugInput} />
          <div className={styles.debugActions}>
            <button className={styles.primaryButton} disabled={isDebugging} onClick={runDebug} type="button">
              {isDebugging ? '运行中' : '运行润色编队'}
            </button>
            <button
              className={styles.ghostButton}
              onClick={() => setDebugInput(JSON.stringify(sampleResumeData, null, 2))}
              type="button"
            >
              重置样例
            </button>
          </div>
        </div>
        <pre className={styles.resultBox}>{debugResult}</pre>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className={styles.statCard}>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function Panel({ description, title }: { description: string; title: string }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
    </section>
  );
}

function Placeholder({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className={styles.placeholderGrid}>
      <article className={styles.placeholderCard}>
        <h3>{title}</h3>
        <p>{children}</p>
      </article>
    </section>
  );
}
