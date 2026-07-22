import Image from 'next/image';
import styles from './TemplateLibraryPage.module.css';
import type { Template } from './templates';

type TemplatePreviewModalProps = {
  template: Template;
  onClose: () => void;
};

export default function TemplatePreviewModal({ template, onClose }: TemplatePreviewModalProps) {
  return (
    <div className={styles.modal} aria-hidden="false" onClick={onClose}>
      <div className={styles.modalPanel} onClick={(event) => event.stopPropagation()}>
        <div className={styles.modalHead}>
          <div>
            <h2 className={styles.modalTitle}>{template.title}</h2>
            <p className={styles.modalCopy}>{template.description}</p>
          </div>
          <button className={styles.closeButton} onClick={onClose} type="button" aria-label="关闭">
            ×
          </button>
        </div>
        <Image
          alt="放大简历模板预览"
          className={styles.modalImage}
          height={900}
          src={template.image}
          width={650}
        />
      </div>
    </div>
  );
}
