import type { Scorecard } from '../../lib/ai/qaWorkflowTypes';

export type Draft = { company?: string; role?: string; resume?: string };

export type Message = {
  id: string;
  role: 'ai' | 'user';
  content: string;
  notice?: boolean;
  scorecard?: Scorecard;
};

export const exampleMessages: Message[] = [
  { id: 'example-ai-1', role: 'ai', content: '请讲一个最能体现你岗位能力的项目。你负责什么？' },
  { id: 'example-user-1', role: 'user', content: '我负责校园活动的报名页文案、推送和复盘，报名人数提升了约 40%。' },
  { id: 'example-ai-2', role: 'ai', content: '报名人数增长的基准是多少？你如何判断增长主要来自自己的调整？' },
];
