import { useId } from 'react';
import styles from './PhotoMascot.module.css';

export default function PhotoMascot() {
  const id = useId().replace(/:/g, '');
  const art = '/assets/offer-get-mascot.png';
  return <svg className={styles.mascot} viewBox="220 60 850 1050" aria-hidden="true">
    <defs>
      <radialGradient id={`${id}-face`}><stop stopColor="#f1ffff" /><stop offset="1" stopColor="#d7f5ff" /></radialGradient>
      <mask id={`${id}-body`}><rect width="1278" height="1230" fill="white" /><ellipse cx="578" cy="865" rx="49" ry="79" fill="black" /><ellipse cx="759" cy="835" rx="48" ry="78" fill="black" /></mask>
      <clipPath id={`${id}-left`}><ellipse cx="578" cy="865" rx="36" ry="70" /></clipPath>
      <clipPath id={`${id}-right`}><ellipse cx="759" cy="835" rx="36" ry="70" /></clipPath>
    </defs>
    <image href={art} width="1278" height="1230" mask={`url(#${id}-body)`} />
    <ellipse cx="578" cy="865" rx="50" ry="80" fill={`url(#${id}-face)`} />
    <ellipse cx="759" cy="835" rx="49" ry="79" fill={`url(#${id}-face)`} />
    <g className={styles.gaze}>
      <image href={art} width="1278" height="1230" clipPath={`url(#${id}-left)`} />
      <image href={art} width="1278" height="1230" clipPath={`url(#${id}-right)`} />
    </g>
  </svg>;
}
