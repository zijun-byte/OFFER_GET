'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import JobPrepShell from '../components/JobPrepShell';
import ChatPanel from './ChatPanel';
import { defaultMessages, type Draft, type Message } from './chatMessages';

const QA_STORAGE_KEY = 'offerGetQaDraft';

export default function QaChatPage() {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(defaultMessages);

  useEffect(() => {
    try {
      const savedDraft = JSON.parse(localStorage.getItem(QA_STORAGE_KEY) || 'null') as Draft | null;
      setDraft(savedDraft);
      if (savedDraft?.resume) {
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!text) return;

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
      },
    ]);
    setInput('');
  }

  return (
    <JobPrepShell active="qa" actionHref="/advance-qa" actionLabel="返回填写">
      <ChatPanel
        input={input}
        jobTitle={jobTitle}
        messages={messages}
        onInputChange={setInput}
        onSubmit={handleSubmit}
      />
    </JobPrepShell>
  );
}
