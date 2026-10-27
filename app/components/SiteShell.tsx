import Link from 'next/link';
import shellStyles from './SiteShell.module.css';

type NavKey = 'photo' | 'resume' | 'qa' | 'fortune';

const navItems = [
  { key: 'photo', label: '证件照优化', href: '/id-photo-optimization-rebuilt' },
  { key: 'resume', label: '简历优化', href: '/template-library' },
  { key: 'qa', label: '提前问答', href: '/advance-qa' },
  { key: 'fortune', label: '求职摇签', href: '/tarot-fortune' },
] as const;

/** 18px line icons, one per tool. Stroke uses currentColor so the selected state can recolor them. */
function NavIcon({ name }: { name: NavKey | 'home' }) {
  const common = {
    className: shellStyles.sideIcon,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (name === 'photo') {
    return (
      <svg {...common}>
        <rect x="4" y="3" width="16" height="18" rx="3" />
        <circle cx="12" cy="10" r="3" />
        <path d="M7.5 18c.9-2.2 2.5-3.3 4.5-3.3s3.6 1.1 4.5 3.3" />
      </svg>
    );
  }
  if (name === 'resume') {
    return (
      <svg {...common}>
        <path d="M6 3h8l4 4v14H6z" />
        <path d="M14 3v4h4M9 12h6M9 16h4" />
      </svg>
    );
  }
  if (name === 'qa') {
    return (
      <svg {...common}>
        <path d="M4 5h16v11H9l-5 4z" />
        <path d="M9 10h6" />
      </svg>
    );
  }
  if (name === 'fortune') {
    return (
      <svg {...common}>
        <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
        <path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M4 11l8-7 8 7" />
      <path d="M6 10v10h12V10" />
    </svg>
  );
}

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
  wide = false,
  children,
}: {
  active?: NavKey;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className={shellStyles.root}>
      <aside className={shellStyles.sidebar}>
        <p className={shellStyles.sidebarTitle}>我的工作台</p>
        <nav className={shellStyles.sideNav} aria-label="功能导航">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={active === item.key ? 'page' : undefined}
              className={`${shellStyles.sideLink} ${active === item.key ? shellStyles.selectedSide : ''}`}
            >
              <NavIcon name={item.key} />
              <span className={shellStyles.sideLabel}>{item.label}</span>
            </Link>
          ))}
        </nav>
        <Link href="/" className={shellStyles.homeLink}>
          <NavIcon name="home" />
          返回首页
        </Link>
      </aside>
      <nav className={shellStyles.mobileNav} aria-label="功能导航（小屏）">
        {navItems.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            aria-label={item.label}
            aria-current={active === item.key ? 'page' : undefined}
            title={item.label}
          >
            <NavIcon name={item.key} />
            <span className={shellStyles.mobileNavLabel}>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className={`${shellStyles.page} ${wide ? shellStyles.widePage : ''}`}>
        <header className={shellStyles.siteHeader}>
          <Link className={shellStyles.brand} href="/">
            <span className={shellStyles.brandName}>
              Offer <span className={shellStyles.brandAccent}>GET</span>
            </span>
            <span className={shellStyles.brandTagline}>
              {navItems.find((item) => item.key === active)?.label || '求职工作台'}
            </span>
          </Link>
          <Link className={shellStyles.accountLink} href="/user-center" aria-label="打开用户中心" title="用户中心">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="3.2" />
              <path d="M5.5 19c.5-3.4 2.7-5.2 6.5-5.2s6 1.8 6.5 5.2" />
            </svg>
          </Link>
        </header>
        {children}
      </div>
    </main>
  );
}

export { shellStyles };
