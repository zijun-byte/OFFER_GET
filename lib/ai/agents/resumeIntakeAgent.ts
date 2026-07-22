import type {
  ResumeBasics,
  ResumeData,
  ResumeEducation,
  ResumeExperience,
  ResumeSkill,
} from '../../../app/online-editor/resumePreviewData';
import { runJsonAgent } from '../agentRuntime';

export type GuidedStepId = 'targetRole' | 'basics' | 'education' | 'experience' | 'project' | 'skills';

type IntakePatch = {
  targetRole?: string;
  basics?: Partial<ResumeBasics>;
  education?: Partial<ResumeEducation>;
  // Singular keys remain supported for previously saved Prompt versions.
  experience?: Partial<ResumeExperience>;
  experiences?: Array<Partial<ResumeExperience>>;
  project?: Partial<ResumeExperience>;
  projects?: Array<Partial<ResumeExperience>>;
  skills?: Array<{ title: string; details?: string[] }>;
};

type IntakeOutput = {
  patch?: IntakePatch;
  nextQuestion?: string;
};

export async function runResumeIntakeAgent({
  answer,
  currentResumeData,
  nextStep,
  stepId,
}: {
  answer: string;
  currentResumeData: ResumeData;
  nextStep: GuidedStepId | null;
  stepId: GuidedStepId;
}) {
  let patch: IntakePatch = {};
  let nextQuestion = fallbackQuestion(nextStep, currentResumeData);
  let mode: 'ai' | 'local-fallback' = 'local-fallback';

  // A negative answer is a valid answer to an optional step, never resume content.
  if (!isNegativeAnswer(answer)) {
    try {
      const result = await runJsonAgent<
        { answer: string; currentResumeData: ResumeData; nextStep: GuidedStepId | null; stepId: GuidedStepId },
        IntakeOutput
      >({
        agentId: 'resume-intake',
        task: 'parse_guided_resume_answer_and_ask_next_question',
        input: { answer, currentResumeData, nextStep, stepId },
      });

      patch = normalizeIntakePatch(stepId, result.output.patch || {}, answer);
      nextQuestion = result.output.nextQuestion?.trim() || nextQuestion;
      if (hasUsefulPatch(stepId, patch)) {
        mode = 'ai';
      } else {
        patch = createLocalPatch(stepId, answer);
      }
    } catch {
      patch = createLocalPatch(stepId, answer);
    }
  }

  return {
    mode,
    nextQuestion,
    resumeData: mergePatch(currentResumeData, stepId, patch, answer),
  };
}

function mergePatch(data: ResumeData, stepId: GuidedStepId, patch: IntakePatch, answer: string): ResumeData {
  if (stepId === 'targetRole') {
    return {
      ...data,
      basics: { ...data.basics, targetRole: clean(patch.targetRole) || answer.trim() },
    };
  }

  if (stepId === 'basics') {
    return {
      ...data,
      basics: {
        ...data.basics,
        name: clean(patch.basics?.name) || data.basics.name,
        city: clean(patch.basics?.city) || data.basics.city,
        phone: clean(patch.basics?.phone) || data.basics.phone,
        email: clean(patch.basics?.email) || data.basics.email,
        portfolio: clean(patch.basics?.portfolio) || data.basics.portfolio,
      },
    };
  }

  if (stepId === 'education') {
    const item = patch.education || {};
    if (!hasText(item)) return data;
    return {
      ...data,
      education: [
        {
          id: clean(item.id) || `edu-intake-${Date.now()}`,
          school: clean(item.school),
          major: clean(item.major),
          degree: clean(item.degree),
          startDate: clean(item.startDate),
          endDate: clean(item.endDate),
          highlights: stringArray(item.highlights),
        },
        ...data.education,
      ],
    };
  }

  if (stepId === 'experience' || stepId === 'project') {
    if (isNegativeAnswer(answer)) return data;
    const items = stepId === 'experience'
      ? toEntries(patch.experiences, patch.experience)
      : toEntries(patch.projects, patch.project);
    const entries = items.map((item, index) => toResumeEntry(item, stepId, index)).filter(hasResumeEntryContent);
    if (entries.length === 0) return data;

    return stepId === 'experience'
      ? { ...data, experiences: [...entries, ...data.experiences] }
      : { ...data, projects: [...entries, ...data.projects] };
  }

  if (isNegativeAnswer(answer)) return data;
  const skills: ResumeSkill[] = (patch.skills || []).map((skill, index) => ({
    id: `skill-intake-${Date.now()}-${index}`,
    title: clean(skill.title),
    details: stringArray(skill.details),
    source: 'confirmed' as const,
  })).filter((skill) => skill.title && !isNegativeAnswer(skill.title));

  return { ...data, skills: [...data.skills, ...skills] };
}

