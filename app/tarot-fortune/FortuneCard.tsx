import styles from './TarotFortunePage.module.css';
import type { FortuneCardData, FortuneResult } from './fortuneData';

type FortuneCardProps = {
  card: FortuneCardData;
  faceUp: boolean;
  index: number;
  result: FortuneResult;
  onFlip: (index: number) => void;
};

export default function FortuneCard({ card, faceUp, index, result, onFlip }: FortuneCardProps) {
  return (
    <button
      aria-label={faceUp ? `第 ${index + 1} 张运势牌：${result.title}` : `翻开第 ${index + 1} 张运势牌`}
      aria-pressed={faceUp}
      className={`${styles.fortuneCard} ${faceUp ? `${styles.isPaused} ${styles.isFlipped}` : ''}`}
      onClick={() => onFlip(index)}
      type="button"
    >
      <span className={styles.flipShell}>
        <span className={styles.cardFace}>
          <span className={styles.cardInner}>
            <span className={styles.cardNumber}>{card.number}</span>
            <svg className={styles.cardMark} viewBox="0 0 256 256" aria-hidden="true">
              <circle cx="128" cy="128" r="45" fill="white" />
            </svg>
            <span className={styles.cardLabel}>{['行动','机会','状态'][index]}</span>
            <span className={styles.cardDescription}>{['从一个小而明确的投递开始','让好奇心带你多问一步','保留节奏，不急着比较'][index]}</span>
          </span>
        </span>
        <span className={`${styles.cardFace} ${styles.cardBack}`} aria-hidden={!faceUp}>
          <span className={styles.resultKicker}>今日求职运势</span>
          <h2 className={styles.resultTitle}>{result.title}</h2>
          <p className={styles.resultText}>{result.text}</p>
        </span>
      </span>
    </button>
  );
}
