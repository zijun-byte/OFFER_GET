export type ResumeBasics = {
  name: string;
  targetRole: string;
  city: string;
  phone: string;
  email: string;
  portfolio?: string;
  summary: string;
};

export type ResumeEducation = {
  id: string;
  school: string;
  major: string;
  degree: string;
  startDate: string;
  endDate: string;
  highlights: string[];
};

export type ResumeExperience = {
  id: string;
  organization: string;
  role: string;
  type: 'internship' | 'project' | 'work' | 'campus';
  startDate: string;
  endDate: string;
  description?: string;
  bullets: string[];
};

export type ResumeSkill = {
  id: string;
  title: string;
  details: string[];
  source: 'confirmed' | 'recommended' | 'draft';
};

export type ResumeData = {
  basics: ResumeBasics;
  education: ResumeEducation[];
  experiences: ResumeExperience[];
  projects: ResumeExperience[];
  skills: ResumeSkill[];
};

export type ResumeEditorSection = 'basics' | 'education' | 'experiences' | 'projects' | 'skills';

export type ResumeVisibleSections = {
  experiences: boolean;
  projects: boolean;
  skills: boolean;
};

export type ResumeExtractionDraft = {
  basics?: Partial<ResumeBasics> & {
    confidence?: number;
    missingFields?: string[];
    sourceText?: string;
  };
  education: Array<Partial<ResumeEducation> & {
    confidence?: number;
    missingFields?: string[];
    sourceText?: string;
  }>;
  experiences: Array<Partial<ResumeExperience> & {
    confidence?: number;
    missingFields?: string[];
    sourceText?: string;
  }>;
  projects: Array<Partial<ResumeExperience> & {
    confidence?: number;
    missingFields?: string[];
    sourceText?: string;
  }>;
  skills: Array<{
    confidence?: number;
    sourceText?: string;
    title: string;
  }>;
  sourceText: string;
};

export const blankResumeData: ResumeData = {
  basics: {
    name: '',
    targetRole: '',
    city: '',
    phone: '',
    email: '',
    portfolio: '',
    summary: '',
  },
  education: [],
  experiences: [],
  projects: [],
  skills: [],
};

export const defaultResumeData: ResumeData = {
  basics: {
    name: '林若曦',
    targetRole: '产品运营实习生',
    city: '上海',
    phone: '138 0000 0000',
    email: 'linruoxi@email.com',
    portfolio: '小红书 / 作品集链接',
    summary: '对增长、内容运营和用户洞察有持续兴趣，擅长把零散经历整理成清晰表达，适合校招与实习投递场景。',
  },
  education: [
    {
      id: 'edu-1',
      school: '华东理工大学',
      major: '市场营销',
      degree: '本科',
      startDate: '2023',
      endDate: '2027',
      highlights: ['GPA 3.7 / 4.0', '主修消费者行为、品牌传播、数据分析'],
    },
  ],
  experiences: [
    {
      id: 'exp-1',
      organization: '某互联网公司',
      role: '产品运营实习生',
      type: 'internship',
      startDate: '2025.06',
      endDate: '2025.09',
      description: '',
      bullets: [
        '参与校园增长项目执行，围绕活动报名链路梳理站内引导文案与触达节奏。',
        '独立整理每周复盘数据，定位转化掉点并提出 3 项页面优化建议。',
        '协同设计与研发完成专题页上线，活动报名人数提升 42%。',
      ],
    },
  ],
  projects: [
    {
      id: 'project-1',
      organization: '校园新媒体栏目增长项目',
      role: '项目负责人',
      type: 'project',
      startDate: '2024.09',
      endDate: '2025.01',
      description: '',
      bullets: [
        '搭建每周选题表与内容节奏表，连续 8 周稳定产出图文和短内容。',
        '根据阅读完成率调整封面与标题表达，栏目平均互动率提升 31%。',
        '复盘用户留言高频问题，沉淀出适合求职季传播的话题方向。',
      ],
    },
  ],
  skills: [
    {
      id: 'skill-1',
      title: '内容表达',
      source: 'confirmed',
      details: ['熟悉小红书、公众号内容策划', '能独立撰写活动文案与复盘总结'],
    },
    {
      id: 'skill-2',
      title: '数据处理',
      source: 'confirmed',
      details: ['熟练使用 Excel、问卷工具与基础图表分析', '能完成周报与简要洞察'],
    },
    {
      id: 'skill-3',
      title: '协同推进',
      source: 'confirmed',
      details: ['有跨团队沟通经验', '能对接设计、研发和校园渠道资源'],
    },
    {
      id: 'skill-4',
      title: '语言能力',
      source: 'confirmed',
      details: ['英语六级', '能阅读英文资料并完成基础书面表达'],
    },
  ],
};

