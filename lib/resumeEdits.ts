import type { ResumeData, ResumeEditorSection } from '../app/online-editor/resumePreviewData';

export type ResumeEdit = { op: 'set' | 'add' | 'remove'; section: ResumeEditorSection; id?: string; field?: string; value?: unknown };
export const resumeFields = {
  basics: ['name', 'targetRole', 'city', 'phone', 'email', 'portfolio', 'summary'],
  education: ['school', 'major', 'degree', 'startDate', 'endDate', 'highlights'],
  experiences: ['organization', 'role', 'type', 'startDate', 'endDate', 'description', 'bullets'],
  projects: ['organization', 'role', 'type', 'startDate', 'endDate', 'description', 'bullets'],
  skills: ['title', 'details'],
} as const;
const arrayFields = new Set(['highlights', 'bullets', 'details']);
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
function validValue(field: string, value: unknown) {
  if (arrayFields.has(field)) return Array.isArray(value) && value.length <= 80 && value.every((v) => typeof v === 'string' && v.length <= 6000);
  if (field === 'type') return ['internship', 'project', 'work', 'campus'].includes(String(value));
  return typeof value === 'string' && value.length <= 12000;
}
export function isResumeData(value: unknown): value is ResumeData {
  if (!record(value) || !record(value.basics)) return false;
  for (const field of resumeFields.basics) if (field !== 'portfolio' && !validValue(field, value.basics[field])) return false;
  if (value.basics.portfolio !== undefined && !validValue('portfolio', value.basics.portfolio)) return false;
  for (const section of ['education', 'experiences', 'projects', 'skills'] as const) {
    const entries = value[section];
    if (!Array.isArray(entries) || entries.length > 100) return false;
    const ids = new Set<string>();
    for (const entry of entries) {
      if (!record(entry) || typeof entry.id !== 'string' || ids.has(entry.id)) return false;
      ids.add(entry.id);
      for (const field of resumeFields[section]) {
        if (field === 'description' && entry[field] === undefined) continue;
        if (!validValue(field, entry[field])) return false;
      }
    }
  }
  return true;
}

// Shared by server validation and client application. Never accept arbitrary object paths.
export function applyResumeEdits(data: ResumeData, edits: unknown, operationId: string): ResumeData {
  if (!isResumeData(data) || !Array.isArray(edits) || edits.length > 40) throw new Error('修改内容不符合简历格式');
  const next = structuredClone(data);
  for (const [index, edit] of edits.entries()) {
    if (!record(edit) || typeof edit.section !== 'string' || !Object.hasOwn(resumeFields, edit.section)) throw new Error('未知简历模块');
    const section = edit.section as ResumeEditorSection;
    const allowed: readonly string[] = resumeFields[section];
    const entries = section === 'basics' ? null : next[section];
    if (edit.op === 'set') {
      if (typeof edit.field !== 'string' || !allowed.includes(edit.field) || !validValue(edit.field, edit.value)) throw new Error('不允许修改该字段');
      const target = section === 'basics' ? next.basics : entries?.find((entry) => entry.id === edit.id);
      if (!target) throw new Error('目标经历不存在，请重新选择');
      Object.assign(target, { [edit.field]: edit.value });
    } else if (edit.op === 'remove' && entries) {
      const at = entries.findIndex((entry) => entry.id === edit.id);
      if (at < 0) throw new Error('目标经历不存在');
      entries.splice(at, 1);
    } else if (edit.op === 'add' && entries && record(edit.value)) {
      const id = `edit-${operationId}-${index}`;
      if (entries.some((entry) => entry.id === id)) continue;
      const item: Record<string, unknown> = { id };
      for (const field of allowed) {
        const value = edit.value[field] ?? (arrayFields.has(field) ? [] : field === 'type' ? section === 'projects' ? 'project' : 'work' : '');
        if (!validValue(field, value)) throw new Error('新增内容格式错误');
        item[field] = value;
      }
      if (section === 'skills') item.source = 'confirmed';
      const signature = (v: Record<string, unknown>) => JSON.stringify(allowed.map((field) => v[field] ?? ''));
      if (!entries.some((entry) => signature(entry as unknown as Record<string, unknown>) === signature(item))) {
        (entries as unknown as Record<string, unknown>[]).push(item);
      }
    } else throw new Error('不支持的修改操作');
  }
  if (!isResumeData(next)) throw new Error('修改后简历格式无效');
  return next;
}
export function needsConfirmation(edits: ResumeEdit[]) {
  return edits.some((edit) => edit.op === 'remove' || edit.op === 'set' && (edit.value === '' || Array.isArray(edit.value))) || edits.length > 5;
}
