import React from 'react';
import { shellStyles } from '../components/SiteShell';
import { applyResumeSuggestions, isResumeSuggestionCurrent, type ResumeSuggestion } from '../../lib/ai/resumeSuggestions';
import styles from './OnlineEditorPage.module.css';
import type {
  ResumeData,
  ResumeEditorSection,
  ResumeExperience,
  ResumeExtractionDraft,
  ResumeSkill,
  ResumeVisibleSections,
} from './resumePreviewData';

type EditorSidePanelProps = {
  activeSection: ResumeEditorSection | null;
  resumeData: ResumeData;
  setActiveSection: (section: ResumeEditorSection | null) => void;
  setResumeData: React.Dispatch<React.SetStateAction<ResumeData>>;
  setVisibleSections: React.Dispatch<React.SetStateAction<ResumeVisibleSections>>;
  visibleSections: ResumeVisibleSections;
};

const sectionLabels: Record<ResumeEditorSection, string> = {
  basics: '基础信息',
  education: '教育经历',
  experiences: '实习经历',
  projects: '项目经历',
  skills: '技能补充',
};

const sectionOrder = Object.keys(sectionLabels) as ResumeEditorSection[];
const sectionVisibilityKeys: Partial<Record<ResumeEditorSection, keyof ResumeVisibleSections>> = {
  experiences: 'experiences',
  projects: 'projects',
  skills: 'skills',
};

export default function EditorSidePanel({
  activeSection,
  resumeData,
  setActiveSection,
  setResumeData,
  setVisibleSections,
  visibleSections,
}: EditorSidePanelProps) {
  const [isPolishing, setIsPolishing] = React.useState(false);
  const [polishStatus, setPolishStatus] = React.useState('');
  const [suggestions, setSuggestions] = React.useState<ResumeSuggestion[]>([]);

  async function polishCurrentResume() {
    setIsPolishing(true);
    setPolishStatus('正在调用简历润色智能体...');

    try {
      const response = await fetch('/api/resume/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData }),
      });

      if (!response.ok) {
        throw new Error('Failed to polish resume.');
      }

      const payload = (await response.json()) as {
        resumeData: ResumeData;
        suggestions: ResumeSuggestion[];
        meta?: {
          workflowId?: string;
          mode: 'ai' | 'local-fallback';
          trace?: Array<{
            agentId: string;
            model: string;
            mode: 'ai' | 'local-fallback' | 'skipped';
            summary: string;
          }>;
        };
      };
      setSuggestions(payload.suggestions || []);
      const aiSteps = payload.meta?.trace?.filter((step) => step.mode === 'ai') || [];
      const fallbackSteps = payload.meta?.trace?.filter((step) => step.mode === 'local-fallback') || [];
      setPolishStatus(
        payload.meta?.mode === 'ai'
          ? `已生成 ${payload.suggestions?.length || 0} 条修改建议：${aiSteps.map((step) => `${step.agentId}/${step.model}`).join(' -> ')}`
          : `已使用本地 fallback：${fallbackSteps[0]?.summary || '未启用真实模型'}`,
      );
    } catch {
      setPolishStatus('润色接口调用失败，请检查后台服务和模型配置。');
    } finally {
      setIsPolishing(false);
    }
  }

  function acceptSuggestion(suggestion: ResumeSuggestion) {
    setResumeData((current) => applyResumeSuggestions(current, [suggestion], new Set([suggestion.id])));
    setSuggestions((current) => current.filter((item) => item.id !== suggestion.id));
    setPolishStatus('已接受建议并同步到简历预览。');
  }

  return (
    <aside className={styles.sidePanel} aria-label="编辑操作区">
      <span className={styles.sideKicker}>结构化编辑</span>
      <h1>点击模块，左侧编辑</h1>
      <p>编辑内容会实时同步到右侧预览。每段经历可独立编辑，AI 建议经你接受后才会写入。</p>

      <div className={styles.sectionTabs} aria-label="可编辑模块">
        {sectionOrder.map((section) => {
          const isOpen = activeSection === section;
          const visibilityKey = sectionVisibilityKeys[section];
          return (
            <section className={`${styles.sectionAccordionItem} ${isOpen ? styles.sectionAccordionItemOpen : ''}`} key={section}>
              <div className={styles.sectionTabRow}>
                <button
                  aria-controls={`editor-section-${section}`}
                  aria-expanded={isOpen}
                  className={`${styles.sectionTab} ${isOpen ? styles.sectionTabActive : ''}`}
                  onClick={() => setActiveSection(isOpen ? null : section)}
                  type="button"
                >
                  <span>{sectionLabels[section]}</span>
                  <span className={`${styles.sectionChevron} ${isOpen ? styles.sectionChevronOpen : ''}`} aria-hidden="true" />
                </button>
                {visibilityKey ? (
                  <label className={styles.sectionVisibilityControl} title="显示在右侧简历预览">
                    <input
                      aria-label={`显示${sectionLabels[section]}`}
                      checked={visibleSections[visibilityKey]}
                      onChange={(event) =>
                        setVisibleSections((sections) => ({ ...sections, [visibilityKey]: event.target.checked }))
                      }
                      type="checkbox"
                    />
                  </label>
                ) : null}
              </div>
              <div hidden={!isOpen} className={styles.sectionTabContent} id={`editor-section-${section}`}>
                <EditorFields activeSection={section} resumeData={resumeData} setResumeData={setResumeData} />
              </div>
            </section>
          );
        })}
      </div>
      {suggestions.length > 0 ? (
        <SuggestionReview
          resumeData={resumeData}
          onAccept={acceptSuggestion}
          onIgnore={(id) => setSuggestions((current) => current.filter((item) => item.id !== id))}
          onCancel={() => {
            setSuggestions([]);
            setPolishStatus('已忽略剩余建议，保留当前简历内容。');
          }}
          suggestions={suggestions}
        />
      ) : null}
      <AgentComposer setActiveSection={setActiveSection} setResumeData={setResumeData} />

      <div className={styles.sideActions}>
        {polishStatus ? <p className={styles.polishStatus}>{polishStatus}</p> : null}
        <button className={shellStyles.ghostButton} disabled={isPolishing} onClick={polishCurrentResume} type="button">
          {isPolishing ? 'Polishing...' : '基础润色'}
        </button>
        <button className={shellStyles.button} type="button">
          下载 PDF
        </button>
        <button className={shellStyles.ghostButton} type="button">
          下载图片
        </button>
      </div>
    </aside>
  );
}

