import { NextResponse } from 'next/server';
import {
  answerQaFollowUp,
  planQaInterview,
  reviewQaAnswer,
  reviewQaContext,
  scoreQaInterview,
  type QaChatDraft,
  type QaChatHistoryMessage,
} from '../../../lib/ai/agents/qaChatAgent';
import { initialQaSession, type InterviewAnswer, type QaSessionState, type Scorecard } from '../../../lib/ai/qaWorkflowTypes';

type Action = 'start' | 'reply' | 'beginInterview' | 'finishInterview';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const action: Action = ['start', 'reply', 'beginInterview', 'finishInterview'].includes(body?.action)
    ? body.action
    : 'reply';
  const message = readText(body?.message, 3000);
  if (action === 'reply' && !message) return NextResponse.json({ error: '请输入你的回答。' }, { status: 400 });

  try {
    let draft = readDraft(body?.draft);
    const state = action === 'start' ? { ...initialQaSession } : readState(body?.state);
    const history = readHistory(body?.history);

    async function beginInterview(profileNotes: string[]) {
      if (!draft.role) throw new Error('请先填写目标岗位。');
      const questions = await planQaInterview({ draft, profileNotes });
      const nextState: QaSessionState = {
        ...initialQaSession,
        phase: 'interview',
        profileNotes,
        intakeTurns: state.intakeTurns,
        questions,
      };
      return {
        draft,
        state: nextState,
        reply: `信息已整理好，我们开始正式模拟面试。第 1 题（共 ${questions.length} 题）：${questions[0]}`,
      };
    }

    if (action === 'start' || (action === 'reply' && state.phase === 'intake')) {
      const profileNotes = action === 'reply' ? [...state.profileNotes, message].slice(-5) : state.profileNotes;
      const intakeTurns = action === 'reply' ? state.intakeTurns + 1 : state.intakeTurns;
      const review = await reviewQaContext({ draft, profileNotes, intakeTurns });
      draft = review.draft;
      if (review.ready || (intakeTurns >= 3 && draft.role)) return NextResponse.json(await beginInterview(profileNotes));
      return NextResponse.json({
        draft,
        state: { ...state, phase: 'intake', profileNotes, intakeTurns },
        reply: review.question,
      });
    }

    if (action === 'beginInterview') {
      if (state.phase !== 'intake') return NextResponse.json({ error: '当前阶段无法开始新面试。' }, { status: 400 });
      return NextResponse.json(await beginInterview(state.profileNotes));
    }

    if (action === 'finishInterview') {
      if (state.phase !== 'interview') return NextResponse.json({ error: '当前没有正在进行的面试。' }, { status: 400 });
      const answers = state.pendingAnswer
        ? [...state.answers, { question: state.questions[state.questionIndex], answer: state.pendingAnswer }]
        : state.answers;
      if (!answers.length) return NextResponse.json({ error: '至少回答一道题后才能获得评分。' }, { status: 400 });
      const scorecard = await scoreQaInterview({ draft, answers, plannedQuestionCount: state.questions.length });
      return NextResponse.json({ draft, state: { ...state, phase: 'review', answers, pendingAnswer: '', scorecard }, reply: '本轮面试已结束。下面的反馈只依据你实际回答的内容；你可以继续问我具体怎么改进。', scorecard });
    }

    if (state.phase === 'interview') {
      const question = state.questions[state.questionIndex];
      if (!question) return NextResponse.json({ error: '面试问题已结束，请刷新页面继续。' }, { status: 400 });
      const combinedAnswer = state.pendingAnswer ? `${state.pendingAnswer}\n补充：${message}` : message;
      if (state.followUpCount === 0) {
        const review = await reviewQaAnswer({ draft, question, answer: combinedAnswer, previousAnswers: state.answers });
        if (!review.sufficient && review.followUp) {
          return NextResponse.json({
            draft,
            state: { ...state, pendingAnswer: message, followUpCount: 1 },
            reply: review.followUp,
          });
        }
      }
      const answers = [...state.answers, { question, answer: combinedAnswer }];
      const nextIndex = state.questionIndex + 1;
      if (nextIndex < state.questions.length) {
        return NextResponse.json({
          draft,
          state: { ...state, answers, questionIndex: nextIndex, followUpCount: 0, pendingAnswer: '' },
          reply: `第 ${nextIndex + 1} 题（共 ${state.questions.length} 题）：${state.questions[nextIndex]}`,
        });
      }
      const scorecard = await scoreQaInterview({ draft, answers, plannedQuestionCount: state.questions.length });
      return NextResponse.json({
        draft,
        state: { ...state, phase: 'review', answers, pendingAnswer: '', followUpCount: 0, scorecard },
        reply: '模拟面试结束了。以下是基于这轮回答的评分与改进建议，你也可以继续向我追问。',
        scorecard,
      });
    }

    if (!state.scorecard) return NextResponse.json({ error: '评分记录不存在，请重新开始面试。' }, { status: 400 });
    const reply = await answerQaFollowUp({ draft, history, answers: state.answers, scorecard: state.scorecard, message });
    return NextResponse.json({ draft, state, reply });
  } catch (error) {
    console.error('QA interview workflow failed.', error);
    return NextResponse.json({ error: error instanceof Error && error.message === '请先填写目标岗位。' ? error.message : 'AI 面试暂时不可用，请稍后重试。' }, { status: 502 });
  }
}

