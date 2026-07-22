'use client';

import { FormEvent, useEffect, useState } from 'react';
import JobPrepShell from '../components/JobPrepShell';
import AdvanceQaForm from './AdvanceQaForm';
import styles from './AdvanceQaPage.module.css';
import type { Draft } from './qaFields';

const QA_STORAGE_KEY = 'offerGetQaDraft';

export default function AdvanceQaPage() {
  const [draft, setDraft] = useState<Draft>({
    company: '',
    role: '',
    resume: '',
  });

  useEffect(() => {
    const savedDraft = localStorage.getItem(QA_STORAGE_KEY);
    if (!savedDraft) return;

    try {
      const parsedDraft = JSON.parse(savedDraft) as Partial<Draft>;
      setDraft({
        company: parsedDraft.company || '',
        role: parsedDraft.role || '',
        resume: parsedDraft.resume || '',
      });
    } catch {
      localStorage.removeItem(QA_STORAGE_KEY);
    }
  }, []);

  function saveDraft(nextDraft: Draft) {
    localStorage.setItem(
      QA_STORAGE_KEY,
      JSON.stringify({
        company: nextDraft.company.trim(),
        role: nextDraft.role.trim(),
        resume: nextDraft.resume.trim(),
      }),
    );
  }

  function updateDraft(field: keyof Draft, value: string) {
    const nextDraft = { ...draft, [field]: value };
    setDraft(nextDraft);
    saveDraft(nextDraft);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveDraft(draft);
    window.location.href = '/qa-chat';
  }

  return (
    <JobPrepShell active="qa">
      <section className={styles.qaStage}>
        <div className={styles.heroCopy} aria-labelledby="qa-title">
          <span className={styles.eyebrow}>AI 投递前问答 / 岗位理解与匹配建议</span>
          <h1 id="qa-title" className={styles.title}>
            把公司、岗位和简历放在一起，先问清楚再投递
          </h1>
          <p className={styles.lead}>
            输入目标公司、岗位方向和你的简历内容，系统可用于生成投递前问题、岗位匹配判断和面试准备重点。
          </p>
        </div>

        <AdvanceQaForm draft={draft} onSubmit={handleSubmit} onUpdate={updateDraft} />
      </section>
    </JobPrepShell>
  );
}
