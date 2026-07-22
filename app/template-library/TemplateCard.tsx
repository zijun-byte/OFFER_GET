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
      <div className={styles.templateMeta}>
        <div>
          <h2 className={styles.templateTitle}>{template.title}</h2>
          <p className={styles.templateDesc}>{template.description}</p>
        </div>
        <span className={styles.tag}>{template.tag}</span>
      </div>
      <Image
        alt={`${template.title}简历模板预览`}
        className={styles.resumePreview}
        height={640}
        src={template.image}
        width={460}
      />
      <div className={styles.cardActions}>
        <span className={styles.smallNote}>{template.note}</span>
        <div className={styles.actionButtons}>
          <button className={shellStyles.ghostButton} onClick={() => onPreview(template)} type="button">
            预览
          </button>
          <button className={shellStyles.button} onClick={() => onUse(template)} type="button">
            使用模板
          </button>
        </div>
      </div>
    </article>
  );
}
