import { runJsonAgent } from '../agentRuntime';
import type { InterviewAnswer, Scorecard } from '../qaWorkflowTypes';

export type QaChatDraft = { company?: string; role?: string; resume?: string };
export type QaChatHistoryMessage = { role: 'ai' | 'user'; content: string };

async function runTask<T>(task: string, input: unknown): Promise<T> {
  const result = await runJsonAgent<typeof input, T>({ agentId: 'qa-chat', task, input });
  return result.output;
}

function shortText(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

export async function reviewQaContext(input: {
  draft: QaChatDraft;
  profileNotes: string[];
  intakeTurns: number;
}) {
  const output = await runTask<{ ready?: unknown; question?: unknown; company?: unknown; role?: unknown }>('review_context', input);
  const draft = {
    ...input.draft,
    company: input.draft.company?.trim() || shortText(output.company, 120),
    role: input.draft.role?.trim() || shortText(output.role, 120),
  };
  const missingTarget = !draft.company || !draft.role;
  return {
    draft,
    ready: !missingTarget && output.ready === true,
    question: missingTarget
      ? !draft.role
        ? '你想面试什么岗位？先告诉我岗位名称，我会按这个方向准备问题。'
        : '你想面试哪家公司？如果还没确定，也可以说“暂未确定”。'
      : shortText(output.question, 240) || '请讲一段最能体现岗位能力的经历，包括你做了什么和结果。',
  };
}

export async function planQaInterview(input: { draft: QaChatDraft; profileNotes: string[] }) {
  const output = await runTask<{ questions?: unknown }>('plan_interview', input);
  const questions = Array.isArray(output.questions)
    ? output.questions.map((question) => shortText(question, 220)).filter(Boolean).slice(0, 5)
    : [];
  if (questions.length >= 3) return questions;
  const role = input.draft.role?.trim() || '目标岗位';
  return [
    `请介绍一段最能体现你胜任${role}的经历，你具体负责什么？`,
    '当时遇到的主要困难是什么？你做了哪些判断和行动？',
    '最终取得了什么结果？你如何验证这些结果？',
    `如果重新做这件事，你会怎样改进？这和${role}有什么关联？`,
  ];
}

export async function reviewQaAnswer(input: {
  draft: QaChatDraft;
  question: string;
  answer: string;
  previousAnswers: InterviewAnswer[];
}) {
  const output = await runTask<{ sufficient?: unknown; followUp?: unknown }>('review_answer', input);
  return {
    sufficient: output.sufficient === true,
    followUp: shortText(output.followUp, 220),
  };
}

export async function scoreQaInterview(input: {
  draft: QaChatDraft;
  answers: InterviewAnswer[];
  plannedQuestionCount: number;
}): Promise<Scorecard> {
  const output = await runTask<{ items?: unknown; summary?: unknown }>('score_interview', input);
  const labels = ['岗位相关性', '具体行动', '结果证据', '表达结构'];
  const raw = Array.isArray(output.items) ? output.items : [];
  if (raw.length < labels.length) throw new Error('Scoring agent returned an incomplete rubric.');
  const items = labels.map((label, index) => {
    const item = raw[index] as Record<string, unknown> | null;
    const numericScore = Number(item?.score);
    if (!Number.isFinite(numericScore)) throw new Error('Scoring agent returned an invalid score.');
    return {
      label,
      score: Math.max(0, Math.min(5, Math.round(numericScore))),
      evidence: shortText(item?.evidence, 200) || '当前回答尚缺少足够证据。',
      advice: shortText(item?.advice, 200) || '补充可核实的具体例子。',
    };
  });
  return {
    items,
    summary: shortText(output.summary, 400) || '以下反馈仅依据本轮面试回答。',
    provisional: input.answers.length < input.plannedQuestionCount,
  };
}

export async function answerQaFollowUp(input: {
  draft: QaChatDraft;
  history: QaChatHistoryMessage[];
  answers: InterviewAnswer[];
  scorecard: Scorecard;
  message: string;
}) {
  const output = await runTask<{ reply?: unknown }>('coach_follow_up', input);
  const reply = shortText(output.reply, 900);
  if (!reply) throw new Error('Coaching agent returned no reply.');
  return reply;
}
