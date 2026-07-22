import styles from './AdvanceQaPage.module.css';
import type { Draft, Field } from './qaFields';

type QaInputCardProps = {
  draft: Draft;
  field: Field;
  onUpdate: (field: keyof Draft, value: string) => void;
};

export default function QaInputCard({ draft, field, onUpdate }: QaInputCardProps) {
  return (
    <section className={styles.inputCard}>
      <span className={styles.fieldNumber}>{field.number}</span>
      <label className={styles.label} htmlFor={field.id}>
        {field.label}
      </label>
      <p className={styles.fieldTip}>{field.tip}</p>
      {field.type === 'textarea' ? (
        <textarea
          className={styles.textArea}
          id={field.id}
          name={field.id}
          placeholder={field.placeholder}
          value={draft[field.id]}
          onChange={(event) => onUpdate(field.id, event.target.value)}
        />
      ) : (
        <input
          autoComplete={field.autoComplete}
          className={styles.textInput}
          id={field.id}
          name={field.id}
          placeholder={field.placeholder}
          type="text"
          value={draft[field.id]}
          onChange={(event) => onUpdate(field.id, event.target.value)}
        />
      )}
    </section>
  );
}
