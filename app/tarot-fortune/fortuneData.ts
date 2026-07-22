export const results = [
  {
    title: '表达正在变清晰',
    text: '今天适合把经历改成结果导向。把“参与”换成“负责”，把感受换成数据，面试官会更快抓住你的亮点。',
  },
  {
    title: '机会来自主动靠近',
    text: '不要等岗位完全匹配才投递。先用一段针对性开场，把你和岗位最相关的能力放到最前面。',
  },
  {
    title: '稳定感是你的优势',
    text: '今天不必追求惊艳表达。把项目背景、你的动作和复盘讲完整，平稳就是很强的职业感。',
  },
  {
    title: '小修改会带来好运',
    text: '投递前检查关键词、时间线和作品链接。一个细节被看见，可能就是简历进入下一轮的理由。',
  },
  {
    title: '适合练习第一分钟',
    text: '先准备一段自然的自我介绍。开场说顺了，后面的问答会明显轻松。',
  },
  {
    title: '别低估你的校园经历',
    text: '社团、课程项目和比赛都可以转成能力证据。重点不是经历大小，而是你如何拆解问题。',
  },
] as const;

export const cards = [
  { number: 'I', label: '表达力' },
  { number: 'II', label: '匹配度' },
  { number: 'III', label: '行动感' },
] as const;

export type FortuneResult = (typeof results)[number];
export type FortuneCardData = (typeof cards)[number];
