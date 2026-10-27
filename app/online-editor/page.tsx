'use client';

import { useEffect, useRef, useState } from 'react';
import SiteShell, { shellStyles } from '../components/SiteShell';
import EditorSidePanel from './EditorSidePanel';
import styles from './OnlineEditorPage.module.css';
import {
  blankResumeData,
  createResumeDataFromExtractionDraft,
  defaultResumeData,
  type ResumeData,
  type ResumeEditorSection,
  type ResumeExtractionDraft,
  type ResumeSkill,
  type ResumeVisibleSections,
} from './resumePreviewData';
import ResumePreview from './ResumePreview';
import { templates } from '../template-library/templates';
import ResumeAssistant from './ResumeAssistant';
import MobileResumeWorkspace, { MobileSheet } from './MobileResumeWorkspace';
import mobileStyles from './MobileResume.module.css';
import { isResumeData } from '../../lib/resumeEdits';

const STORAGE_TEMPLATE_KEY = 'offerGetSelectedTemplate';
const STORAGE_RESUME_KEY = 'offerGetResumeInput';
const STORAGE_RESUME_DRAFT_KEY = 'offerGetResumeDraft';

type WorkflowPhase = 'intake' | 'editor';
type IntakeMode = 'guided' | 'paste';

type GuidedStepId = 'targetRole' | 'basics' | 'portfolio' | 'education' | 'experience' | 'project' | 'skills';

type GuidedStep = {
  id: GuidedStepId;
  required?: boolean;
  title: string;
  prompt: string;
  placeholder: string;
};

type ChatMessage = {
  id: string;
  role: 'agent' | 'user';
  content: string;
};

const guidedSteps: GuidedStep[] = [
  {
    id: 'targetRole',
    required: true,
    title: '目标岗位',
    prompt: '你这次想投递什么岗位？可以写岗位、方向或行业。',
    placeholder: '例如：AIGC 产品经理、产品运营实习生',
  },
  {
    id: 'basics',
    required: true,
    title: '基础信息',
    prompt: '请告诉我你的姓名、所在城市、手机号和邮箱。作品集链接会在下一题单独填写。',
    placeholder: '例如：林若曦，上海，13800000000，lin@example.com',
  },
  {
    id: 'portfolio',
    title: '作品集链接',
    prompt: '你有个人作品集链接吗？可以粘贴在这里，没有可以跳过。',
    placeholder: 'https://…（没有可跳过）',
  },
  {
    id: 'education',
    required: true,
    title: '教育背景',
    prompt: '请写学校、专业、学历，以及课程、成绩或校园亮点。',
    placeholder: '例如：华东理工大学，市场营销，本科，主修消费者行为、品牌传播',
  },
  {
    id: 'experience',
    required: true,
    title: '实习/工作经历',
    prompt: '如果有实习、兼职或组织经历，请描述你做了什么；没有可以回答“暂无”。',
    placeholder: '例如：在某互联网公司负责活动策划、用户沟通和数据复盘',
  },
  {
    id: 'project',
    required: true,
    title: '项目经历',
    prompt: '请写一个最能代表能力的项目、比赛、课程作业或社团活动。',
    placeholder: '例如：校园新媒体栏目增长项目，负责选题策划和互动分析',
  },
  {
    id: 'skills',
    required: true,
    title: '技能亮点',
    prompt: '请写你掌握的技能、工具、证书或语言能力。',
    placeholder: '例如：AI 生图、视频生成、Excel、数据分析、英语六级',
  },
];

