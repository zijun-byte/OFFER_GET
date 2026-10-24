import styles from './AdvanceQaPage.module.css';
import type { Draft, Field } from './qaFields';

type QaInputCardProps = {
  draft: Draft;
  error?: string;
  field: Field;
  inactive?: boolean;
  onUpdate: (field: keyof Draft, value: string) => void;
};

export default function QaInputCard({ draft, error, field, inactive = false, onUpdate }: QaInputCardProps) {
  return (
    <section className={`${styles.inputCard} ${error ? styles.inputCardInvalid : ''}`} inert={inactive} aria-hidden={inactive || undefined}>
      <span className={styles.fieldNumber}>{field.number}</span>
      <label className={styles.label} htmlFor={field.id}>
        {field.label}
        {field.id === 'resume' ? <span className={styles.optional}>选填</span> : null}
      </label>
      <p className={styles.fieldTip}>{field.tip}</p>
      {field.type === 'textarea' ? (
        <textarea
          aria-describedby={error ? `${field.id}-error` : undefined}
          aria-invalid={error ? true : undefined}
          className={styles.textArea}
          id={field.id}
          name={field.id}
          placeholder={field.placeholder}
          value={draft[field.id]}
          onChange={(event) => onUpdate(field.id, event.target.value)}
        />
      ) : (
        <input
          aria-describedby={error ? `${field.id}-error` : undefined}
          aria-invalid={error ? true : undefined}
          aria-required
          autoComplete={field.autoComplete}
          enterKeyHint="next"
          className={styles.textInput}
          id={field.id}
          name={field.id}
          placeholder={field.placeholder}
          type="text"
          value={draft[field.id]}
          onChange={(event) => onUpdate(field.id, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing && event.keyCode !== 229) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
      )}
      {error ? (
        <p className={styles.fieldError} id={`${field.id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
