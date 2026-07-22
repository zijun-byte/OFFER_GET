import type { FormEvent } from 'react';
import shellStyles from '../components/JobPrepShell.module.css';
import styles from './AdvanceQaPage.module.css';
import QaInputCard from './QaInputCard';
import { fields, type Draft } from './qaFields';

type AdvanceQaFormProps = {
  draft: Draft;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdate: (field: keyof Draft, value: string) => void;
};

export default function AdvanceQaForm({ draft, onSubmit, onUpdate }: AdvanceQaFormProps) {
  return (
    <form className={styles.formArea} id="qa-form" onSubmit={onSubmit}>
      <div className={styles.inputGrid}>
        {fields.map((field) => (
          <QaInputCard draft={draft} field={field} key={field.id} onUpdate={onUpdate} />
        ))}
      </div>

      <div className={styles.actionRow}>
        <button className={shellStyles.button} type="submit">
          生成提前问答
        </button>
      </div>
    </form>
  );
}
