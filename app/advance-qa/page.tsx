'use client';

import { useEffect, useState } from 'react';
import SiteShell from '../components/SiteShell';
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
    try {
      const savedDraft = localStorage.getItem(QA_STORAGE_KEY);
      if (!savedDraft) return;
      const parsedDraft = JSON.parse(savedDraft) as Partial<Draft>;
      setDraft({
        company: typeof parsedDraft.company === 'string' ? parsedDraft.company : '',
        role: typeof parsedDraft.role === 'string' ? parsedDraft.role : '',
        resume: typeof parsedDraft.resume === 'string' ? parsedDraft.resume : '',
      });
    } catch {
      // The form remains usable when storage is unavailable or the saved draft is invalid.
    }
  }, []);

  function saveDraft(nextDraft: Draft) {
    try {
      localStorage.setItem(
        QA_STORAGE_KEY,
        JSON.stringify({
          company: nextDraft.company.trim(),
          role: nextDraft.role.trim(),
          resume: nextDraft.resume.trim(),
        }),
      );
    } catch {
      // Keep answering and switching questions even if the browser cannot save a draft.
    }
  }

  function updateDraft(field: keyof Draft, value: string) {
    const nextDraft = { ...draft, [field]: value };
    setDraft(nextDraft);
    saveDraft(nextDraft);
  }

  function handleSubmit() {
    saveDraft(draft);
    window.location.href = '/qa-chat';
  }

  return (
    <SiteShell active="qa">
      <section className={styles.qaStage}>
        <AdvanceQaForm draft={draft} onSubmit={handleSubmit} onUpdate={updateDraft} />
      </section>
    </SiteShell>
  );
}
