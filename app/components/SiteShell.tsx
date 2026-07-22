import Link from 'next/link';
import shellStyles from './SiteShell.module.css';

type NavKey = 'photo' | 'resume' | 'qa' | 'fortune';

const navItems = [
  { key: 'photo', label: '证件照优化', href: '/id-photo-optimization-rebuilt' },
  { key: 'resume', label: '简历优化', href: '/template-library' },
  { key: 'qa', label: '提前问答', href: '/advance-qa' },
  { key: 'fortune', label: '运势占卜', href: '/tarot-fortune' },
] as const;

export function Particles() {
  return (
    <div className={shellStyles.particleField} aria-hidden="true">
      <span className={shellStyles.particle} />
      <span className={shellStyles.particle} />
      <span className={shellStyles.particle} />
      <span className={shellStyles.particle} />
      <span className={shellStyles.particle} />
      <span className={shellStyles.particle} />
      <span className={`${shellStyles.ambientGlow} ${shellStyles.glowOne}`} />
      <span className={`${shellStyles.ambientGlow} ${shellStyles.glowTwo}`} />
    </div>
  );
}

export default function SiteShell({
  active,
  actionHref = '/',
  actionLabel = '开始准备',
  wide = false,
  children,
}: {
  active?: NavKey;
  actionHref?: string;
  actionLabel?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className={shellStyles.root}>
      <Particles />
      <div className={`${shellStyles.page} ${wide ? shellStyles.widePage : ''}`}>
        <header className={shellStyles.siteHeader}>
          <Link className={shellStyles.brand} href="/">
            <span className={shellStyles.brandName}>Offer_GET</span>
            <span className={shellStyles.brandTagline}>大学生求职前准备工作台</span>
          </Link>
          <nav className={shellStyles.nav} aria-label="主导航">
            {navItems.map((item) => (
              <Link
                className={active === item.key ? shellStyles.activeNav : undefined}
                href={item.href}
                key={item.key}
              >
                {item.label}
              </Link>
            ))}
            <Link className={shellStyles.button} href={actionHref}>
              {actionLabel}
            </Link>
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}

export { shellStyles };
