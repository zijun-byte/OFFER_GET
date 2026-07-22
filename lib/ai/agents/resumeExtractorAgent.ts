import {
  extractResumeDraftFromText,
  type ResumeExtractionDraft,
} from '../../../app/online-editor/resumePreviewData';
import { runJsonAgent } from '../agentRuntime';

type ExtractorOutput = {
  draft?: unknown;
};

type UnknownRecord = Record<string, unknown>;

export async function runResumeExtractorAgent(text: string) {
  try {
    const result = await runJsonAgent<{ text: string }, ExtractorOutput>({
      agentId: 'resume-extractor',
      task: 'extract_resume_draft_from_source_text',
      input: { text },
    });

    if (!result.output.draft) {
      throw new Error('Extractor returned no draft.');
    }

    return {
      draft: normalizeDraft(result.output.draft, text),
      mode: 'ai' as const,
    };
  } catch {
    return {
      draft: extractResumeDraftFromText(text),
      mode: 'local-fallback' as const,
    };
  }
}

function normalizeDraft(rawDraft: unknown, sourceText: string): ResumeExtractionDraft {
  const draft = asRecord(rawDraft);
  const rawBasics = asRecord(draft.basics);
  const explicitSkills = extractExplicitSkills(sourceText);
  const aiSkills = arrayOfRecords(draft.skills)
    .map((skill) => ({
      title: text(skill.title),
      confidence: number(skill.confidence, 0.75),
      sourceText: text(skill.sourceText) || sourceText,
    }))
    .filter((skill) => skill.title);
  const skills = dedupeSkills([...aiSkills, ...explicitSkills]);

  return {
    basics: {
      name: text(rawBasics.name) || extractName(sourceText),
      targetRole: text(rawBasics.targetRole) || text(rawBasics.targetJob) || extractTargetRole(sourceText),
      city: text(rawBasics.city) || text(rawBasics.location),
      phone: text(rawBasics.phone) || sourceText.match(/1[3-9]\d{9}/)?.[0] || '',
      email: text(rawBasics.email) || sourceText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '',
      portfolio: text(rawBasics.portfolio) || text(rawBasics.website),
      summary: text(rawBasics.summary),
      confidence: number(rawBasics.confidence, 0.75),
      missingFields: stringArray(rawBasics.missingFields),
      sourceText: text(rawBasics.sourceText) || sourceText,
    },
    education: arrayOfRecords(draft.education).map((item) => ({
      school: text(item.school),
      major: text(item.major),
      degree: text(item.degree),
      startDate: text(item.startDate),
      endDate: text(item.endDate),
      highlights: stringArray(item.highlights ?? item.honors),
      confidence: number(item.confidence, 0.7),
      missingFields: stringArray(item.missingFields),
      sourceText: text(item.sourceText),
    })),
    experiences: normalizeEntries(draft.experiences, 'internship'),
    projects: normalizeEntries(draft.projects, 'project'),
    skills,
    sourceText,
  };
}

function normalizeEntries(value: unknown, defaultType: 'internship' | 'project'): ResumeExtractionDraft['projects'] {
  return arrayOfRecords(value).map((item) => ({
    organization: text(item.organization) || text(item.name),
    role: text(item.role),
    type: normalizeEntryType(item.type, defaultType),
    startDate: text(item.startDate),
    endDate: text(item.endDate),
    description: text(item.description),
    bullets: stringArray(item.bullets ?? item.highlights),
    confidence: number(item.confidence, 0.7),
    missingFields: stringArray(item.missingFields),
    sourceText: text(item.sourceText),
  }));
}

function extractExplicitSkills(sourceText: string): ResumeExtractionDraft['skills'] {
  const match = sourceText.match(/(?:技能与工具|技能|工具|证书|语言能力)\s*[:：]\s*([^\n]+)/i);
  if (!match?.[1]) return [];

  return match[1]
    .split(/[、，,；;]/)
    .map((title) => title.trim())
    .filter(Boolean)
    .map((title) => ({ title, confidence: 0.95, sourceText: match[0] }));
}

function extractName(sourceText: string) {
  const firstLine = sourceText.split(/\r?\n/).map((line) => line.trim()).find(Boolean) || '';
  return /^[\u4e00-\u9fa5·]{2,8}$/.test(firstLine) ? firstLine : '';
}

function extractTargetRole(sourceText: string) {
  return sourceText.match(/(?:求职意向|目标岗位|目标职位)\s*[:：]\s*([^\n]+)/)?.[1]?.trim() || '';
}

function dedupeSkills(skills: ResumeExtractionDraft['skills']) {
  const seen = new Set<string>();
  return skills.filter((skill) => {
    const key = skill.title.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeEntryType(value: unknown, fallback: 'internship' | 'project') {
  return value === 'work' || value === 'campus' || value === 'internship' || value === 'project' ? value : fallback;
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {};
}

function arrayOfRecords(value: unknown) {
  return Array.isArray(value) ? value.map(asRecord) : [];
}

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function stringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
  }
  return typeof value === 'string' && value.trim() ? [value.trim()] : [];
}

function number(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}