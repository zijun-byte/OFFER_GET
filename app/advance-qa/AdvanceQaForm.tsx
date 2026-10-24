import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { shellStyles } from '../components/SiteShell';
import styles from './AdvanceQaPage.module.css';
import QaInputCard from './QaInputCard';
import { fields, type Draft } from './qaFields';

type AdvanceQaFormProps = {
  draft: Draft;
  onSubmit: () => void;
  onUpdate: (field: keyof Draft, value: string) => void;
};

const requiredMessages: Partial<Record<keyof Draft, string>> = {
  company: '先写上目标公司，问答会围绕它展开。',
  role: '先写上岗位名称，才能拆解对应的能力要求。',
};

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === 'left' ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'} />
    </svg>
  );
}

export default function AdvanceQaForm({ draft, onSubmit, onUpdate }: AdvanceQaFormProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const lastStep = fields.length - 1;

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const syncViewport = () => setIsMobile(media.matches);
    syncViewport();
    media.addEventListener('change', syncViewport);
    return () => media.removeEventListener('change', syncViewport);
  }, []);

  function goToStep(index: number) {
    if (index < 0 || index > lastStep || index === activeStep) return;
    // Dismiss the keyboard without opening it on the next question.
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && formRef.current?.contains(focused)) focused.blur();
    setActiveStep(index);
  }

  function updateAnswer(field: keyof Draft, value: string) {
    onUpdate(field, value);
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fieldsToValidate = isMobile && activeStep < lastStep ? [fields[activeStep]] : fields;
    const nextErrors: Partial<Record<keyof Draft, string>> = {};
    for (const field of fieldsToValidate) {
      if (requiredMessages[field.id] && !draft[field.id].trim()) {
        nextErrors[field.id] = requiredMessages[field.id];
      }
    }
    setErrors(nextErrors);
    const invalidStep = fields.findIndex((field) => nextErrors[field.id]);
    if (invalidStep !== -1) {
      if (isMobile && invalidStep !== activeStep) goToStep(invalidStep);
      else if (!isMobile) formRef.current?.querySelector<HTMLElement>(`#${fields[invalidStep].id}`)?.focus({ preventScroll: true });
      return;
    }
    if (isMobile && activeStep < lastStep) goToStep(activeStep + 1);
    else onSubmit();
  }

  return (
    <form className={styles.formArea} id="qa-form" ref={formRef} noValidate onSubmit={handleSubmit}>
      <div className={styles.questionFrame}>
        <div className={styles.questionViewport}>
          <div className={styles.inputGrid} style={{ '--qa-step': activeStep } as CSSProperties}>
            {fields.map((field, index) => (
              <QaInputCard
                draft={draft}
                error={errors[field.id]}
                field={field}
                key={field.id}
                inactive={isMobile && index !== activeStep}
                onUpdate={updateAnswer}
              />
            ))}
          </div>
        </div>

        {activeStep > 0 ? (
          <button className={`${styles.stepArrow} ${styles.stepArrowLeft}`} type="button" aria-label="上一题" onClick={() => goToStep(activeStep - 1)}>
            <Chevron direction="left" />
          </button>
        ) : null}
        {activeStep < lastStep ? (
          <button className={`${styles.stepArrow} ${styles.stepArrowRight}`} type="button" aria-label="下一题" onClick={() => goToStep(activeStep + 1)}>
            <Chevron direction="right" />
          </button>
        ) : null}

        <div className={styles.mobileAction}>
          <button className={shellStyles.button} type="submit">
            {activeStep === lastStep ? '开始提前问答' : '下一题'}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      <nav className={styles.stepProgress} aria-label="问答进度">
        {fields.map((field, index) => (
          <button
            className={`${styles.progressStep} ${index === activeStep ? styles.progressStepActive : ''}`}
            key={field.id}
            type="button"
            aria-label={`第 ${index + 1} 题：${field.label}`}
            aria-current={index === activeStep ? 'step' : undefined}
            onClick={() => goToStep(index)}
          >
            <span />
          </button>
        ))}
      </nav>
      <span className="sr-only" role="status">
        {isMobile ? `第 ${activeStep + 1} 题，共 ${fields.length} 题：${fields[activeStep].label}` : ''}
      </span>

      <div className={styles.actionRow}>
        <span className={styles.actionHint}>公司和岗位必填，简历可以稍后在对话里补充</span>
        <button className={shellStyles.button} type="submit">
          生成提前问答
        </button>
      </div>
    </form>
  );
}
