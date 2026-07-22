import type { ResumeData } from '../../app/online-editor/resumePreviewData';

export type ResumeSuggestion = {
  id: string;
  path: string;
  section: string;
  label: string;
  before: string;
  after: string;
  reason: string;
};

export function createResumeSuggestions(before: ResumeData, after: ResumeData): ResumeSuggestion[] {
  const suggestions: ResumeSuggestion[] = [];

  compareValue(suggestions, 'basics.summary', '基础信息', '个人总结', before.basics.summary, after.basics.summary);

  before.education.forEach((item, index) => {
    const next = after.education[index];
    if (!next) return;
    compareValue(suggestions, `education.${index}.highlights`, '教育经历', `教育经历 ${index + 1} · 亮点`, item.highlights, next.highlights);
  });

  compareEntries(suggestions, 'experiences', '实习经历', before.experiences, after.experiences);
  compareEntries(suggestions, 'projects', '项目经历', before.projects, after.projects);

  before.skills.forEach((item, index) => {
    const next = after.skills[index];
    if (!next) return;
    compareValue(suggestions, `skills.${index}.title`, '技能补充', `技能 ${index + 1}`, item.title, next.title);
    compareValue(suggestions, `skills.${index}.details`, '技能补充', `技能 ${index + 1} · 说明`, item.details, next.details);
  });

  return suggestions;
}

function compareEntries(
  suggestions: ResumeSuggestion[],
  key: 'experiences' | 'projects',
  section: string,
  before: ResumeData['experiences'],
  after: ResumeData['experiences'],
) {
  before.forEach((item, index) => {
    const next = after[index];
    if (!next) return;
    compareValue(suggestions, `${key}.${index}.description`, section, `${section} ${index + 1} · 说明`, item.description || '', next.description || '');
    compareValue(suggestions, `${key}.${index}.bullets`, section, `${section} ${index + 1} · 经历描述`, item.bullets, next.bullets);
  });
}

function compareValue(
  suggestions: ResumeSuggestion[],
  path: string,
  section: string,
  label: string,
  beforeValue: string | string[],
  afterValue: string | string[],
) {
  const before = Array.isArray(beforeValue) ? beforeValue.join('\n') : beforeValue;
  const after = Array.isArray(afterValue) ? afterValue.join('\n') : afterValue;
  if (before.trim() === after.trim()) return;

  suggestions.push({
    id: `${path}-${suggestions.length}`,
    path,
    section,
    label,
    before,
    after,
    reason: '优化表达清晰度、行动感和简历语气，不新增原文没有的事实。',
  });
}

export function applyResumeSuggestions(
  resumeData: ResumeData,
  suggestions: ResumeSuggestion[],
  selectedIds: Set<string>,
): ResumeData {
  const next = structuredClone(resumeData);

  suggestions.forEach((suggestion) => {
    if (!selectedIds.has(suggestion.id)) return;
    const parts = suggestion.path.split('.');
    let target: unknown = next;

    for (let index = 0; index < parts.length - 1; index += 1) {
      const key = /^\d+$/.test(parts[index]) ? Number(parts[index]) : parts[index];
      target = (target as Record<string | number, unknown>)[key];
    }

    const finalPart = parts[parts.length - 1];
    const key = /^\d+$/.test(finalPart) ? Number(finalPart) : finalPart;
    const current = (target as Record<string | number, unknown>)[key];
    (target as Record<string | number, unknown>)[key] = Array.isArray(current)
      ? suggestion.after.split('\n').map((line) => line.trim()).filter(Boolean)
      : suggestion.after;
  });

  return next;
}