function readState(value: unknown): QaSessionState {
  if (!value || typeof value !== 'object') return { ...initialQaSession };
  const state = value as Record<string, unknown>;
  const phase = state.phase === 'interview' || state.phase === 'review' ? state.phase : 'intake';
  const questions = readStrings(state.questions, 5, 220);
  const answers: InterviewAnswer[] = Array.isArray(state.answers)
    ? state.answers.slice(0, 5).flatMap((item: unknown) => {
        if (!item || typeof item !== 'object') return [];
        const entry = item as Record<string, unknown>;
        const question = readText(entry.question, 220);
        const answer = readText(entry.answer, 4000);
        return question && answer ? [{ question, answer }] : [];
      })
    : [];
  const rawScore = state.scorecard as Scorecard | undefined;
  const scorecard = phase === 'review' && rawScore && Array.isArray(rawScore.items) && rawScore.items.length === 4 ? rawScore : undefined;
  return {
    phase,
    intakeTurns: clampNumber(state.intakeTurns, 0, 5),
    profileNotes: readStrings(state.profileNotes, 5, 3000),
    questions,
    questionIndex: clampNumber(state.questionIndex, 0, Math.max(0, questions.length - 1)),
    followUpCount: clampNumber(state.followUpCount, 0, 1),
    pendingAnswer: readText(state.pendingAnswer, 3000),
    answers,
    scorecard,
  };
}

function readDraft(value: unknown): QaChatDraft {
  if (!value || typeof value !== 'object') return {};
  const draft = value as Record<string, unknown>;
  return { company: readText(draft.company, 120), role: readText(draft.role, 120), resume: readText(draft.resume, 12000) };
}

function readHistory(value: unknown): QaChatHistoryMessage[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-12).flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') return [];
    const entry = item as Record<string, unknown>;
    const content = readText(entry.content, 2000);
    return content && (entry.role === 'ai' || entry.role === 'user') ? [{ role: entry.role, content }] : [];
  });
}

function readStrings(value: unknown, count: number, limit: number): string[] {
  return Array.isArray(value) ? value.slice(-count).map((item) => readText(item, limit)).filter(Boolean) : [];
}

function readText(value: unknown, limit: number): string {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function clampNumber(value: unknown, min: number, max: number): number {
  const number = typeof value === 'number' && Number.isFinite(value) ? Math.floor(value) : min;
  return Math.min(max, Math.max(min, number));
}
