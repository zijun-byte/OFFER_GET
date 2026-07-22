import styles from './TarotFortunePage.module.css';
import type { FortuneCardData, FortuneResult } from './fortuneData';

type FortuneCardProps = {
  card: FortuneCardData;
  index: number;
  result: FortuneResult | null;
  onFlip: (index: number) => void;
};

export default function FortuneCard({ card, index, result, onFlip }: FortuneCardProps) {
  return (
    <button
      aria-label={result ? `第 ${index + 1} 张运势牌：${result.title}` : `翻开第 ${index + 1} 张运势牌`}
      aria-pressed={Boolean(result)}
      className={`${styles.fortuneCard} ${result ? `${styles.isPaused} ${styles.isFlipped}` : ''}`}
      onClick={() => onFlip(index)}
      type="button"
    >
      <span className={styles.flipShell}>
        <span className={styles.cardFace}>
          <span className={styles.cardInner}>
            <span className={styles.cardNumber}>{card.number}</span>
            <svg className={styles.cardMark} viewBox="0 0 256 256" aria-hidden="true">
              <use href="#fortune-emblem" />
            </svg>
            <span className={styles.cardLabel}>{card.label}</span>
          </span>
        </span>
        <span className={`${styles.cardFace} ${styles.cardBack}`}>
          <span className={styles.resultKicker}>CAREER ORACLE</span>
          <h2 className={styles.resultTitle}>{result?.title}</h2>
          <p className={styles.resultText}>{result?.text}</p>
        </span>
      </span>
      <span className={styles.cardStatus}>正在翻牌</span>
    </button>
  );
}
