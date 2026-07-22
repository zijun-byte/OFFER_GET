export type InterviewQuestion = {
  id: string;
  title: string;
  prompt: string;
};

const questionPool: InterviewQuestion[] = [
  {
    id: 'target-role',
    title: '目标岗位',
    prompt: '你这次主要想投递什么岗位？如果有目标行业或城市，也可以一起写上。',
  },
  {
    id: 'education',
    title: '教育背景',
    prompt: '请补充你的学校、专业、年级，以及和求职方向相关的课程或成绩亮点。',
  },
  {
    id: 'project',
    title: '项目经历',
    prompt: '你有没有一个最能代表能力的项目、比赛、课程作业或校园活动？请写你做了什么和结果。',
  },
  {
    id: 'internship',
    title: '实习经历',
    prompt: '你是否有实习、兼职或组织工作经历？请补充角色、任务和成果。',
  },
  {
    id: 'skills',
    title: '技能亮点',
    prompt: '你有哪些技能、工具、证书或语言能力，能支撑目标岗位？',
  },
  {
    id: 'impact',
    title: '结果数据',
    prompt: '上面提到的经历里，有没有人数、转化率、阅读量、排名、周期等可以量化的结果？',
  },
];

const keywordMap: Record<string, string[]> = {
  'target-role': ['岗位', '投', '求职', '运营', '产品', '市场', '设计', '开发', '实习'],
  education: ['学校', '大学', '学院', '专业', '本科', '硕士', 'gpa', '课程'],
  project: ['项目', '比赛', '活动', '社团', '课程作业', '公众号', '小红书'],
  internship: ['实习', '公司', '兼职', '工作', '部门'],
  skills: ['技能', '证书', '英语', 'excel', 'python', 'figma', '工具'],
  impact: ['提升', '增长', '%', '人', '数据', '排名', '转化', '阅读'],
};

export function createMockQuestions(statement: string) {
  const normalized = statement.toLowerCase();
  const missingQuestions = questionPool.filter((question) => {
    const keywords = keywordMap[question.id] || [];
    return !keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
  });

  const selected = missingQuestions.length >= 4 ? missingQuestions : questionPool;
  return selected.slice(0, 5);
}

export function buildResumeDraft(statement: string, answers: Record<string, string>) {
  const usefulAnswers = Object.values(answers).filter(Boolean);
  return [statement, ...usefulAnswers].join('\n');
}
