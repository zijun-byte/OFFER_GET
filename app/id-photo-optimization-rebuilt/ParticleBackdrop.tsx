import type { CSSProperties } from 'react';
import styles from './IdPhotoPage.module.css';
import { particles } from './idPhotoContent';

export default function ParticleBackdrop() {
  return (
    <div className={styles.particles} aria-hidden="true">
      {particles.map(([size, x, y, color, dx, dy, duration, delay]) => (
        <span
          className={styles.particle}
          key={`${x}-${y}`}
          style={
            {
              '--s': size,
              '--x': x,
              '--y': y,
              '--c': color,
              '--dx': dx,
              '--dy': dy,
              '--d': duration,
              '--delay': delay,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
