import styles from './TarotFortunePage.module.css';

export default function FortuneSymbol() {
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" className={styles.hiddenSvg}>
      <defs>
        <linearGradient id="fortune-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f7e4a2" />
          <stop offset="48%" stopColor="#d6b45b" />
          <stop offset="100%" stopColor="#b88d2f" />
        </linearGradient>
        <symbol id="fortune-emblem" viewBox="0 0 256 256">
          <g fill="url(#fortune-gold)">
            <polygon points="128,8 141,42 115,42" />
            <polygon points="128,248 115,214 141,214" />
            <polygon points="8,128 42,115 42,141" />
            <polygon points="248,128 214,115 214,141" />
            <circle cx="128" cy="128" r="64" />
          </g>
          <path
            d="M168 76c-24 8-40 30-40 55 0 25 16 47 40 55-14 7-29 11-45 11-52 0-94-42-94-94s42-94 94-94c16 0 31 4 45 11z"
            fill="#f3d77b"
          />
          <path
            d="M136 76c-19 7-33 26-33 49 0 23 14 42 33 49-11 5-22 8-34 8-42 0-76-34-76-76s34-76 76-76c12 0 23 3 34 8z"
            fill="url(#fortune-gold)"
          />
        </symbol>
      </defs>
    </svg>
  );
}