function toEntries(multiple: Array<Partial<ResumeExperience>> | undefined, single: Partial<ResumeExperience> | undefined) {
  return Array.isArray(multiple) && multiple.length > 0 ? multiple : single ? [single] : [];
}

function normalizeIntakePatch(stepId: GuidedStepId, patch: IntakePatch, answer: string): IntakePatch {
  if (stepId !== 'experience') return patch;

  const entries = toEntries(patch.experiences, patch.experience);
  if (entries.length === 0) return patch;

  const facts = extractExplicitExperienceFacts(answer);
  const normalizedEntries = entries.map((entry, index) => {
    // Only correct fields with information the user explicitly supplied.
    const fact = facts[index] || (facts.length === 1 ? facts[0] : undefined);
    const organization = clean(entry.organization);
    const role = cleanRole(entry.role);

    return {
      ...entry,
      organization: fact?.organization && !isReliableOrganization(organization) ? fact.organization : organization,
      role: fact?.role && (!role || role !== clean(entry.role)) ? fact.role : role,
    };
  });

  return { ...patch, experiences: normalizedEntries, experience: undefined };
}

function extractExplicitExperienceFacts(answer: string) {
  const facts: Array<{ organization: string; role: string }> = [];
  const organizationPattern = /在[ \t]*([^，。；;\n]{2,30}?)(?=(?:上过班|工作过|工作|任职|实习|就职|入职|担任))/g;
  let match: RegExpExecArray | null;

  while ((match = organizationPattern.exec(answer)) !== null) {
    const organization = clean(match[1]);
    const nearbyText = answer.slice(match.index, Math.min(answer.length, match.index + 100));
    const role = cleanRole(
      nearbyText.match(/(?:担任(?:的是)?|作为|职位是|任职为)[ \t]*([^，。；;\n]{2,30})/)?.[1] || '',
    );
    if (isReliableOrganization(organization)) facts.push({ organization, role });
  }

  return facts;
}

function isReliableOrganization(value: string) {
  return value.length >= 2
    && value.length <= 30
    && !/(公司中|更多|担任|负责|工作内容|实习生|职位|岗位|的是)/.test(value);
}

function cleanRole(value: unknown) {
  return clean(value).replace(/^(?:担任(?:的是)?|作为|职位是|任职为|的是)[ \t]*/, '').trim();
}
function toResumeEntry(item: Partial<ResumeExperience>, stepId: 'experience' | 'project', index: number): ResumeExperience {
  return {
    id: clean(item.id) || `${stepId}-intake-${Date.now()}-${index}`,
    organization: clean(item.organization),
    role: clean(item.role),
    type: stepId === 'experience' ? item.type || 'internship' : 'project',
    startDate: clean(item.startDate),
    endDate: clean(item.endDate),
    description: clean(item.description),
    bullets: stringArray(item.bullets).filter((bullet) => !isNegativeAnswer(bullet)),
  };
}

function hasResumeEntryContent(entry: ResumeExperience) {
  return Boolean(entry.organization || entry.role || entry.description || entry.bullets.length > 0);
}

