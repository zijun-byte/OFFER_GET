import Link from 'next/link';
import StarBorder from './components/StarBorder';
import styles from './HomePage.module.css';

const particles = [
  {
    x: '13%',
    y: '23%',
    size: '8px',
    color: 'rgba(137,216,196,.55)',
    dx: '18px',
    dy: '-16px',
    duration: '14s',
    delay: '-3s',
  },
  {
    x: '22%',
    y: '68%',
    size: '11px',
    color: 'rgba(238,176,185,.42)',
    dx: '-14px',
    dy: '20px',
    duration: '16s',
    delay: '-7s',
  },
  {
    x: '47%',
    y: '18%',
    size: '7px',
    color: 'rgba(255,232,102,.46)',
    dx: '12px',
    dy: '18px',
    duration: '12s',
    delay: '-4s',
  },
  {
    x: '71%',
    y: '30%',
    size: '10px',
    color: 'rgba(143,215,171,.48)',
    dx: '-18px',
    dy: '14px',
    duration: '18s',
    delay: '-8s',
  },
  {
    x: '82%',
    y: '72%',
    size: '9px',
    color: 'rgba(255,185,86,.34)',
    dx: '16px',
    dy: '-18px',
    duration: '15s',
    delay: '-5s',
  },
  {
    x: '91%',
    y: '18%',
    size: '6px',
    color: 'rgba(151,207,236,.38)',
    dx: '-12px',
    dy: '16px',
    duration: '13s',
    delay: '-2s',
  },
];

const entries = [
  { label: '证件照优化', href: '/id-photo-optimization-rebuilt' },
  { label: '简历优化', href: '/template-library' },
  { label: '提前问答', href: '/advance-qa' },
  { label: '运势占卜', href: '/tarot-fortune' },
];

export default function Home() {
  return (
    <main className={styles.home} aria-labelledby="page-title">
      <div className={styles.overlay} aria-hidden="true" />
      <div className={styles.particles} aria-hidden="true">
        {particles.map((particle) => (
          <span
            className={styles.particle}
            key={`${particle.x}-${particle.y}`}
            style={
              {
                '--x': particle.x,
                '--y': particle.y,
                '--s': particle.size,
                '--c': particle.color,
                '--dx': particle.dx,
                '--dy': particle.dy,
                '--d': particle.duration,
                '--delay': particle.delay,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <section className={styles.content}>
        <h1 className={styles.title} id="page-title" aria-label="Offer_GET">
          <span className={styles.titlePart}>Offer</span>
          <span className={styles.titlePart}>GET</span>
        </h1>

        <nav className={styles.entryRow} aria-label="四个功能入口">
          {entries.map((entry) => (
            <Link className={styles.entry} href={entry.href} key={entry.href}>
              <StarBorder
                as="span"
                className={styles.entryStarBorder}
                color="#f8fff4"
                speed="4.8s"
                thickness={2}
              >
                <span className={styles.entryInner}>{entry.label}</span>
              </StarBorder>
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}