export default function OnlineEditorPage() {
  const [leftView, setLeftView] = useState<'experience' | 'template'>('experience');
  const webTemplates = templates.filter((template) => template.outputType === 'web');
  const [selectedTemplate, setSelectedTemplate] = useState('fresh-single-column');
  const [resumeData, setResumeData] = useState<ResumeData>(() => blankResumeData);
  const [activeSection, setActiveSection] = useState<ResumeEditorSection | null>('basics');
  const [visibleSections, setVisibleSections] = useState<ResumeVisibleSections>({
    experiences: true,
    projects: true,
    skills: true,
  });
  const [workflowPhase, setWorkflowPhase] = useState<WorkflowPhase>('intake');
  const [intakeMode, setIntakeMode] = useState<IntakeMode>('guided');
  const [guidedStepIndex, setGuidedStepIndex] = useState(0);
  const [guidedAnswer, setGuidedAnswer] = useState('');
  const [intakeError, setIntakeError] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'agent-start',
      role: 'agent',
      content: guidedSteps[0].prompt,
    },
  ]);
  const [pastedResume, setPastedResume] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isSubmittingGuided, setIsSubmittingGuided] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSheet, setMobileSheet] = useState<'template' | 'edit' | null>(null);
  const submissionLock = useRef(false);
  const currentResume = useRef(resumeData);
  currentResume.current = resumeData;

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const sync = () => setIsMobile(media.matches);
    sync(); media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let template = params.get('template') || 'fresh-single-column';
    try {
      template = params.get('template') || localStorage.getItem(STORAGE_TEMPLATE_KEY) || template;
    } catch { /* The URL remains usable when storage is blocked. */ }
    setSelectedTemplate(template);
    try {
      localStorage.setItem(STORAGE_TEMPLATE_KEY, template);
      const storedInput = localStorage.getItem(STORAGE_RESUME_DRAFT_KEY) || localStorage.getItem(STORAGE_RESUME_KEY) || '';
      if (storedInput) setPastedResume(storedInput);
      const saved = JSON.parse(localStorage.getItem('offerGetEditorState') || 'null');
      if (isResumeData(saved?.resumeData)) {
        setResumeData(saved.resumeData);
        setVisibleSections(saved.visibleSections || { experiences: true, projects: true, skills: true });
        setWorkflowPhase(saved.workflowPhase === 'editor' ? 'editor' : 'intake');
        const restoredIndex = typeof saved.guidedStepId === 'string'
          ? guidedSteps.findIndex((step) => step.id === saved.guidedStepId)
          : saved.guidedStepIndex >= 2 ? saved.guidedStepIndex + 1 : saved.guidedStepIndex;
        if (Number.isInteger(restoredIndex) && restoredIndex >= 0 && restoredIndex < guidedSteps.length) setGuidedStepIndex(restoredIndex);
        if (typeof saved.guidedAnswer === 'string') setGuidedAnswer(saved.guidedAnswer);
        if (Array.isArray(saved.chatMessages) && saved.chatMessages.length && saved.chatMessages.every((item: ChatMessage) => typeof item.id === 'string' && typeof item.content === 'string' && ['user', 'agent'].includes(item.role))) setChatMessages(saved.chatMessages);
      }
    } catch { setSaveStatus('草稿读取失败，可以重新填写'); }
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    const save = () => {
      try {
        localStorage.setItem('offerGetEditorState', JSON.stringify({ resumeData, visibleSections, workflowPhase, guidedStepIndex, guidedStepId: guidedSteps[guidedStepIndex].id, guidedAnswer, chatMessages }));
        setSaveStatus('已自动保存');
      } catch { setSaveStatus('无法保存草稿，请先导出简历'); }
    };
    setSaveStatus('尚未保存…');
    const timer = setTimeout(save, 400);
    window.addEventListener('pagehide', save);
    return () => { clearTimeout(timer); window.removeEventListener('pagehide', save); };
  }, [draftReady, resumeData, visibleSections, workflowPhase, guidedStepIndex, guidedAnswer, chatMessages]);

  function changeTemplate(id: string) {
    setSelectedTemplate(id);
    try { localStorage.setItem(STORAGE_TEMPLATE_KEY, id); } catch { setSaveStatus('模板已切换，无法保存到浏览器'); }
    const url = new URL(window.location.href);
    url.searchParams.set('template', id);
    window.history.replaceState(null, '', url);
  }

  async function submitGuidedAnswer(skip = false) {
    if (submissionLock.current) return;
    const currentStep = guidedSteps[guidedStepIndex];
    const answer = skip ? '' : guidedAnswer.trim();

    if (currentStep.required && !answer) {
      setIntakeError(`${currentStep.title}是必要信息，请填写后再继续。`);
      return;
    }

    setIntakeError('');
    submissionLock.current = true;
    const snapshot = JSON.stringify(resumeData);
    const nextStep = guidedStepIndex + 1;
    const nextStepId = nextStep < guidedSteps.length ? guidedSteps[nextStep].id : null;
    let nextQuestion = nextStep < guidedSteps.length ? guidedSteps[nextStep].prompt : '';

    if (answer) {
      setChatMessages((messages) => [
        ...messages.filter((message) => !message.id.startsWith(`user-${currentStep.id}-`)),
        { id: `user-${currentStep.id}-${Date.now()}`, role: 'user', content: answer },
      ]);
      setIsSubmittingGuided(true);

      try {
        const response = await fetch('/api/resume/intake', {
          signal: AbortSignal.timeout(75000),
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            answer,
            nextStep: nextStepId,
            resumeData,
            stepId: currentStep.id,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to parse guided answer.');
        }

        const payload = (await response.json()) as {
          nextQuestion?: string;
          resumeData: ResumeData;
        };
        if (JSON.stringify(currentResume.current) !== snapshot || !isResumeData(payload.resumeData)) throw new Error('stale');
        setResumeData(payload.resumeData);
        nextQuestion = payload.nextQuestion?.trim() || nextQuestion;
      } catch {
        setIntakeError('本次回答未写入，请检查网络后重试。输入已保留。');
        return;
      } finally {
        setIsSubmittingGuided(false);
        submissionLock.current = false;
      }
    } else {
      submissionLock.current = false;
      setChatMessages((messages) => [
        ...messages,
        { id: `user-${currentStep.id}-${Date.now()}`, role: 'user', content: '暂时跳过' },
      ]);
    }

    setGuidedAnswer('');

    if (nextStep >= guidedSteps.length) {
      setChatMessages((messages) => [
        ...messages,
        {
          id: `agent-complete-${Date.now()}`,
          role: 'agent',
          content: '基础信息已经写入简历。现在进入编辑器，你可以继续点击模块调整内容。',
        },
      ]);
      setActiveSection('basics');
      setWorkflowPhase('editor');
      return;
    }

    setGuidedStepIndex(nextStep);
    setChatMessages((messages) => [
      ...messages,
      { id: `agent-${guidedSteps[nextStep].id}`, role: 'agent', content: nextQuestion },
    ]);
  }

  async function startFromPaste() {
    const text = pastedResume.trim();
    if (!text) {
      setIntakeError('先把旧简历或经历文字粘贴到上面的输入框。');
      return;
    }

    setIsExtracting(true);
    setIntakeError('');

    try {
      const response = await fetch('/api/resume/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Failed to extract resume draft.');
      }

      const extractionDraft = (await response.json()) as ResumeExtractionDraft;
      const nextData = createResumeDataFromExtractionDraft(extractionDraft);
      setResumeData(nextData);
      setActiveSection('basics');
      setWorkflowPhase('editor');
    } catch {
      setIntakeError('没能识别这段内容。检查网络后再试一次，或改用逐步问答。');
    } finally {
      setIsExtracting(false);
    }
  }

  const assistant = <ResumeAssistant resumeData={resumeData} setResumeData={setResumeData} onImported={() => { setWorkflowPhase('editor'); setIntakeError(''); }}
    onMessage={(role, content) => setChatMessages((messages) => [...messages, { id: `edit-${Date.now()}-${Math.random().toString(36).slice(2)}`, role, content }])}
    paste={!isMobile && intakeMode === 'paste' && workflowPhase === 'intake'}
    tools={isMobile ? <button type="button" className={mobileStyles.toolButton} aria-pressed={mobileSheet === 'template'} onClick={() => setMobileSheet('template')}>模板</button> : undefined}
    guided={workflowPhase === 'intake' ? { value: guidedAnswer, onChange: setGuidedAnswer, onSubmit: () => submitGuidedAnswer(false), onSkip: () => submitGuidedAnswer(true), busy: isSubmittingGuided, placeholder: guidedSteps[guidedStepIndex].placeholder, required: !!guidedSteps[guidedStepIndex].required } : undefined} />;

  if (isMobile) return <>
    <MobileResumeWorkspace messages={chatMessages} complete={workflowPhase === 'editor'} busy={isSubmittingGuided} error={intakeError} saveStatus={saveStatus} step={guidedStepIndex} totalSteps={guidedSteps.length} composer={assistant}
      preview={<ResumePreview activeSection={activeSection} onSelectSection={(section) => { if (section) { setActiveSection(section); setMobileSheet('edit'); } }} selectedTemplate={selectedTemplate} resumeData={resumeData} visibleSections={visibleSections} />} />
    {mobileSheet && <MobileSheet label={mobileSheet === 'template' ? '选择模板' : '编辑简历模块'} onClose={() => setMobileSheet(null)}>
        {mobileSheet === 'template' ? <div className={mobileStyles.templateOptions}>{webTemplates.map((template) => <button key={template.id} type="button" aria-pressed={selectedTemplate === template.id} onClick={() => { changeTemplate(template.id); setMobileSheet(null); }}><img src={template.image} alt="" />{template.title}</button>)}</div> : <EditorSidePanel fieldsOnly activeSection={activeSection} setActiveSection={setActiveSection} resumeData={resumeData} setResumeData={setResumeData} visibleSections={visibleSections} setVisibleSections={setVisibleSections} />}
    </MobileSheet>}
  </>;

  return (
    <SiteShell active="resume" wide>
      <div className={styles.editorToolbar}>
        {workflowPhase !== 'intake' && (
          <div className={styles.toolbarTitle}>
            <strong>编辑简历</strong>
            <span role="status">{saveStatus}</span>
          </div>
        )}
        <button
          className={styles.exportButton}
          disabled={workflowPhase === 'intake'}
          onClick={() => window.print()}
          title={workflowPhase === 'intake' ? '进入编辑后才能导出' : undefined}
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14" />
          </svg>
          导出 PDF
        </button>
      </div>
      <div className={styles.editorStage}>
        <div className={styles.workspaceLeft}>
          <div className={styles.viewSwitch} role="group" aria-label="左侧工具切换">
            <button type="button" className={styles.redOrb} aria-label="说说经历" title="说说经历" aria-pressed={leftView === 'experience'} onClick={() => setLeftView('experience')} />
            <button type="button" className={styles.blueOrb} aria-label="模板选择" title="模板选择" aria-pressed={leftView === 'template'} onClick={() => setLeftView('template')} />
          </div>
          <div className={styles.experienceView} hidden={leftView !== 'experience'}>
        {workflowPhase === 'intake' ? (
          <>
            <IntakePanel
              assistant={assistant}
              chatMessages={chatMessages}
              currentStep={guidedSteps[guidedStepIndex]}
              guidedAnswer={guidedAnswer}
              guidedStepIndex={guidedStepIndex}
              intakeError={intakeError}
              intakeMode={intakeMode}
              pastedResume={pastedResume}
              setGuidedAnswer={setGuidedAnswer}
              setIntakeMode={setIntakeMode}
              setPastedResume={setPastedResume}
              submitGuidedAnswer={submitGuidedAnswer}
              startFromPaste={startFromPaste}
              isExtracting={isExtracting}
              isSubmittingGuided={isSubmittingGuided}
            />
          </>
        ) : (
          <>
            <EditorSidePanel
              assistant={assistant}
              activeSection={activeSection}
              resumeData={resumeData}
              setActiveSection={setActiveSection}
              setResumeData={setResumeData}
              setVisibleSections={setVisibleSections}
              visibleSections={visibleSections}
            />
          </>
        )}
          </div>
        <aside className={styles.templatePicker} hidden={leftView !== 'template'} aria-labelledby="template-picker-title">
          <h2 id="template-picker-title">换个版式</h2>
          <p>已填写的内容会保留</p>
          <div className={styles.templateList}>
            {webTemplates.filter((template) => template.id === selectedTemplate).map((template) => {
              const isSelected = selectedTemplate === template.id;
              return (
                <button
                  aria-pressed={isSelected}
                  className={isSelected ? styles.templateSelected : ''}
                  key={template.id}
                  onClick={() => changeTemplate(template.id)}
                  type="button"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={template.image} alt="" />
                  <span>
                    <strong>{template.title}</strong>
                    <small>{isSelected ? '正在使用' : template.note}</small>
                  </span>
                </button>
              );
            })}
          </div>
          <div className={styles.templateArrows}>
            <button type="button" aria-label="上一个模板" onClick={() => changeTemplate(webTemplates[(webTemplates.findIndex((item) => item.id === selectedTemplate) - 1 + webTemplates.length) % webTemplates.length].id)}>←</button>
            <span>{webTemplates.findIndex((item) => item.id === selectedTemplate) + 1} / {webTemplates.length}</span>
            <button type="button" aria-label="下一个模板" onClick={() => changeTemplate(webTemplates[(webTemplates.findIndex((item) => item.id === selectedTemplate) + 1) % webTemplates.length].id)}>→</button>
          </div>
        </aside>
        </div>
        <ResumePreview activeSection={workflowPhase === 'intake' ? null : activeSection} onSelectSection={setActiveSection} selectedTemplate={selectedTemplate} resumeData={resumeData} visibleSections={visibleSections} />
      </div>
    </SiteShell>
  );
}

