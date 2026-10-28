'use client';

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import SiteShell from '../components/SiteShell';
import ChatPanel from './ChatPanel';
import { createChatMessageId } from './chatId';
import type { Draft, Message } from './chatMessages';
import { initialQaSession, type QaSessionState } from '../../lib/ai/qaWorkflowTypes';

const QA_DRAFT_KEY = 'offerGetQaDraft';
const QA_SESSION_KEY = 'offerGetQaInterviewV2';

type Action = 'start' | 'reply' | 'beginInterview' | 'finishInterview';
type ResponsePayload = { draft?: Draft; state?: QaSessionState; reply?: string; scorecard?: Message['scorecard']; error?: string };

export default function QaChatPage() {
  const [draft, setDraft] = useState<Draft>({});
  const [session, setSession] = useState<QaSessionState>(initialQaSession);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialized = useRef(false);

  const jobTitle = useMemo(() => {
    if (draft.company && draft.role) return `${draft.company} / ${draft.role}`;
    return draft.role || '模拟面试';
  }, [draft]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    let savedDraft: Draft = {};
    try {
      const parsed = JSON.parse(localStorage.getItem(QA_DRAFT_KEY) || '{}') as Draft;
      savedDraft = {
        company: typeof parsed.company === 'string' ? parsed.company.trim() : '',
        role: typeof parsed.role === 'string' ? parsed.role.trim() : '',
        resume: typeof parsed.resume === 'string' ? parsed.resume.trim() : '',
      };
      setDraft(savedDraft);
      const saved = JSON.parse(localStorage.getItem(QA_SESSION_KEY) || 'null') as {
        context?: string; state?: QaSessionState; messages?: Message[]; draft?: Draft;
      } | null;
      if (saved?.context === JSON.stringify(savedDraft) && saved.state && Array.isArray(saved.messages) && saved.messages.some((message) => !message.notice)) {
        setDraft(saved.draft || savedDraft);
        setSession(saved.state);
        setMessages(saved.messages);
        setHydrated(true);
        return;
      }
    } catch {
      // An invalid local snapshot starts a fresh interview.
    }
    setHydrated(true);
    void runAction('start', '', savedDraft, initialQaSession, []);
  }, []);

  useEffect(() => {
    if (!hydrated || isSending || !messages.some((message) => !message.notice)) return;
    try {
      const original = JSON.parse(localStorage.getItem(QA_DRAFT_KEY) || '{}') as Draft;
      localStorage.setItem(QA_SESSION_KEY, JSON.stringify({
        context: JSON.stringify({ company: original.company?.trim() || '', role: original.role?.trim() || '', resume: original.resume?.trim() || '' }),
        draft,
        state: session,
        messages,
      }));
    } catch {
      // The current conversation remains usable if storage is unavailable.
    }
  }, [draft, hydrated, isSending, messages, session]);

  async function runAction(action: Action, text: string, currentDraft = draft, currentState = session, currentMessages = messages) {
    const cleanMessages = currentMessages.filter((message) => !message.notice);
    const userMessage: Message | null = action === 'reply' ? { id: createChatMessageId('user'), role: 'user', content: text } : null;
    if (userMessage) setMessages([...cleanMessages, userMessage]);
    setIsSending(true);
    try {
      const response = await fetch('/api/qa-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          draft: currentDraft,
          state: currentState,
          history: cleanMessages.slice(-12).map(({ role, content }) => ({ role, content })),
          message: text,
        }),
      });
      const payload = (await response.json().catch(() => null)) as ResponsePayload | null;
      if (!response.ok || !payload?.reply || !payload.state) throw new Error(payload?.error || 'AI 面试暂时不可用，请稍后重试。');
      setDraft(payload.draft || currentDraft);
      setSession(payload.state);
      setMessages([...cleanMessages, ...(userMessage ? [userMessage] : []), {
        id: createChatMessageId('ai'),
        role: 'ai',
        content: payload.reply,
        scorecard: payload.scorecard,
      }]);
      setInput('');
    } catch (error) {
      setMessages([...cleanMessages, {
        id: createChatMessageId('notice'),
        role: 'ai',
        notice: true,
        content: error instanceof Error ? error.message : 'AI 面试暂时不可用，请稍后重试。',
      }]);
      if (userMessage) setInput(text);
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;
    setInput('');
    void runAction('reply', text);
  }

  return (
    <SiteShell active="qa">
      <ChatPanel
        input={input}
        inputRef={inputRef}
        isSending={isSending}
        canBeginInterview={Boolean(draft.role)}
        jobTitle={jobTitle}
        messages={messages}
        onBeginInterview={() => { if (!isSending) void runAction('beginInterview', ''); }}
        onFinishInterview={() => { if (!isSending) void runAction('finishInterview', ''); }}
        onInputChange={setInput}
        onRetry={() => { if (!isSending) void runAction('start', '', draft, initialQaSession, []); }}
        onSubmit={handleSubmit}
        session={session}
      />
    </SiteShell>
  );
}