export function createResumeDataFromInput(input: string): ResumeData {
  const cleanInput = input.trim();
  if (!cleanInput) return defaultResumeData;

  const parsedBullets = cleanInput
    .split(/[，。；;\n、]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);

  return {
    ...defaultResumeData,
    basics: {
      ...defaultResumeData.basics,
      summary: cleanInput,
    },
    projects: [
      {
        ...defaultResumeData.projects[0],
        bullets: parsedBullets.length > 0 ? parsedBullets : defaultResumeData.projects[0].bullets,
      },
    ],
  };
}

export function extractResumeDraftFromText(input: string): ResumeExtractionDraft {
  const sourceText = input.trim();
  const phrases = splitDraftPhrases(sourceText, 12);
  const email = sourceText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
  const phone = sourceText.match(/1[3-9]\d{9}/)?.[0] || '';
  const city = phrases.find((phrase) => /北京|上海|广州|深圳|杭州|成都|武汉|南京|苏州|西安/.test(phrase)) || '';
  const targetRole = extractTargetRoleFromText(sourceText);
  const education = extractEducationDraft(sourceText, phrases);
  const experiences = extractExperienceDrafts(sourceText, phrases);
  const projects = extractProjectDrafts(sourceText, phrases);
  const skills = extractSkillDrafts(sourceText, phrases);
  const missingFields = [
    targetRole ? '' : 'targetRole',
    education.length > 0 ? '' : 'education',
  ].filter(Boolean);

  return {
    basics: {
      city,
      email,
      phone,
      targetRole,
      summary: '',
      confidence: 0.72,
      missingFields,
      sourceText,
    },
    education,
    experiences,
    projects,
    skills,
    sourceText,
  };
}

export function createResumeDataFromExtractionDraft(draft: ResumeExtractionDraft): ResumeData {
  return {
    ...blankResumeData,
    basics: {
      ...blankResumeData.basics,
      name: draft.basics?.name || '',
      targetRole: draft.basics?.targetRole || '',
      city: draft.basics?.city || '',
      phone: draft.basics?.phone || '',
      email: draft.basics?.email || '',
      portfolio: draft.basics?.portfolio || '',
      summary: draft.basics?.summary || '',
    },
    education: draft.education.map((item, index) => ({
      id: `edu-extract-${index}`,
      school: item.school || '',
      major: item.major || '',
      degree: item.degree || '',
      startDate: item.startDate || '',
      endDate: item.endDate || '',
      highlights: item.highlights || [],
    })),
    experiences: draft.experiences.map((item, index) => ({
      id: `exp-extract-${index}`,
      organization: item.organization || '实习/工作经历',
      role: item.role || '',
      type: item.type || 'internship',
      startDate: item.startDate || '',
      endDate: item.endDate || '',
      description: item.description || '',
      bullets: item.bullets || [],
    })),
    projects: draft.projects.map((item, index) => ({
      id: `project-extract-${index}`,
      organization: item.organization || '项目经历',
      role: item.role || '',
      type: 'project',
      startDate: item.startDate || '',
      endDate: item.endDate || '',
      description: item.description || '',
      bullets: item.bullets || [],
    })),
    skills: draft.skills.map((skill, index) => ({
      id: `skill-extract-${index}`,
      title: skill.title,
      source: 'draft',
      details: [],
    })),
  };
}

