'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { shellStyles } from '../components/SiteShell';
import styles from './TemplateLibraryPage.module.css';
import type { Template } from './templates';

type TemplatePreviewModalProps = {
  template: Template;
  onClose: () => void;
  onUse: () => void;
};

export default function TemplatePreviewModal({ template, onClose, onUse }: TemplatePreviewModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div className={styles.modal} onClick={onClose}>
      <div
        aria-labelledby="template-modal-title"
        aria-modal="true"
        className={styles.modalPanel}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className={styles.modalHead}>
          <div>
            <h2 className={styles.modalTitle} id="template-modal-title">
              {template.title}
            </h2>
            <p className={styles.modalCopy}>{template.description}</p>
          </div>
          <div className={styles.modalActions}>
            <a className={shellStyles.button} href={template.outputType === 'docx' ? `/docx-template/${encodeURIComponent(template.id)}` : `/online-editor?template=${encodeURIComponent(template.id)}`} onClick={onUse}>
              {template.outputType === 'docx' ? '生成 Word' : '使用模板'}
            </a>
            <button
              aria-label="关闭预览"
              className={styles.closeButton}
              onClick={onClose}
              ref={closeRef}
              type="button"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>
        <div className={styles.modalSheet}>
          <Image
            alt={`${template.title}模板放大预览`}
            className={styles.modalImage}
            height={900}
            src={template.image}
            width={650}
          />
        </div>
      </div>
    </div>
  );
}
