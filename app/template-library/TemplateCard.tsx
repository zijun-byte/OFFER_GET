import Image from 'next/image';
import { shellStyles } from '../components/SiteShell';
import styles from './TemplateLibraryPage.module.css';
import type { Template } from './templates';

type TemplateCardProps = {
  template: Template;
  onPreview: (template: Template) => void;
  onUse: (template: Template) => void;
};

export default function TemplateCard({ template, onPreview, onUse }: TemplateCardProps) {
  return (
    <article className={styles.templateCard}>
      <button
        aria-label={`放大预览：${template.title}`}
        className={styles.sheet}
        onClick={() => onPreview(template)}
        type="button"
      >
        <Image
          alt=""
          className={styles.resumePreview}
          height={640}
          src={template.image}
          width={460}
        />
        <span className={styles.sheetHint} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="6" />
            <path d="M20 20l-4.2-4.2M11 8.5v5M8.5 11h5" />
          </svg>
          放大看
        </span>
      </button>

      <div className={styles.templateMeta}>
        <div className={styles.titleRow}>
          <h2 className={styles.templateTitle}>{template.title}</h2>
          <span className={`${styles.tag} ${template.outputType === 'docx' ? styles.tagDocx : ''}`}>{template.tag}</span>
        </div>
        <p className={styles.templateDesc}>{template.description}</p>
      </div>

      <div className={styles.cardActions}>
        <span className={styles.smallNote}>{template.note}</span>
        <a className={shellStyles.button} href={template.outputType === 'docx' ? `/docx-template/${encodeURIComponent(template.id)}` : `/online-editor?template=${encodeURIComponent(template.id)}`} onClick={() => onUse(template)}>
          {template.outputType === 'docx' ? '生成 Word' : '使用模板'}
        </a>
      </div>
    </article>
  );
}