export function polishResumeData(data: ResumeData): ResumeData {
  return {
    ...data,
    basics: {
      ...data.basics,
      summary: polishSentence(data.basics.summary),
    },
    experiences: data.experiences.map((entry) => ({
      ...entry,
      bullets: entry.bullets.map(polishBullet),
    })),
    projects: data.projects.map((entry) => ({
      ...entry,
      bullets: entry.bullets.map(polishBullet),
    })),
    skills: data.skills.map((skill) => ({
      ...skill,
      source: skill.source === 'draft' ? 'confirmed' : skill.source,
      details: skill.details.map(polishSentence),
    })),
  };
}

function splitDraftPhrases(value: string, limit: number) {
  return value
    .split(/[，。；;\n、]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function extractTargetRoleFromText(value: string) {
  return value.match(/(?:目标岗位|求职意向|应聘|想投|想做)[:：]?\s*([^，。；;\n]{2,20})/)?.[1]?.trim() || '';
}

function extractEducationDraft(sourceText: string, phrases: string[]): ResumeExtractionDraft['education'] {
  const schoolPhrase = phrases.find((phrase) => /大学|学院|学校/.test(phrase));
  if (!schoolPhrase) return [];

  return [
    {
      school: schoolPhrase,
      major: phrases.find((phrase) => /专业|工程|管理|设计|计算机|营销|金融|会计/.test(phrase)) || '',
      degree: phrases.find((phrase) => /本科|硕士|专科|博士/.test(phrase)) || '',
      highlights: phrases.filter((phrase) => /GPA|课程|奖|证书|绩点|排名/.test(phrase)).slice(0, 3),
      confidence: 0.72,
      missingFields: [],
      sourceText,
    },
  ];
}

function extractExperienceDrafts(sourceText: string, phrases: string[]): ResumeExtractionDraft['experiences'] {
  const experiencePhrase = phrases.find((phrase) => /实习|工作|任职|公司|兼职/.test(phrase));
  if (!experiencePhrase) return [];

  return [
    {
      organization: experiencePhrase.match(/在([^，。；;\n]{2,22})(?:实习|工作|任职|做|担任)/)?.[1]?.trim() || experiencePhrase,
      role: phrases.find((phrase) => /实习生|经理|运营|产品|设计|开发|助理/.test(phrase)) || '',
      type: 'internship',
      description: '',
      bullets: phrases.filter((phrase) => phrase !== experiencePhrase).slice(0, 4),
      confidence: 0.68,
      sourceText: experiencePhrase,
    },
  ];
}

function extractProjectDrafts(sourceText: string, phrases: string[]): ResumeExtractionDraft['projects'] {
  const projectPhrase = phrases.find((phrase) => /项目|比赛|活动|课程作业|社团|作品/.test(phrase));
  if (!projectPhrase) return [];

  return [
    {
      organization: projectPhrase,
      role: phrases.find((phrase) => /负责人|成员|组长|主导|参与/.test(phrase)) || '',
      type: 'project',
      description: '',
      bullets: phrases.filter((phrase) => phrase !== projectPhrase).slice(0, 4),
      confidence: 0.68,
      sourceText: projectPhrase,
    },
  ];
}

function extractSkillDrafts(sourceText: string, phrases: string[]): ResumeExtractionDraft['skills'] {
  const matchedSkills = [
    /AI|AIGC|生图|图片生成|视频生成/i.test(sourceText) ? 'AIGC 内容生成' : '',
    /Excel|SQL|数据|Python/i.test(sourceText) ? '数据分析' : '',
    /Figma|Axure|原型/i.test(sourceText) ? '原型设计' : '',
    /沟通|协同|推进/i.test(sourceText) ? '沟通协作' : '',
  ].filter(Boolean);

  return [...new Set([...matchedSkills, ...phrases.filter((phrase) => /熟悉|掌握|会|技能|工具/.test(phrase))])]
    .slice(0, 6)
    .map((title) => ({
      title,
      confidence: 0.66,
      sourceText,
    }));
}

function polishSentence(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function polishBullet(value: string) {
  const cleanValue = polishSentence(value);
  if (!cleanValue) return cleanValue;
  return /[。.!！]$/.test(cleanValue) ? cleanValue : `${cleanValue}。`;
}
