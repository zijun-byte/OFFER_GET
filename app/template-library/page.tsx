'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import SiteShell from '../components/SiteShell';
import TemplateCard from './TemplateCard';
import styles from './TemplateLibraryPage.module.css';
import TemplatePreviewModal from './TemplatePreviewModal';
import { templates, type Template } from './templates';

const STORAGE_TEMPLATE_KEY = 'offerGetSelectedTemplate';
const FILTERS = ['全部', '热门', '稳重', '技术', '通用', '年轻', '极简', 'DOCX'] as const;

export default function TemplateLibraryPage() {
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('全部');

  const visible = useMemo(
    () => templates.filter((template) => filter === '全部' || template.tag === filter),
    [filter],
  );

  useEffect(() => {
    document.body.style.overflow = previewTemplate ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [previewTemplate]);

  const closePreview = useCallback(() => setPreviewTemplate(null), []);

  function useTemplate(template: Template) {
    try {
      localStorage.setItem(STORAGE_TEMPLATE_KEY, template.id);
    } catch {
      // Navigation should still work when mobile browser storage is unavailable.
    }
  }

  return (
    <SiteShell active="resume" actionHref="/">
      <div className={styles.libraryStage}>
        <div className={styles.toolbar}>
          <div className={styles.filters} role="group" aria-label="按风格筛选模板">
            {FILTERS.map((item) => (
              <button type="button" key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>
                <span>{item}</span>
              </button>
            ))}
          </div>
          <p className={styles.count} aria-live="polite">
            共 {visible.length} 套
          </p>
        </div>

        <section className={styles.templateGrid} aria-label="简历模板列表">
          {visible.map((template) => (
            <TemplateCard key={template.id} template={template} onPreview={setPreviewTemplate} onUse={useTemplate} />
          ))}
        </section>
      </div>

      {previewTemplate ? (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={closePreview}
          onUse={() => useTemplate(previewTemplate)}
        />
      ) : null}
    </SiteShell>
  );
}
