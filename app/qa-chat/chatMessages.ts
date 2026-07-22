export type Draft = {
  company?: string;
  role?: string;
  resume?: string;
};

export type Message = {
  id: string;
  role: 'ai' | 'user';
  content: string;
  quickCard?: {
    title: string;
    items: string[];
  };
};

export const defaultMessages: Message[] = [
  {
    id: 'ai-intro',
    role: 'ai',
    content: '我先帮你快速梳理一下。你现在想投的是哪家公司、什么岗位？如果你已经有一段简历内容，也可以直接发给我。',
  },
  {
    id: 'user-example-one',
    role: 'user',
    content: '我想投小红书的产品运营实习生，简历里有一段校园活动增长项目，但我不确定该怎么讲更像岗位需要的能力。',
  },
  {
    id: 'ai-suggestion-one',
    role: 'ai',
    content: '这个方向挺适合提前拆一下。产品运营岗通常会关注三件事：你有没有做过增长或内容相关动作、你能不能做复盘、你是否能把执行过程讲得清楚。',
    quickCard: {
      title: '我建议你下一步补充这 3 点',
      items: ['1. 你的项目目标是什么', '2. 你具体做了哪些动作', '3. 最后有没有数据结果或复盘结论'],
    },
  },
  {
    id: 'user-example-two',
    role: 'user',
    content: '我当时负责报名页文案、活动推送和后续复盘，报名人数大概提升了 40% 左右，这样说够吗？',
  },
  {
    id: 'ai-suggestion-two',
    role: 'ai',
    content: '已经有雏形了。你现在这段经历最值钱的地方，不是“参加过活动”，而是“你围绕转化做了动作，并且看到了结果”。',
    quickCard: {
      title: '可以往这个方向继续追问',
      items: [
        '你觉得岗位更看重我的内容能力，还是数据复盘能力？',
        '这段经历在面试里会被怎么追问？',
        '如果我没有大厂实习，应该怎么讲校园项目？',
      ],
    },
  },
];