function IntakePanel({
  assistant,
  chatMessages,
  currentStep,
  guidedAnswer,
  guidedStepIndex,
  intakeError,
  intakeMode,
  pastedResume,
  setGuidedAnswer,
  setIntakeMode,
  setPastedResume,
  submitGuidedAnswer,
  startFromPaste,
  isExtracting,
  isSubmittingGuided,
}: {
  assistant: React.ReactNode;
  chatMessages: ChatMessage[];
  currentStep: GuidedStep;
  guidedAnswer: string;
  guidedStepIndex: number;
  intakeError: string;
  intakeMode: IntakeMode;
  pastedResume: string;
  setGuidedAnswer: (value: string) => void;
  setIntakeMode: (mode: IntakeMode) => void;
  setPastedResume: (value: string) => void;
  submitGuidedAnswer: (skip?: boolean) => void;
  startFromPaste: () => void;
  isExtracting: boolean;
  isSubmittingGuided: boolean;
}) {
  return (
    <aside className={`${styles.sidePanel} ${styles.intakePanel}`} aria-label="简历信息采集">

      <div className={styles.intakeTabs} role="group" aria-label="开始方式">
        <button
          aria-pressed={intakeMode === 'guided'}
          className={`${styles.intakeTab} ${intakeMode === 'guided' ? styles.intakeTabActive : ''}`}
          onClick={() => setIntakeMode('guided')}
          type="button"
        >
          逐步问答
        </button>
        <button
          aria-pressed={intakeMode === 'paste'}
          className={`${styles.intakeTab} ${intakeMode === 'paste' ? styles.intakeTabActive : ''}`}
          onClick={() => setIntakeMode('paste')}
          type="button"
        >
          粘贴简历
        </button>
      </div>

      {intakeMode === 'guided' ? (
        <section className={styles.chatIntake} aria-label="逐步问答">
          {intakeError ? <p className={styles.intakeError} role="alert">{intakeError}</p> : null}
          <div className={styles.chatMessages} aria-live="polite">
            {chatMessages.map((message, messageIndex) => (
              <div className={message.role === 'user' ? styles.userMessage : styles.questionMessage} key={message.id}>
                <div className={`${styles.chatBubble} ${message.role === 'user' ? styles.chatBubbleUser : ''}`}>{message.content}</div>
                {message.role === 'agent' && (
                  <div className={styles.progressTrack} role="progressbar" aria-label="问答进度" aria-valuemin={1} aria-valuemax={guidedSteps.length} aria-valuenow={Math.min(guidedSteps.length, chatMessages.slice(0, messageIndex + 1).filter((item) => item.role === 'agent').length)}>
                    {guidedSteps.map((step, index) => {
                      const questionIndex = chatMessages.slice(0, messageIndex + 1).filter((item) => item.role === 'agent').length - 1;
                      return <span key={step.id} className={index < questionIndex ? styles.progressDone : index === questionIndex ? styles.progressNow : ''} />;
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
          {assistant}
        </section>
      ) : (
        <section className={styles.intakeFields} aria-label="粘贴旧简历">{assistant}</section>
      )}
    </aside>
  );
}

function applyGuidedAnswer(data: ResumeData, stepId: GuidedStepId, answer: string): ResumeData {
  if ((stepId === 'experience' || stepId === 'project' || stepId === 'skills') && isNegativeOptionalAnswer(answer)) {
    return data;
  }
  if (stepId === 'targetRole') {
    return {
      ...data,
      basics: {
        ...data.basics,
        targetRole: answer,
      },
    };
  }

  if (stepId === 'basics') {
    return {
      ...data,
      basics: {
        ...data.basics,
        ...extractBasics(answer),
      },
    };
  }

  if (stepId === 'education') {
    const phrases = splitPhrases(answer);
    return {
      ...data,
      education: [
        {
          ...defaultResumeData.education[0],
          school: phrases[0] || defaultResumeData.education[0].school,
          major: phrases[1] || defaultResumeData.education[0].major,
          highlights: phrases,
        },
      ],
    };
  }

  if (stepId === 'experience') {
    return {
      ...data,
      experiences: [...createFallbackExperiences(answer), ...data.experiences],
    };
  }

  if (stepId === 'project') {
    return {
      ...data,
      projects: [
        {
          ...defaultResumeData.projects[0],
          organization: splitPhrases(answer)[0] || '项目经历',
          description: '',
          bullets: splitPhrases(answer),
        },
      ],
    };
  }

  return {
    ...data,
    skills: createSkillsFromText(answer),
  };
}

function createResumeDataFromFreeText(input: string): ResumeData {
  const cleanInput = input.trim();
  if (!cleanInput) return blankResumeData;

  return {
    ...blankResumeData,
    basics: {
      ...blankResumeData.basics,
      summary: cleanInput,
    },
    experiences: [],
    projects: [
      {
        ...defaultResumeData.projects[0],
        description: '',
        bullets: splitPhrases(cleanInput).slice(0, 5),
      },
    ],
    skills: createSkillsFromText(cleanInput),
  };
}

function createFallbackExperiences(answer: string): ResumeData['experiences'] {
  const blocks = answer
    .split(/(?=(?:我(?:之前|还)?在|同时我还在|另外我在|之后我在))/)
    .map((block) => block.trim())
    .filter(Boolean);
  const sourceBlocks = blocks.length > 1 ? blocks : [answer];

  return sourceBlocks.map((block, index) => {
    const phrases = splitPhrases(block);
    const organization = block.match(/在([^，。；;\n]{2,24}?)(?:上过班|工作|任职|实习|当过|担任|入职|就职)/)?.[1]?.trim() || phrases[0] || '实习/工作经历';
    const role = block.match(/(?:担任(?:的是)?|作为|当过)([^，。；;\n]{2,24})/)?.[1]?.trim() || '实习生';
    const dates = [...block.matchAll(/(?:19|20)\d{2}/g)].map((match) => match[0]);
    return {
      ...defaultResumeData.experiences[0],
      id: `experience-fallback-${Date.now()}-${index}`,
      organization,
      role,
      startDate: dates[0] || '',
      endDate: dates[1] || '',
      description: '',
      bullets: phrases.filter((phrase) => phrase !== organization && phrase !== role),
    };
  });
}

function isNegativeOptionalAnswer(value: string) {
  const normalized = value.replace(/\s/g, '').replace(/[。！!，,]/g, '');
  return /^(没有|没|无|暂无|暂时没有|没做过|没参加过|没有相关|不需要|跳过)(项目|实习|工作|经历|技能|证书|内容)?$/.test(normalized);
}
function appendSummary(currentSummary: string, nextLine: string) {
  return [currentSummary, nextLine].filter(Boolean).join('\n');
}

function extractBasics(value: string) {
  const email = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  const phone = value.match(/1[3-9]\d{9}/)?.[0] || '';
  const phrases = splitPhrases(value);
  const nameCandidate = phrases.find((phrase) => !phrase.includes('@') && !/1[3-9]\d{9}/.test(phrase));

  return {
    name: nameCandidate && nameCandidate.length <= 8 ? nameCandidate : '',
    phone,
    email,
    city: phrases.find((phrase) => /北京|上海|广州|深圳|杭州|成都|武汉|南京|苏州|西安/.test(phrase)) || '',
  };
}

function splitPhrases(value: string) {
  return value
    .split(/[，。；;\n、]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function createSkillsFromText(value: string): ResumeSkill[] {
  const rawSkills = splitPhrases(value);
  const matchedSkills = [
    /AI|AIGC|生图|视频生成/i.test(value) ? 'AIGC 内容生成' : '',
    /数据|Excel|SQL/i.test(value) ? '数据分析' : '',
    /Figma|Axure|原型/i.test(value) ? '原型设计' : '',
    /沟通|协同|推进/i.test(value) ? '沟通协作' : '',
  ].filter(Boolean);

  return [...new Set([...rawSkills, ...matchedSkills])]
    .slice(0, 6)
    .map((skill, index) => ({
      id: `skill-intake-${index}`,
      title: skill,
      source: 'confirmed',
      details: ['由用户输入识别，后续可继续编辑确认。'],
    }));
}
