import Link from 'next/link';
import BlobCursor from './components/BlobCursor';
import styles from './HomePage.module.css';

const entries = [
  {
    key: 'photo',
    label: '证件照优化',
    copy: '上传一张正面照，换底色、调风格，按简历或一寸二寸尺寸导出。',
    href: '/id-photo-optimization-rebuilt',
  },
  {
    key: 'resume',
    label: '简历优化',
    copy: '挑一个模板，问答或粘贴旧简历，在线改到满意再导出。',
    href: '/template-library',
  },
  {
    key: 'qa',
    label: '提前问答',
    copy: '填公司、岗位和经历，提前拆解面试会追问的点。',
    href: '/advance-qa',
  },
  {
    key: 'fortune',
    label: '运势占卜',
    copy: '投递前抽一张牌，换个心情，顺便拿一条小建议。',
    href: '/tarot-fortune',
  },
] as const;

function EntryArt({ name }: { name: (typeof entries)[number]['key'] }) {
  if (name === 'photo') {
    return (
      <svg viewBox="0 0 80 64" aria-hidden="true">
        <rect x="18" y="6" width="44" height="52" rx="8" fill="#e3f4ea" />
        <circle cx="40" cy="26" r="9" fill="#10a866" />
        <path d="M24 52c3-9 9-13 16-13s13 4 16 13" fill="#10a866" />
        <rect x="10" y="44" width="16" height="16" rx="5" fill="#d4f25c" />
      </svg>
    );
  }
  if (name === 'resume') {
    return (
      <svg viewBox="0 0 80 64" aria-hidden="true">
        <rect x="16" y="4" width="40" height="54" rx="6" fill="#fff" stroke="#c4d6cb" strokeWidth="2" />
        <rect x="23" y="13" width="18" height="5" rx="2.5" fill="#0f2a20" />
        <rect x="23" y="24" width="26" height="9" rx="3" fill="#d4f25c" />
        <rect x="23" y="38" width="26" height="3" rx="1.5" fill="#c4d6cb" />
        <rect x="23" y="45" width="18" height="3" rx="1.5" fill="#c4d6cb" />
        <circle cx="60" cy="48" r="10" fill="#10a866" />
        <path d="M55.5 48l3 3 6-6" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === 'qa') {
    return (
      <svg viewBox="0 0 80 64" aria-hidden="true">
        <path d="M10 10h40a6 6 0 016 6v16a6 6 0 01-6 6H24l-10 8v-8h-4a6 6 0 01-6-6V16a6 6 0 016-6z" fill="#efebff" />
        <circle cx="20" cy="24" r="3" fill="#6c4cf5" />
        <circle cx="30" cy="24" r="3" fill="#6c4cf5" />
        <circle cx="40" cy="24" r="3" fill="#6c4cf5" />
        <path d="M36 32h30a6 6 0 016 6v10a6 6 0 01-6 6h-2v7l-9-7H36a6 6 0 01-6-6V38a6 6 0 016-6z" fill="#10a866" />
        <rect x="38" y="40" width="22" height="4" rx="2" fill="#d4f25c" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 80 64" aria-hidden="true">
      <rect x="10" y="12" width="26" height="40" rx="5" fill="#0f2a20" transform="rotate(-10 23 32)" />
      <rect x="44" y="12" width="26" height="40" rx="5" fill="#0f2a20" transform="rotate(10 57 32)" />
      <rect x="27" y="6" width="26" height="42" rx="5" fill="#fff" stroke="#c4d6cb" strokeWidth="2" />
      <path d="M40 15l2.6 7.4L50 25l-7.4 2.6L40 35l-2.6-7.4L30 25l7.4-2.6z" fill="#d4f25c" stroke="#10a866" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className={styles.home} aria-labelledby="page-title">
      <BlobCursor />
      <div className={styles.overlay} aria-hidden="true" />

      <section className={styles.content}>
        <h1 className={styles.title} id="page-title" aria-label="Offer GET">
          <span className={styles.titleOffer} aria-hidden="true">Offer</span>
          <span className={styles.titleGet} aria-hidden="true">
            GET
            <span className={styles.titleMarker} />
          </span>
        </h1>
        <p className={styles.lede}>求职前的四件小事，在这里一次准备好。</p>

        <nav className={styles.entryRow} aria-label="四个功能入口">
          {entries.map((entry, index) => (
            <Link
              className={styles.entry}
              href={entry.href}
              key={entry.href}
              style={{ '--i': index } as React.CSSProperties}
            >
              <span className={styles.entryArt}>
                <EntryArt name={entry.key} />
              </span>
              <span className={styles.entryLabel}>{entry.label}</span>
              <span className={styles.entryCopy}>{entry.copy}</span>
              <span className={styles.entryGo} aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}
