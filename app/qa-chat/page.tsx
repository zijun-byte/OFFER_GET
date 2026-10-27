'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import SiteShell from '../components/SiteShell';
import ChatPanel from './ChatPanel';
import { defaultMessages, type Draft, type Message } from './chatMessages';

const QA_STORAGE_KEY = 'offerGetQaDraft';

export default function QaChatPage() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(defaultMessages);
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const [sentCount, setSentCount] = useState(0);

  useEffect(() => {
    if (sentCount === 0) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    threadEndRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'end' });
  }, [sentCount]);

  useEffect(() => {
    try {
      const savedDraft = JSON.parse(localStorage.getItem(QA_STORAGE_KEY) || 'null') as Draft | null;
      setDraft(savedDraft);
      if (savedDraft?.company || savedDraft?.role) {
        setMessages((currentMessages) =>
          currentMessages.map((message) =>
            message.id === 'ai-intro'
              ? {
                  ...message,
                  content: `我先帮你快速梳理一下。你现在想投的是 ${savedDraft.company || '目标公司'} 的 ${
                    savedDraft.role || '目标岗位'
                  }，如果你已经有一段简历内容，也可以直接发给我。`,
                }
              : message,
          ),
        );
      }
    } catch {
      setDraft(null);
    }
  }, []);

  const jobTitle = useMemo(() => {
    if (draft?.company && draft?.role) {
      return `${draft.company} / ${draft.role}`;
    }
    return '小红书 / 产品运营实习生';
  }, [draft]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    const history = messages
      .filter((message) => !message.example && !message.notice)
      .slice(-12)
      .map(({ role, content }) => ({ role, content }));
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    };

    setMessages((currentMessages) => [...currentMessages.filter((message) => !message.notice), userMessage]);
    setInput('');
    setIsSending(true);
    setSentCount((count) => count + 1);

    try {
      const response = await fetch('/api/qa-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: draft || {}, history, message: text }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        reply?: string;
        suggestions?: string[];
      } | null;

      if (!response.ok || !payload?.reply) {
        throw new Error(payload?.error || 'AI 回复暂时不可用，请稍后再试。');
      }

      const reply = payload.reply;
      const suggestions = Array.isArray(payload.suggestions)
        ? payload.suggestions.filter((suggestion): suggestion is string => typeof suggestion === 'string' && Boolean(suggestion.trim()))
        : [];
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `ai-${Date.now()}`,
          role: 'ai',
          content: reply,
          quickCard: suggestions.length
            ? { title: '你还可以继续问', items: suggestions.slice(0, 3), suggestions: true }
            : undefined,
        },
      ]);
    } catch (error) {
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `notice-${Date.now()}`,
          role: 'ai',
          notice: true,
          content: error instanceof Error ? error.message : 'AI 回复暂时不可用，请稍后再试。',
        },
      ]);
    } finally {
      setIsSending(false);
      setSentCount((count) => count + 1);
    }
  }

  function handlePickSuggestion(text: string) {
    setInput(text);
    inputRef.current?.focus();
  }

  return (
    <SiteShell active="qa">
      <ChatPanel
        input={input}
        inputRef={inputRef}
        isSending={isSending}
        jobTitle={jobTitle}
        messages={messages}
        onInputChange={setInput}
        onPickSuggestion={handlePickSuggestion}
        onSubmit={handleSubmit}
        threadEndRef={threadEndRef}
      />
    </SiteShell>
  );
}
