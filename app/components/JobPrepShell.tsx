import Link from 'next/link';
import styles from './JobPrepShell.module.css';

const navItems = [
  { label: '证件照优化', href: '/id-photo-optimization-rebuilt', key: 'photo' },
  { label: '简历优化', href: '/resume-optimization', key: 'resume' },
  { label: '提前问答', href: '/advance-qa', key: 'qa' },
  { label: '运势占卜', href: '/tarot-fortune', key: 'fortune' },
] as const;

type JobPrepShellProps = {
  actionHref?: string;
  actionLabel?: string;
  active?: (typeof navItems)[number]['key'];
  children: React.ReactNode;
};

export default function JobPrepShell({
  actionHref = '/',
  actionLabel = '开始准备',
  active = 'qa',
  children,
}: JobPrepShellProps) {
  return (
    <main className={styles.root}>
      <div className={styles.particleField} aria-hidden="true">
        <span className={styles.particle} />
        <span className={styles.particle} />
        <span className={styles.particle} />
        <span className={styles.particle} />
        <span className={styles.particle} />
        <span className={styles.particle} />
        <span className={`${styles.ambientGlow} ${styles.glowOne}`} />
        <span className={`${styles.ambientGlow} ${styles.glowTwo}`} />
      </div>

      <div className={styles.page}>
        <header className={styles.siteHeader}>
          <Link className={styles.brand} href="/">
            <span className={styles.brandName}>Offer_GET</span>
            <span className={styles.brandTagline}>大学生求职前准备工作台</span>
          </Link>

          <nav className={styles.nav} aria-label="主导航">
            {navItems.map((item) => (
              <Link className={active === item.key ? styles.activeNav : undefined} href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
            <Link className={styles.button} href={actionHref}>
              {actionLabel}
            </Link>
          </nav>
        </header>

        {children}
      </div>
    </main>
  );
}