function SuggestionReview({
  resumeData,
  onAccept,
  onIgnore,
  onCancel,
  suggestions,
}: {
  resumeData: ResumeData;
  onAccept: (suggestion: ResumeSuggestion) => void;
  onIgnore: (id: string) => void;
  onCancel: () => void;
  suggestions: ResumeSuggestion[];
}) {
  return (
    <section className={styles.suggestionPanel} aria-label="AI 修改建议">
      <div className={styles.suggestionHeader}>
        <div>
          <strong>AI 修改建议</strong>
          <span>逐条接受后才会写入简历；忽略会保留原文</span>
        </div>
        <button className={styles.suggestionTextButton} onClick={onCancel} type="button">忽略全部</button>
      </div>
      <div className={styles.suggestionList}>
        {suggestions.map((suggestion) => (
          <article className={styles.suggestionItem} key={suggestion.id}>
            <span className={styles.suggestionContent}>
              <strong>{suggestion.label}</strong>
              <span className={styles.suggestionBefore}>原文：{suggestion.before || '（原字段为空）'}</span>
              <span className={styles.suggestionAfter}>建议：{suggestion.after}</span>
              <small>{suggestion.reason}</small>
              {!isResumeSuggestionCurrent(resumeData, suggestion) && <small>原文已修改或条目已删除，请忽略此建议并重新润色。</small>}
            </span>
            <div className={styles.confirmActions}>
              <button className={shellStyles.button} disabled={!isResumeSuggestionCurrent(resumeData, suggestion)} onClick={() => onAccept(suggestion)} type="button">接受</button>
              <button className={shellStyles.ghostButton} onClick={() => onIgnore(suggestion.id)} type="button">忽略</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
type DraftSkill = {
  id: string;
  selected: boolean;
  sourceText: string;
  title: string;
};

type AgentDraft = {
  basics?: {
    name: string;
  };
  education?: {
    school: string;
    degree: string;
    endDate: string;
  };
  targetRole?: string;
  skills: DraftSkill[];
  experience?: {
    organization: string;
    role: string;
    description: string;
    bullets: string[];
  };
  project?: {
    organization: string;
    role: string;
    description: string;
    bullets: string[];
  };
};

function AgentComposer({
  setActiveSection,
  setResumeData,
}: {
  setActiveSection: (section: ResumeEditorSection | null) => void;
  setResumeData: React.Dispatch<React.SetStateAction<ResumeData>>;
}) {
  const [input, setInput] = React.useState('');
  const [draft, setDraft] = React.useState<AgentDraft | null>(null);
  const [analysisStatus, setAnalysisStatus] = React.useState('');

  async function analyzeInput() {
    const sourceText = input.trim();
    if (!sourceText) {
      setDraft(null);
      setAnalysisStatus('\u8bf7\u5148\u8f93\u5165\u60f3\u8bc6\u522b\u7684\u5c97\u4f4d\u3001\u7ecf\u5386\u3001\u9879\u76ee\u6216\u6280\u80fd\u4fe1\u606f\u3002');
      return;
    }

    setAnalysisStatus('AI \u6b63\u5728\u8bc6\u522b\u4fe1\u606f...');
    try {
      const response = await fetch('/api/resume/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sourceText }),
      });
      if (!response.ok) throw new Error('Failed to extract agent draft.');

      const extraction = (await response.json()) as ResumeExtractionDraft;
      const nextDraft = createAgentDraftFromExtraction(extraction);
      if (hasAgentDraftContent(nextDraft)) {
        setDraft(nextDraft);
        setAnalysisStatus('\u5df2\u901a\u8fc7 AI \u8bc6\u522b\u4fe1\u606f\uff0c\u8bf7\u786e\u8ba4\u540e\u518d\u5199\u5165\u7b80\u5386\u3002');
        return;
      }
    } catch {
      // The local parser below keeps the editor usable when the AI service is unavailable.
    }

    const fallbackDraft = createAgentDraft(sourceText);
    if (!hasAgentDraftContent(fallbackDraft)) {
      setDraft(null);
      setAnalysisStatus('\u6682\u672a\u8bc6\u522b\u5230\u53ef\u5199\u5165\u5b57\u6bb5\u3002\u53ef\u4ee5\u8865\u5145\u5c97\u4f4d\u3001\u9879\u76ee\u3001\u5b9e\u4e60\u3001\u5de5\u5177\u6216\u6280\u80fd\u5173\u952e\u8bcd\u540e\u518d\u8bd5\u3002');
      return;
    }

    setDraft(fallbackDraft);
    setAnalysisStatus('\u667a\u80fd\u4f53\u6682\u65f6\u4e0d\u53ef\u7528\uff0c\u5df2\u4f7f\u7528\u672c\u5730\u89c4\u5219\u8bc6\u522b\uff1b\u8bf7\u786e\u8ba4\u540e\u518d\u5199\u5165\u7b80\u5386\u3002');
  }
  function confirmDraft() {
    if (!draft) return;

    setResumeData((data) => {
      const selectedSkillNames = draft.skills.filter((skill) => skill.selected).map((skill) => skill.title.trim()).filter(Boolean);
      const nextSkills = mergeSkills(data.skills, selectedSkillNames);
      const nextExperiences = draft.experience
        ? [createExperienceFromDraft(draft.experience), ...data.experiences]
        : data.experiences;
      const nextProjects = draft.project ? [createProjectFromDraft(draft.project), ...data.projects] : data.projects;

      return {
        ...data,
        basics: {
          ...data.basics,
          ...(draft.basics?.name ? { name: draft.basics.name } : {}),
          ...(draft.targetRole ? { targetRole: draft.targetRole } : {}),
        },
        education: draft.education
          ? [
              {
                id: 'edu-agent-' + Date.now(),
                school: draft.education.school,
                major: '',
                degree: draft.education.degree,
                startDate: '',
                endDate: draft.education.endDate,
                highlights: [],
              },
              ...data.education,
            ]
          : data.education,
        experiences: nextExperiences,
        projects: nextProjects,
        skills: nextSkills,
      };
    });

    const hasSelectedSkills = draft.skills.some((skill) => skill.selected && skill.title.trim());
    setActiveSection(draft.education ? 'education' : draft.experience ? 'experiences' : draft.project ? 'projects' : hasSelectedSkills ? 'skills' : 'basics');
    setInput('');
    setDraft(null);
  }

  return (
    <section className={styles.agentComposer} aria-label="AI 简历输入">
      <div className={styles.agentHeader}>
        <span>Agent 写入</span>
        <strong>先确认，再进简历</strong>
      </div>
      <textarea
        className={styles.agentInput}
        onChange={(event) => setInput(event.target.value)}
        placeholder="例如：我想投 AIGC 产品经理，会 AI 生图和视频生成，做过社团宣传项目。"
        value={input}
      />
      <button className={shellStyles.ghostButton} onClick={analyzeInput} type="button">
        识别信息
      </button>
      {analysisStatus ? <p className={styles.agentStatus} aria-live="polite">{analysisStatus}</p> : null}

      {draft ? (
        <div className={styles.confirmCard}>
          <strong>识别到的信息</strong>
          {draft.basics ? (
            <div className={styles.confirmGroup}>
              <span>姓名</span>
              <input
                className={styles.confirmInput}
                onChange={(event) => setDraft({ ...draft, basics: { ...draft.basics!, name: event.target.value } })}
                value={draft.basics.name}
              />
            </div>
          ) : null}
          {draft.education ? (
            <div className={styles.confirmGroup}>
              <span>教育经历</span>
              <input
                className={styles.confirmInput}
                onChange={(event) => setDraft({ ...draft, education: { ...draft.education!, school: event.target.value } })}
                placeholder="学校"
                value={draft.education.school}
              />
              <input
                className={styles.confirmInput}
                onChange={(event) => setDraft({ ...draft, education: { ...draft.education!, degree: event.target.value } })}
                placeholder="学历"
                value={draft.education.degree}
              />
              <input
                className={styles.confirmInput}
                onChange={(event) => setDraft({ ...draft, education: { ...draft.education!, endDate: event.target.value } })}
                placeholder="毕业年份"
                value={draft.education.endDate}
              />
            </div>
          ) : null}
          {draft.targetRole ? (
            <div className={styles.confirmGroup}>
              <span>目标岗位</span>
              <input
                className={styles.confirmInput}
                onChange={(event) => setDraft({ ...draft, targetRole: event.target.value })}
                value={draft.targetRole}
              />
              <small>来源：用户输入中关于投递方向的描述，写入前可修改。</small>
            </div>
          ) : null}
          {draft.skills.length > 0 ? (
            <div className={styles.confirmGroup}>
              <span>技能候选</span>
              <div className={styles.confirmCheckList}>
                {draft.skills.map((skill) => (
                  <label className={styles.confirmCheckItem} key={skill.id}>
                    <input
                      checked={skill.selected}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          skills: draft.skills.map((item) =>
                            item.id === skill.id ? { ...item, selected: event.target.checked } : item,
                          ),
                        })
                      }
                      type="checkbox"
                    />
                    <input
                      className={styles.confirmInlineInput}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          skills: draft.skills.map((item) =>
                            item.id === skill.id ? { ...item, title: event.target.value } : item,
                          ),
                        })
                      }
                      value={skill.title}
                    />
                    <small>{skill.sourceText}</small>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          {draft.experience ? (
            <div className={styles.confirmGroup}>
              <span>实习/工作经历</span>
              <input
                className={styles.confirmInput}
                onChange={(event) =>
                  setDraft({ ...draft, experience: draft.experience && { ...draft.experience, organization: event.target.value } })
                }
                value={draft.experience.organization}
              />
              <input
                className={styles.confirmInput}
                onChange={(event) =>
                  setDraft({ ...draft, experience: draft.experience && { ...draft.experience, role: event.target.value } })
                }
                value={draft.experience.role}
              />
              <textarea
                className={styles.confirmTextarea}
                onChange={(event) =>
                  setDraft({ ...draft, experience: draft.experience && { ...draft.experience, bullets: splitLines(event.target.value) } })
                }
                value={draft.experience.bullets.join('\n')}
              />
              <small>来源：识别到公司、实习、工作、任职等关键词。当前为规则识别，后续接 AI 后会更准确。</small>
            </div>
          ) : null}
          {draft.project ? (
            <div className={styles.confirmGroup}>
              <span>项目</span>
              <input
                className={styles.confirmInput}
                onChange={(event) =>
                  setDraft({ ...draft, project: draft.project && { ...draft.project, organization: event.target.value } })
                }
                value={draft.project.organization}
              />
              <input
                className={styles.confirmInput}
                onChange={(event) => setDraft({ ...draft, project: draft.project && { ...draft.project, role: event.target.value } })}
                value={draft.project.role}
              />
              <textarea
                className={styles.confirmTextarea}
                onChange={(event) =>
                  setDraft({ ...draft, project: draft.project && { ...draft.project, bullets: splitLines(event.target.value) } })
                }
                value={draft.project.bullets.join('\n')}
              />
              <small>来源：识别到项目、社团、比赛、活动等关键词。写入前可以修改。</small>
            </div>
          ) : null}
          <div className={styles.confirmActions}>
            <button className={shellStyles.ghostButton} onClick={() => setDraft(null)} type="button">
              取消
            </button>
            <button className={shellStyles.button} onClick={confirmDraft} type="button">
              加入简历
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function EditorFields({
  activeSection,
  resumeData,
  setResumeData,
}: {
  activeSection: ResumeEditorSection | null;
  resumeData: ResumeData;
  setResumeData: React.Dispatch<React.SetStateAction<ResumeData>>;
}) {
  const [collapsedEntries, setCollapsedEntries] = React.useState<Set<string>>(new Set());
  if (!activeSection) {
    return <p className={styles.emptyState}>点击右侧简历模块，或在上方选择一个模块进行编辑。</p>;
  }

  if (activeSection === 'basics') {
    return (
      <div className={styles.editorFields}>
        <TextField
          label="姓名"
          value={resumeData.basics.name}
          onChange={(value) => setResumeData((data) => ({ ...data, basics: { ...data.basics, name: value } }))}
        />
        <TextField
          label="目标岗位"
          value={resumeData.basics.targetRole}
          onChange={(value) => setResumeData((data) => ({ ...data, basics: { ...data.basics, targetRole: value } }))}
        />
        <TextField
          label="城市"
          value={resumeData.basics.city}
          onChange={(value) => setResumeData((data) => ({ ...data, basics: { ...data.basics, city: value } }))}
        />
        <TextField
          label="手机"
          value={resumeData.basics.phone}
          onChange={(value) => setResumeData((data) => ({ ...data, basics: { ...data.basics, phone: value } }))}
        />
        <TextField
          label="邮箱"
          value={resumeData.basics.email}
          onChange={(value) => setResumeData((data) => ({ ...data, basics: { ...data.basics, email: value } }))}
        />
        <TextAreaField
          label="个人总结"
          value={resumeData.basics.summary}
          onChange={(value) => setResumeData((data) => ({ ...data, basics: { ...data.basics, summary: value } }))}
        />
      </div>
    );
  }

  if (activeSection === 'education') {
    const education = resumeData.education[0];
    if (!education) {
      return (
        <EmptySection
          actionLabel="新增教育经历"
          label="教育经历"
          onCreate={() =>
            setResumeData((data) => ({
              ...data,
              education: [
                {
                  id: `edu-manual-${Date.now()}`,
                  school: '',
                  major: '',
                  degree: '',
                  startDate: '',
                  endDate: '',
                  highlights: [],
                },
              ],
            }))
          }
        />
      );
    }

    return (
      <div className={styles.editorFields}>
        <TextField
          label="学校"
          value={education.school}
          onChange={(value) =>
            setResumeData((data) => ({
              ...data,
              education: data.education.map((item, index) => (index === 0 ? { ...item, school: value } : item)),
            }))
          }
        />
        <TextField
          label="专业"
          value={education.major}
          onChange={(value) =>
            setResumeData((data) => ({
              ...data,
              education: data.education.map((item, index) => (index === 0 ? { ...item, major: value } : item)),
            }))
          }
        />
        <TextField
          label="学历"
          value={education.degree}
          onChange={(value) =>
            setResumeData((data) => ({
              ...data,
              education: data.education.map((item, index) => (index === 0 ? { ...item, degree: value } : item)),
            }))
          }
        />
        <TextField
          label="时间"
          value={`${education.startDate} - ${education.endDate}`}
          onChange={(value) =>
            setResumeData((data) => ({
              ...data,
              education: data.education.map((item, index) => (index === 0 ? splitDateRange(item, value) : item)),
            }))
          }
        />
        <TextAreaField
          label="亮点"
          value={education.highlights.join('\n')}
          onChange={(value) =>
            setResumeData((data) => ({
              ...data,
              education: data.education.map((item, index) =>
                index === 0 ? { ...item, highlights: splitLines(value) } : item,
              ),
            }))
          }
        />
      </div>
    );
  }

  if (activeSection === 'experiences' || activeSection === 'projects') {
    return (
      <div className={styles.editorFields}>
        {resumeData[activeSection].length === 0 && <p className={styles.emptyState}>暂无{sectionLabels[activeSection]}，可以手动新增一段。</p>}
        {resumeData[activeSection].map((entry, index) => {
          const entryKey = `${activeSection}-${entry.id}`;
          const isOpen = !collapsedEntries.has(entryKey);
          const title = entry.organization || `未命名${sectionLabels[activeSection]} ${index + 1}`;
          const update = (patch: Partial<Omit<ResumeExperience, 'id'>>) => updateEntry(activeSection, entry.id, setResumeData, patch);
          return (
            <article className={styles.experienceEditorCard} key={entry.id}>
              <button className={styles.sectionTab} type="button" aria-expanded={isOpen} aria-controls={`entry-${entryKey}`} onClick={() => {
                setCollapsedEntries((current) => {
                  const next = new Set(current);
                  if (next.has(entryKey)) next.delete(entryKey);
                  else next.add(entryKey);
                  return next;
                });
              }}>
                <span>{title}{entry.role ? ` · ${entry.role}` : ''}</span>
                <span className={`${styles.sectionChevron} ${isOpen ? styles.sectionChevronOpen : ''}`} aria-hidden="true" />
              </button>
              <div className={styles.experienceEditorBody} id={`entry-${entryKey}`} hidden={!isOpen}>
                <TextField label={activeSection === 'experiences' ? '公司 / 机构' : '项目 / 机构'} value={entry.organization} onChange={(organization) => update({ organization })} />
                <TextField label="岗位 / 角色" value={entry.role} onChange={(role) => update({ role })} />
                <div className={styles.experienceDates}>
                  <TextField label="开始时间" value={entry.startDate} onChange={(startDate) => update({ startDate })} />
                  <TextField label="结束时间" value={entry.endDate} onChange={(endDate) => update({ endDate })} />
                </div>
                <TextField label="说明" value={entry.description || ''} onChange={(description) => update({ description })} />
                <TextAreaField label="经历描述（每行一条）" value={entry.bullets.join('\n')} onChange={(value) => update({ bullets: splitLines(value) })} />
                <button className={styles.deleteEntryButton} type="button" onClick={() => {
                  if (!window.confirm(`确认删除「${title}」？该段经历及其内容会从简历预览中移除。`)) return;
                  setResumeData((data) => ({ ...data, [activeSection]: data[activeSection].filter((item) => item.id !== entry.id) }));
                  setCollapsedEntries((current) => { const next = new Set(current); next.delete(entryKey); return next; });
                }}>删除这段{sectionLabels[activeSection]}</button>
              </div>
            </article>
          );
        })}
        <button className={shellStyles.ghostButton} type="button" onClick={() => {
          const entry = createEmptyEntry(activeSection === 'experiences' ? 'internship' : 'project');
          setResumeData((data) => ({ ...data, [activeSection]: [...data[activeSection], entry] }));
        }}>新增一段{sectionLabels[activeSection]}</button>
      </div>
    );
  }

  return (
    <div className={styles.editorFields}>
      {resumeData.skills.length === 0 ? (
        <EmptySection
          actionLabel="新增技能"
          label="技能补充"
          onCreate={() =>
            setResumeData((data) => ({
              ...data,
              skills: [createEmptySkill(), ...data.skills],
            }))
          }
        />
      ) : null}
      {resumeData.skills.map((skill, index) => (
        <div className={styles.skillEditorCard} key={skill.id}>
          <TextField
            label={`技能 ${index + 1}`}
            value={skill.title}
            onChange={(value) =>
              setResumeData((data) => ({
                ...data,
                skills: data.skills.map((item) => (item.id === skill.id ? { ...item, title: value } : item)),
              }))
            }
          />
          <TextAreaField
            label="说明"
            placeholder="例如：熟练使用该工具完成哪些工作，或补充掌握程度。"
            value={skill.details.join('\n')}
            onChange={(value) =>
              setResumeData((data) => ({
                ...data,
                skills: data.skills.map((item) => (item.id === skill.id ? { ...item, details: splitLines(value) } : item)),
              }))
            }
          />
        </div>
      ))}
      {resumeData.skills.length > 0 ? (
        <button
          className={shellStyles.ghostButton}
          onClick={() =>
            setResumeData((data) => ({
              ...data,
              skills: [...data.skills, createEmptySkill()],
            }))
          }
          type="button"
        >
          新增技能
        </button>
      ) : null}
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className={styles.fieldLabel}>
      <span>{label}</span>
      <input className={styles.fieldInput} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextAreaField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={styles.fieldLabel}>
      <span>{label}</span>
      <textarea
        className={styles.fieldTextarea}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function EmptySection({
  actionLabel,
  label,
  onCreate,
}: {
  actionLabel?: string;
  label: string;
  onCreate?: () => void;
}) {
  return (
    <div className={styles.emptySectionBox}>
      <p className={styles.emptyState}>{label} 暂无内容，可以由问答、AI 确认卡片写入，也可以手动新增。</p>
      {onCreate && actionLabel ? (
        <button className={shellStyles.ghostButton} onClick={onCreate} type="button">
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function splitLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitDateRange<T extends { startDate: string; endDate: string }>(entry: T, value: string) {
  const [startDate, endDate] = value.split('-').map((item) => item.trim());
  return { ...entry, startDate: startDate || '', endDate: endDate || '' };
}

function updateEntry(
  section: 'experiences' | 'projects',
  entryId: string,
  setResumeData: React.Dispatch<React.SetStateAction<ResumeData>>,
  patch: Partial<Omit<ResumeExperience, 'id'>>,
) {
  setResumeData((data) => ({
    ...data,
    [section]: data[section].map((item) => (item.id === entryId ? { ...item, ...patch } : item)),
  }));
}

function createAgentDraftFromExtraction(extraction: ResumeExtractionDraft): AgentDraft {
  const basics = extraction.basics || {};
  const education = extraction.education?.[0];
  const experience = extraction.experiences?.[0];
  const project = extraction.projects?.[0];
  const sourceText = extraction.sourceText || '';

  return {
    basics: basics.name ? { name: basics.name } : undefined,
    education: education
      ? { school: education.school || '', degree: education.degree || '', endDate: education.endDate || '' }
      : undefined,
    targetRole: basics.targetRole || undefined,
    skills: (extraction.skills || []).map((skill, index) => ({
      id: 'draft-skill-' + index,
      selected: true,
      sourceText: skill.sourceText || sourceText,
      title: skill.title || '',
    })).filter((skill) => skill.title),
    experience: experience
      ? {
          organization: experience.organization || '',
          role: experience.role || '',
          description: experience.description || '',
          bullets: experience.bullets?.length ? experience.bullets : [experience.sourceText || sourceText].filter(Boolean),
        }
      : undefined,
    project: project
      ? {
          organization: project.organization || '',
          role: project.role || '',
          description: project.description || '',
          bullets: project.bullets?.length ? project.bullets : [project.sourceText || sourceText].filter(Boolean),
        }
      : undefined,
  };
}
function hasAgentDraftContent(draft: AgentDraft) {
  return Boolean(
    draft.basics
    || draft.education
    || draft.targetRole
    || draft.skills.length > 0
    || draft.experience
    || draft.project,
  );
}
function createAgentDraft(input: string): AgentDraft {
  const normalized = input.trim();
  const basics = extractBasics(normalized);
  const education = extractEducation(normalized);
  const targetRole = extractTargetRole(normalized);
  const skills = extractSkills(normalized).map((skill, index) => ({
    id: `draft-skill-${index}`,
    selected: true,
    sourceText: '来源：用户输入中的技能/工具关键词',
    title: skill,
  }));
  const experience = extractExperience(normalized);
  const project = extractProject(normalized);

  return { basics, education, targetRole, skills, experience, project };
}

function extractBasics(input: string): AgentDraft['basics'] {
  const name = input.match(/(?:我叫|姓名是|名字是) *([一-龥·]{2,8})/)?.[1]?.trim();
  return name ? { name } : undefined;
}

function extractEducation(input: string): AgentDraft['education'] {
  const school = input.match(/(?:就读于|毕业于|来自|学校是) *([^，。；;]{2,30})(?:的|，|。|；|;|本科|硕士|研究生|大专|学院|大学)/)?.[1]?.trim();
  const degree =
    input.match(/(博士研究生|硕士研究生|研究生|本科生|本科|大专|专科|博士|硕士)/)?.[1] || '';
  const endDate = input.match(/(20[0-9]{2})年(?:毕业|毕)/)?.[1] || '';
  if (!school && !degree && !endDate) return undefined;
  return { school: school || '', degree, endDate };
}
function extractTargetRole(input: string) {
  const roleMatch = input.match(/(?:投|应聘|目标|求职|想做|想投)\s*([^，。；;\n]{2,18})/);
  if (roleMatch?.[1]) return cleanupRole(roleMatch[1]);
  if (/AIGC|ai|AI/.test(input) && /产品/.test(input)) return 'AIGC 产品经理';
  if (/运营/.test(input)) return '产品运营实习生';
  if (/设计/.test(input)) return 'UI 设计实习生';
  return undefined;
}

function cleanupRole(role: string) {
  return role.replace(/岗位|方向|实习|。|，/g, '').trim() || role.trim();
}

function extractSkills(input: string) {
  const skillMap: Array<[RegExp, string]> = [
    [/AI\s*生图|ai\s*生图|图片生成|生图|Midjourney|MJ/i, 'AI 图片生成'],
    [/AI\s*视频|ai\s*视频|视频生成|生视频|剪映/i, 'AI 视频生成'],
    [/提示词|prompt/i, '提示词工程'],
    [/AIGC|内容生成/i, 'AIGC 内容生成'],
    [/模型|调优|大模型/i, '模型调优'],
    [/用户需求|需求分析/i, '用户需求分析'],
    [/数据分析|SQL|Excel/i, '数据分析'],
    [/Figma|Axure|原型/i, '原型设计'],
    [/Codex/i, 'AI 编程协作'],
  ];

  return [...new Set(skillMap.filter(([pattern]) => pattern.test(input)).map(([, skill]) => skill))];
}

function extractExperience(input: string): AgentDraft['experience'] {
  if (!/(实习|工作|任职|公司|岗位|兼职)/.test(input)) return undefined;

  const organization =
    input.match(/在([^，。；;\n]{2,22})(?:实习|工作|任职|做|担任)/)?.[1]?.trim() ||
    input.match(/([^，。；;\n]{2,22})(?:公司|团队|机构)/)?.[0]?.trim() ||
    '实习/工作经历';
  const role =
    input.match(/(?:担任|作为|岗位是|职位是)([^，。；;\n]{2,18})/)?.[1]?.trim() ||
    (/产品/.test(input) ? '产品相关实习生' : '实习生');

  return {
    organization,
    role,
    description: '',
    bullets: [input.length > 56 ? input.slice(0, 56) : input].filter(Boolean),
  };
}

function extractProject(input: string): AgentDraft['project'] {
  if (!/(项目|社团|比赛|活动|课程作业|宣传)/.test(input)) return undefined;

  const projectName = input.match(/(?:做过|参与|负责|完成)([^，。；;\n]{2,22})/)?.[1]?.trim();
  const organization = projectName || (/社团/.test(input) ? '社团宣传项目' : 'AIGC 内容实践项目');

  return {
    organization,
    role: '项目成员',
    description: '',
    bullets: [input.length > 48 ? input.slice(0, 48) : input].filter(Boolean),
  };
}

function createEmptyEntry(type: ResumeExperience['type']): ResumeExperience {
  return {
    id: `${type}-manual-${crypto.randomUUID()}`,
    organization: '',
    role: '',
    type,
    startDate: '',
    endDate: '',
    description: '',
    bullets: [],
  };
}

function createEmptySkill(): ResumeSkill {
  return {
    id: `skill-manual-${Date.now()}`,
    title: '',
    source: 'confirmed',
    details: [],
  };
}

function mergeSkills(currentSkills: ResumeSkill[], skillNames: string[]) {
  const existing = new Set(currentSkills.map((skill) => skill.title.trim()).filter(Boolean));
  const additions: ResumeSkill[] = skillNames
    .filter((skill) => !existing.has(skill))
    .map((skill, index) => ({
      id: `skill-agent-${Date.now()}-${index}`,
      title: skill,
      source: 'confirmed',
      details: [],
    }));

  return [...currentSkills, ...additions];
}

function createProjectFromDraft(project: NonNullable<AgentDraft['project']>): ResumeExperience {
  return {
    id: `project-agent-${Date.now()}`,
    organization: project.organization,
    role: project.role,
    type: 'project',
    startDate: '',
    endDate: '',
    description: project.description,
    bullets: project.bullets,
  };
}

function createExperienceFromDraft(experience: NonNullable<AgentDraft['experience']>): ResumeExperience {
  return {
    id: `experience-agent-${Date.now()}`,
    organization: experience.organization,
    role: experience.role,
    type: 'internship',
    startDate: '',
    endDate: '',
    description: experience.description,
    bullets: experience.bullets,
  };
}
