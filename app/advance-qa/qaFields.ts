export const fields = [
  {
    number: '01',
    id: 'company',
    label: '公司',
    tip: '填写目标公司名称，也可以补充城市、业务线或你关注的部门。',
    placeholder: '例如：字节跳动 / 上海商业化团队',
    autoComplete: 'organization',
    type: 'input',
  },
  {
    number: '02',
    id: 'role',
    label: '岗位',
    tip: '输入岗位名称或 JD 关键词，帮助提前拆解能力要求和准备重点。',
    placeholder: '例如：产品运营实习生',
    autoComplete: 'off',
    type: 'input',
  },
  {
    number: '03',
    id: 'resume',
    label: '简历',
    tip: '粘贴简历摘要、项目经历或你最想被看见的一段经历。',
    placeholder: '粘贴你的简历内容，或输入一段项目经历...',
    type: 'textarea',
  },
] as const;

export type Draft = {
  company: string;
  role: string;
  resume: string;
};

export type Field = (typeof fields)[number];
