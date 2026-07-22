import styles from './OnlineEditorPage.module.css';

export default function ResumeSection({
  title,
  children,
  isActive = false,
  onSelect,
}: {
  title: string;
  children: React.ReactNode;
  isActive?: boolean;
  onSelect?: (event: React.MouseEvent<HTMLElement>) => void;
}) {
  return (
    <section className={`${styles.resumeSection} ${isActive ? styles.activeResumeBlock : ''}`} onClick={onSelect}>
      <span className={styles.sectionTitle}>{title}</span>
      <div className={styles.timeline}>{children}</div>
    </section>
  );
}
