import { NextResponse } from 'next/server';
import { runQaChatAgent, type QaChatDraft, type QaChatHistoryMessage } from '../../../lib/ai/agents/qaChatAgent';

const MESSAGE_LIMIT = 3000;
const HISTORY_LIMIT = 12;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const message = readText(body?.message, MESSAGE_LIMIT);
  if (!message) return NextResponse.json({ error: '请输入你的问题。' }, { status: 400 });

  try {
    return NextResponse.json(
      await runQaChatAgent({ draft: readDraft(body?.draft), history: readHistory(body?.history), message }),
    );
  } catch (error) {
    console.error('QA chat AI request failed.', error);
    return NextResponse.json({ error: 'AI 回复暂时不可用，请稍后再试。' }, { status: 502 });
  }
}

function readDraft(value: unknown): QaChatDraft {
  if (!value || typeof value !== 'object') return {};
  const draft = value as Record<string, unknown>;
  return { company: readText(draft.company, 120), role: readText(draft.role, 120), resume: readText(draft.resume, 12000) };
}

function readHistory(value: unknown): QaChatHistoryMessage[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-HISTORY_LIMIT).flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const entry = item as Record<string, unknown>;
    const content = readText(entry.content, 2000);
    return content && (entry.role === 'ai' || entry.role === 'user') ? [{ role: entry.role, content }] : [];
  });
}

function readText(value: unknown, limit: number) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}
