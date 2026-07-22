'use client';

import { useEffect, useState } from 'react';
import SiteShell from '../components/SiteShell';
import TemplateCard from './TemplateCard';
import styles from './TemplateLibraryPage.module.css';
import TemplatePreviewModal from './TemplatePreviewModal';
import { templates, type Template } from './templates';

const STORAGE_TEMPLATE_KEY = 'offerGetSelectedTemplate';

export default function TemplateLibraryPage() {
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  useEffect(() => {
    document.body.style.overflow = previewTemplate ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [previewTemplate]);

  function useTemplate(template: Template) {
    localStorage.setItem(STORAGE_TEMPLATE_KEY, template.id);
    if (template.outputType === 'docx') {
      window.location.href = `/docx-template/${template.id}`;
      return;
    }
    window.location.href = `/online-editor?template=${template.id}`;
  }

  return (
    <SiteShell active="resume" actionHref="/">
      <main className={styles.libraryStage}>
        <section className={styles.heroCopy} aria-labelledby="library-title">
          <span className={styles.eyebrow}>模板库预览 / 选择适合投递场景的简历版式</span>
          <h1 id="library-title">选一个简历模板吧</h1>
          <p className={styles.lead}>
            每个模板都以方框卡片呈现，可上下滚动浏览。网页模板支持在线编辑，DOCX 模板会保持原版设计并导出 Word 文件。
          </p>
        </section>

        <section className={styles.templateGrid} aria-label="简历模板列表">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onPreview={setPreviewTemplate}
              onUse={useTemplate}
            />
          ))}
        </section>
      </main>

      {previewTemplate ? (
        <TemplatePreviewModal template={previewTemplate} onClose={() => setPreviewTemplate(null)} />
      ) : null}
    </SiteShell>
  );
}