function createLocalPatch(stepId: GuidedStepId, answer: string): IntakePatch {
  const phrases = splitPhrases(answer);
  const email = answer.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  const phone = answer.match(/1[3-9]\d{9}/)?.[0] || '';

  if (isNegativeAnswer(answer)) return {};
  if (stepId === 'targetRole') return { targetRole: answer.trim() };
  if (stepId === 'basics') {
    const name = answer.match(/(?:我叫|我是|姓名\s*[:：]?)\s*([\u4e00-\u9fa5·]{2,8})/)?.[1] || '';
    const city = answer.match(/北京|上海|广州|深圳|杭州|成都|武汉|南京|苏州|西安/)?.[0] || '';
    return { basics: { name: name || phrases[0] || '', city, phone, email } };
  }
  if (stepId === 'education') {
    const school = answer.match(/([\u4e00-\u9fa5]{2,20}(?:大学|学院|学校))/)?.[1] || phrases[0] || '';
    const degree = answer.match(/本科|硕士|专科|博士/)?.[0] || '';
    const dates = [...answer.matchAll(/(?:19|20)\d{2}/g)].map((match) => match[0]);
    return {
      education: {
        school,
        major: phrases.find((phrase) => phrase !== school && phrase !== degree) || '',
        degree,
        startDate: dates[0] || '',
        endDate: dates[1] || '',
        highlights: phrases,
      },
    };
  }
  if (stepId === 'experience') return { experiences: extractLocalExperiences(answer) };
  if (stepId === 'project') return { projects: [{ organization: phrases[0] || '', description: answer, bullets: phrases }] };
  return { skills: phrases.map((title) => ({ title, details: [] })) };
}

function extractLocalExperiences(answer: string): Array<Partial<ResumeExperience>> {
  const blocks = answer
    .split(/(?=(?:我(?:之前|还)?在|同时我还在|另外我在|之后我在))/)
    .map((block) => block.trim())
    .filter(Boolean);
  const sourceBlocks = blocks.length > 1 ? blocks : [answer];

  return sourceBlocks.map((block) => {
    const organization = block.match(/在([^，。；;\n]{2,24}?)(?:上过班|工作|任职|实习|当过|担任|入职|就职)/)?.[1]?.trim() || '';
    const role = block.match(/(?:担任(?:的是)?|作为|当过)([^，。；;\n]{2,24})/)?.[1]?.trim() || '';
    const dates = [...block.matchAll(/(?:19|20)\d{2}/g)].map((match) => match[0]);
    const phrases = splitPhrases(block);
    return {
      organization,
      role,
      startDate: dates[0] || '',
      endDate: dates[1] || '',
      description: '',
      bullets: phrases.filter((phrase) => phrase !== organization && phrase !== role),
    };
  });
}

function hasUsefulPatch(stepId: GuidedStepId, patch: IntakePatch) {
  if (stepId === 'targetRole') return Boolean(clean(patch.targetRole));
  if (stepId === 'basics') return hasText(patch.basics);
  if (stepId === 'education') return hasText(patch.education);
  if (stepId === 'experience') return patch.experiences?.some(hasText) || hasText(patch.experience) || false;
  if (stepId === 'project') return patch.projects?.some(hasText) || hasText(patch.project) || false;
  return Boolean(patch.skills?.some((skill) => clean(skill.title)));
}

function hasText(value: unknown) {
  if (!value || typeof value !== 'object') return false;
  return Object.values(value).some((item) => {
    if (typeof item === 'string') return Boolean(item.trim());
    return Array.isArray(item) && item.some((entry) => typeof entry === 'string' && entry.trim());
  });
}

function isNegativeAnswer(value: string) {
  const normalized = value.replace(/\s/g, '').replace(/[。！!，,]/g, '');
  return /^(没有|没|无|暂无|暂时没有|没做过|没参加过|没有相关|不需要|跳过)(项目|实习|工作|经历|技能|证书|内容)?$/.test(normalized);
}

function fallbackQuestion(nextStep: GuidedStepId | null, data: ResumeData) {
  if (!nextStep) return '';
  const role = data.basics.targetRole ? `针对${data.basics.targetRole}，` : '';
  const prompts: Record<GuidedStepId, string> = {
    targetRole: '你这次准备投递什么岗位或方向？',
    basics: '请告诉我你的姓名、所在城市、手机号和邮箱。没有的信息可以暂时不填。',
    education: '请补充学校、专业、学历、就读时间，以及值得写入简历的课程或成绩。',
    experience: `${role}请介绍一段或多段实习、工作或组织经历；每段说清公司、角色、时间和职责。`,
    project: `${role}请介绍一个最能体现能力的项目、比赛、课程作业或社团活动；没有可以直接跳过。`,
    skills: `${role}请列出你明确掌握的技能、工具、证书或语言能力。`,
  };
  return prompts[nextStep];
}

function splitPhrases(value: string) {
  return value.split(/[,，。；;\n、]/).map((item) => item.trim()).filter(Boolean).slice(0, 12);
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean) : [];
}