import styles from './OnlineEditorPage.module.css';
import type { ResumeData, ResumeEditorSection, ResumeExperience, ResumeVisibleSections } from './resumePreviewData';
import ResumeSection from './ResumeSection';

type ResumePreviewProps = {
  activeSection: ResumeEditorSection | null;
  onSelectSection: (section: ResumeEditorSection | null) => void;
  selectedTemplate: string;
  resumeData: ResumeData;
  visibleSections: ResumeVisibleSections;
};

const templateClasses: Record<string, string> = {
  'fresh-single-column': styles.templateFreshSingleColumn,
  'business-double-column': styles.templateBusinessDoubleColumn,
  'tech-project': styles.templateTechProject,
  'campus-classic': styles.templateCampusClassic,
  'creative-light': styles.templateCreativeLight,
  'minimal-delivery': styles.templateMinimalDelivery,
};

function formatContact(resumeData: ResumeData) {
  const { city, phone, email, portfolio } = resumeData.basics;
  return [city, phone, email, portfolio].filter(Boolean).join(' | ');
}

function renderExperienceEntry(entry: ResumeExperience) {
  const meta = [entry.role, entry.description].filter(Boolean).join(' | ');

  return (
    <article className={styles.entry} key={entry.id}>
      <div className={styles.entryHead}>
        <div>
          {entry.organization && <h3 className={styles.entryTitle}>{entry.organization}</h3>}
          {meta && <p className={styles.entryMeta}>{meta}</p>}
        </div>
        {(entry.startDate || entry.endDate) && <span className={styles.entryTime}>{formatDateRange(entry)}</span>}
      </div>
      {entry.bullets.length > 0 && (
        <ul className={styles.entryList}>
          {entry.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

function formatDateRange(entry: { startDate: string; endDate: string }) {
  return [entry.startDate, entry.endDate].filter(Boolean).join(' - ');
}

function hasExperienceContent(entry: ResumeExperience) {
  return Boolean(
    entry.organization.trim() ||
      entry.role.trim() ||
      entry.description?.trim() ||
      entry.startDate.trim() ||
      entry.endDate.trim() ||
      entry.bullets.some((bullet) => bullet.trim()),
  );
}

function hasSkillContent(skill: ResumeData['skills'][number]) {
  return Boolean(skill.title.trim() || skill.details.some((detail) => detail.trim()));
}

function hasResumeContent(
  resumeData: ResumeData,
  visibleExperiences: ResumeExperience[],
  visibleProjects: ResumeExperience[],
  visibleSkills: ResumeData['skills'],
) {
  const { basics } = resumeData;

  return Boolean(
    basics.name.trim() ||
      basics.targetRole.trim() ||
      basics.city.trim() ||
      basics.phone.trim() ||
      basics.email.trim() ||
      basics.portfolio?.trim() ||
      basics.summary.trim() ||
      resumeData.education.length > 0 ||
      visibleExperiences.length > 0 ||
      visibleProjects.length > 0 ||
      visibleSkills.length > 0,
  );
}

export default function ResumePreview({
  activeSection,
  onSelectSection,
  selectedTemplate,
  resumeData,
  visibleSections,
}: ResumePreviewProps) {
  const { basics } = resumeData;
  const visibleExperiences = visibleSections.experiences ? resumeData.experiences.filter(hasExperienceContent) : [];
  const visibleProjects = visibleSections.projects ? resumeData.projects.filter(hasExperienceContent) : [];
  const visibleSkills = visibleSections.skills ? resumeData.skills.filter(hasSkillContent) : [];

  if (!hasResumeContent(resumeData, visibleExperiences, visibleProjects, visibleSkills)) {
    return (
      <section className={styles.previewPlaceholder} aria-label="简历预览占位">
        <div className={styles.placeholderPaper}>
          <span>简历预览</span>
          <h2>填写信息后会在这里生成预览</h2>
          <p>左侧完成逐步问答或粘贴旧简历后，系统会把内容写入结构化简历，并在右侧实时展示。</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.resumeShell} aria-label="简历预览" onClick={() => onSelectSection(null)}>
      <article
        className={`${styles.resumePaper} ${templateClasses[selectedTemplate] || ''}`}
      >
        <aside className={styles.resumeSidebar}>
          {resumeData.education.length > 0 && (
            <div className={styles.sidebarGroup}>
              <strong>教育</strong>
              {resumeData.education.map((item) => (
                <span key={item.id}>
                  {item.school} / {item.major}
                </span>
              ))}
            </div>
          )}
          {visibleSkills.length > 0 && (
            <div className={styles.sidebarGroup}>
              <strong>技能</strong>
              {visibleSkills.slice(0, 4).map((skill) => (
                <span key={skill.id}>{skill.title}</span>
              ))}
            </div>
          )}
          {[basics.city, basics.phone, basics.email, basics.portfolio].some(Boolean) && (
            <div className={styles.sidebarGroup}>
              <strong>联系</strong>
              {[basics.city, basics.phone, basics.email, basics.portfolio].filter(Boolean).map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          )}
        </aside>

        <div className={styles.resumeMain}>
          <header
            className={`${styles.resumeHead} ${activeSection === 'basics' ? styles.activeResumeBlock : ''}`}
            onClick={(event) => {
              event.stopPropagation();
              onSelectSection('basics');
            }}
          >
            <div>
              <h2 className={styles.resumeName}>{basics.name}</h2>
              <p className={styles.resumeRole}>{basics.targetRole}</p>
              <p className={styles.resumeContact}>{formatContact(resumeData)}</p>
            </div>
            {basics.summary && <div className={styles.summaryBox}>{basics.summary}</div>}
          </header>

          {resumeData.education.length > 0 && (
            <ResumeSection
              isActive={activeSection === 'education'}
              onSelect={(event) => {
                event.stopPropagation();
                onSelectSection('education');
              }}
              title="教育经历"
            >
              {resumeData.education.map((item) => (
                <article className={styles.entry} key={item.id}>
                  <div className={styles.entryHead}>
                    <div>
                      <h3 className={styles.entryTitle}>
                        {item.school} / {item.major}
                      </h3>
                      <p className={styles.entryMeta}>{[item.degree, ...item.highlights].filter(Boolean).join(' | ')}</p>
                    </div>
                    <span className={styles.entryTime}>{formatDateRange(item)}</span>
                  </div>
                </article>
              ))}
            </ResumeSection>
          )}

          {visibleExperiences.length > 0 && (
            <ResumeSection
              isActive={activeSection === 'experiences'}
              onSelect={(event) => {
                event.stopPropagation();
                onSelectSection('experiences');
              }}
              title="实习经历"
            >
              {visibleExperiences.map(renderExperienceEntry)}
            </ResumeSection>
          )}

          {visibleProjects.length > 0 && (
            <ResumeSection
              isActive={activeSection === 'projects'}
              onSelect={(event) => {
                event.stopPropagation();
                onSelectSection('projects');
              }}
              title="项目经历"
            >
              {visibleProjects.map(renderExperienceEntry)}
            </ResumeSection>
          )}

          {visibleSkills.length > 0 && (
            <section
              className={`${styles.resumeSection} ${activeSection === 'skills' ? styles.activeResumeBlock : ''}`}
              onClick={(event) => {
                event.stopPropagation();
                onSelectSection('skills');
              }}
            >
              <span className={styles.sectionTitle}>技能补充</span>
              <div className={styles.skillGrid}>
                {visibleSkills.map((skill) => (
                  <div className={styles.skillCard} key={skill.id}>
                    {skill.title && <strong>{skill.title}</strong>}
                    {skill.details.length > 0 && <span>{skill.details.join('，')}</span>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </article>
    </section>
  );
}
