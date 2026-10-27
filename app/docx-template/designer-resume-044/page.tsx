'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import SiteShell, { shellStyles } from '../../components/SiteShell';
import styles from './DesignerDocxPage.module.css';

type FormState = {
  name: string;
  targetTitle: string;
  phone: string;
  email: string;
  location: string;
  profile: string;
  skills: string;
  awards: string;
  experience: string;
  educationSchool: string;
  educationMajor: string;
  educationPeriod: string;
};

const initialForm: FormState = {
  name: '林若曦',
  targetTitle: '产品运营实习生',
  phone: '138-0000-0000',
  email: 'linruoxi@email.com',
  location: '上海',
  profile: '',
  skills: '内容策划、数据复盘、活动执行、Excel、小红书运营、跨团队沟通',
  awards: '',
  experience: '',
  educationSchool: '华东理工大学',
  educationMajor: '市场营销本科',
  educationPeriod: '2023 - 2027',
};

function lines(value: string) {
  return value
    .split(/[\n、,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildPayload(form: FormState) {
  const experienceLines = lines(form.experience);
  const awardLines = lines(form.awards);

  return {
    name: form.name,
    targetTitle: form.targetTitle,
    phone: form.phone,
    email: form.email,
    location: form.location,
    profile: form.profile,
    skills: lines(form.skills).slice(0, 6),
    awards: awardLines.slice(0, 2).map((item) => ({ name: item, result: '', year: '' })),
    experience: [
      {
        role: form.targetTitle,
        organization: '个人项目 / 校园经历',
        period: '近期',
        bullets: experienceLines.slice(0, 3),
      },
    ],
    education: {
      school: form.educationSchool,
      major: form.educationMajor,
      period: form.educationPeriod,
    },
  };
}

export default function DesignerDocxTemplatePage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const draft = localStorage.getItem('offerGetResumeDraft') || localStorage.getItem('offerGetResumeInput') || '';
    if (!draft) return;
    setForm((current) => ({
      ...current,
      profile: draft,
      experience: draft,
    }));
  }, []);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function generateDocx() {
    setIsGenerating(true);
    setError('');
    try {
      const response = await fetch('/api/docx-templates/designer-resume-044', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(form)),
      });

      if (!response.ok) {
        throw new Error('生成 DOCX 失败，请确认开发服务器已重启并重新尝试。');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${form.name || 'resume'}-设计师简历044.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setError(error instanceof Error ? error.message : '生成 DOCX 失败，请稍后重试。');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <SiteShell active="resume">
      <main className={styles.stage}>
        <header className={styles.intro}>
          <h1>设计师简历 044</h1>
          <p>填好内容后直接生成 Word 文件，原模板的版式、字体和配色保持不变。</p>
        </header>

        <div className={styles.layout}>
          <form className={styles.form}>
            <section className={styles.panel}>
              <h2>个人信息</h2>
              <div className={styles.grid}>
                <Field label="姓名" value={form.name} onChange={(value) => updateField('name', value)} />
                <Field label="求职岗位" value={form.targetTitle} onChange={(value) => updateField('targetTitle', value)} />
                <Field label="手机" value={form.phone} onChange={(value) => updateField('phone', value)} />
                <Field label="邮箱" value={form.email} onChange={(value) => updateField('email', value)} />
                <Field label="城市" value={form.location} onChange={(value) => updateField('location', value)} />
              </div>
            </section>

            <section className={styles.panel}>
              <h2>简历内容</h2>
              <Field multiline label="自我介绍" value={form.profile} onChange={(value) => updateField('profile', value)} />
              <Field multiline label="经历要点（一行一条）" value={form.experience} onChange={(value) => updateField('experience', value)} />
              <Field label="技能（用顿号或换行分隔）" value={form.skills} onChange={(value) => updateField('skills', value)} />
              <Field label="获奖/证书（可为空）" value={form.awards} onChange={(value) => updateField('awards', value)} />
            </section>

            <section className={styles.panel}>
              <h2>教育背景</h2>
              <div className={styles.grid}>
                <Field label="学校" value={form.educationSchool} onChange={(value) => updateField('educationSchool', value)} />
                <Field label="专业/学历" value={form.educationMajor} onChange={(value) => updateField('educationMajor', value)} />
                <Field label="在校时间" value={form.educationPeriod} onChange={(value) => updateField('educationPeriod', value)} />
              </div>
            </section>

            <div className={styles.actions}>
              <button className={shellStyles.button} disabled={isGenerating} onClick={generateDocx} type="button">
                {isGenerating ? '生成中...' : '生成 DOCX'}
              </button>
            </div>
            {error ? <p className={styles.error}>{error}</p> : null}
          </form>

          <aside className={styles.previewPanel}>
            <h2>原模板预览</h2>
            <Image
              alt="设计师简历 044 原模板预览"
              className={styles.previewImage}
              height={1737}
              src="/assets/resume-previews/designer-resume-044.jpg"
              width={1240}
            />
            <p className={styles.note}>预览使用你提供的整页 JPG。下载的文件会基于原始 Word 模板生成。</p>
          </aside>
        </div>
      </main>
    </SiteShell>
  );
}

function Field({
  label,
  multiline,
  onChange,
  value,
}: {
  label: string;
  multiline?: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {multiline ? (
        <textarea className={styles.textarea} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className={styles.input} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}
