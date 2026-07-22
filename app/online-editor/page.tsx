'use client';

import { useEffect, useState } from 'react';
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

const STORAGE_TEMPLATE_KEY = 'offerGetSelectedTemplate';
const STORAGE_RESUME_KEY = 'offerGetResumeInput';
const STORAGE_RESUME_DRAFT_KEY = 'offerGetResumeDraft';

type WorkflowPhase = 'intake' | 'editor';
type IntakeMode = 'guided' | 'paste';

type GuidedStepId = 'targetRole' | 'basics' | 'education' | 'experience' | 'project' | 'skills';

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
    title: '基础信息',
    prompt: '请补充姓名、城市、手机号、邮箱。有些暂时没有也可以留空。',
    placeholder: '例如：林若曦，上海，13800000000，lin@example.com',
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
    title: '实习/工作经历',
    prompt: '如果有实习、兼职或组织经历，请描述你做了什么；没有可以直接跳过。',
    placeholder: '例如：在某互联网公司负责活动策划、用户沟通和数据复盘',
  },
  {
    id: 'project',
    title: '项目经历',
    prompt: '请写一个最能代表能力的项目、比赛、课程作业或社团活动。',
    placeholder: '例如：校园新媒体栏目增长项目，负责选题策划和互动分析',
  },
  {
    id: 'skills',
    title: '技能亮点',
    prompt: '请写你掌握的技能、工具、证书或语言能力。',
    placeholder: '例如：AI 生图、视频生成、Excel、数据分析、英语六级',
  },
];

export default function OnlineEditorPage() {
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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const template = params.get('template') || localStorage.getItem(STORAGE_TEMPLATE_KEY) || 'fresh-single-column';
    setSelectedTemplate(template);
    localStorage.setItem(STORAGE_TEMPLATE_KEY, template);
    const storedInput = localStorage.getItem(STORAGE_RESUME_DRAFT_KEY) || localStorage.getItem(STORAGE_RESUME_KEY) || '';
    if (storedInput) {
      setPastedResume(storedInput);
    }
  }, []);

  async function submitGuidedAnswer(skip = false) {
    const currentStep = guidedSteps[guidedStepIndex];
    const answer = skip ? '' : guidedAnswer.trim();

    if (currentStep.required && !answer) {
      setIntakeError(`${currentStep.title}是必要信息，请填写后再继续。`);
      return;
    }

    setIntakeError('');
    const nextStep = guidedStepIndex + 1;
    const nextStepId = nextStep < guidedSteps.length ? guidedSteps[nextStep].id : null;
    let nextQuestion = nextStep < guidedSteps.length ? guidedSteps[nextStep].prompt : '';

    if (answer) {
      setChatMessages((messages) => [
        ...messages,
        { id: `user-${currentStep.id}-${Date.now()}`, role: 'user', content: answer },
      ]);
      setIsSubmittingGuided(true);

      try {
        const response = await fetch('/api/resume/intake', {
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
        setResumeData(payload.resumeData);
        nextQuestion = payload.nextQuestion?.trim() || nextQuestion;
      } catch {
        setResumeData((data) => applyGuidedAnswer(data, currentStep.id, answer));
      } finally {
        setIsSubmittingGuided(false);
      }
    } else {
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
      setIntakeError('Please paste resume text first.');
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
      setIntakeError('Resume extraction failed. Please try again.');
    } finally {
      setIsExtracting(false);
    }
  }

  return (
    <SiteShell active="resume" wide>
      <main className={styles.editorStage}>
        {workflowPhase === 'intake' ? (
          <>
            <IntakePanel
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
            <ResumePreview
              activeSection={null}
              onSelectSection={setActiveSection}
              selectedTemplate={selectedTemplate}
              resumeData={resumeData}
              visibleSections={visibleSections}
            />
          </>
        ) : (
          <>
            <EditorSidePanel
              activeSection={activeSection}
              resumeData={resumeData}
              setActiveSection={setActiveSection}
              setResumeData={setResumeData}
              setVisibleSections={setVisibleSections}
              visibleSections={visibleSections}
            />
            <ResumePreview
              activeSection={activeSection}
              onSelectSection={setActiveSection}
              selectedTemplate={selectedTemplate}
              resumeData={resumeData}
              visibleSections={visibleSections}
            />
          </>
        )}
      </main>
    </SiteShell>
  );
}

function IntakePanel({
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
      <span className={styles.sideKicker}>简历构建</span>
      <h1>带我们了解你的信息</h1>
      <p>可以按步骤回答，也可以直接粘贴旧简历。确认后再生成右侧预览和区块编辑器。</p>

      <div className={styles.intakeTabs} aria-label="开始方式">
        <button
          className={`${styles.intakeTab} ${intakeMode === 'guided' ? styles.intakeTabActive : ''}`}
          onClick={() => setIntakeMode('guided')}
          type="button"
        >
          逐步问答
        </button>
        <button
          className={`${styles.intakeTab} ${intakeMode === 'paste' ? styles.intakeTabActive : ''}`}
          onClick={() => setIntakeMode('paste')}
          type="button"
        >
          粘贴简历
        </button>
      </div>

      {intakeMode === 'guided' ? (
        <section className={styles.chatIntake} aria-label="逐步问答">
          <div className={styles.chatProgress}>
            第 {guidedStepIndex + 1} / {guidedSteps.length} 步 · {currentStep.title}
          </div>
          {intakeError ? <p className={styles.intakeError}>{intakeError}</p> : null}
          <div className={styles.chatMessages}>
            {chatMessages.map((message) => (
              <div className={`${styles.chatBubble} ${message.role === 'user' ? styles.chatBubbleUser : ''}`} key={message.id}>
                {message.content}
              </div>
            ))}
          </div>
          <textarea
            className={styles.chatInput}
            onChange={(event) => setGuidedAnswer(event.target.value)}
            placeholder={currentStep.placeholder}
            value={guidedAnswer}
          />
          <div className={styles.chatActions}>
            <button className={shellStyles.ghostButton} disabled={isSubmittingGuided} onClick={() => submitGuidedAnswer(true)} type="button">
              跳过
            </button>
            <button className={shellStyles.button} disabled={isSubmittingGuided} onClick={() => submitGuidedAnswer(false)} type="button">
              {isSubmittingGuided ? 'AI 识别中...' : '提交回答'}
            </button>
          </div>
        </section>
      ) : (
        <section className={styles.intakeFields} aria-label="粘贴旧简历">
          <label className={styles.intakeLabel}>
            <span>旧简历/自述材料</span>
            <textarea
              className={styles.intakeTextarea}
              onChange={(event) => setPastedResume(event.target.value)}
              placeholder="粘贴旧简历、项目经历、自我介绍或任意求职材料。系统会先抽取骨架，后续再由 Agent 补全。"
              value={pastedResume}
            />
          </label>
          {intakeError ? <p className={styles.intakeError}>{intakeError}</p> : null}
          <button className={shellStyles.button} disabled={isExtracting} onClick={startFromPaste} type="button">
            {isExtracting ? 'Extracting...' : '识别并进入编辑器'}
          </button>
        </section>
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
        summary: appendSummary(data.basics.summary, answer),
      },
    };
  }

  if (stepId === 'basics') {
    return {
      ...data,
      basics: {
        ...data.basics,
        ...extractBasics(answer),
        summary: appendSummary(data.basics.summary, answer),
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
