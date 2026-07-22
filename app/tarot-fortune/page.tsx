'use client';

import { useMemo, useState } from 'react';
import SiteShell from '../components/SiteShell';
import FortuneCard from './FortuneCard';
import { cards, results } from './fortuneData';
import FortuneSymbol from './FortuneSymbol';
import styles from './TarotFortunePage.module.css';

export default function TarotFortunePage() {
  const [flipped, setFlipped] = useState<Array<number | null>>([null, null, null]);
  const spread = flipped.every((item) => item !== null);
  const remainingIndexes = useMemo(
    () => results.map((_, index) => index).filter((index) => !flipped.includes(index)),
    [flipped],
  );

  function flipCard(index: number) {
    if (flipped[index] !== null) return;
    const resultIndex = remainingIndexes[Math.floor(Math.random() * remainingIndexes.length)];
    setFlipped((current) => current.map((value, itemIndex) => (itemIndex === index ? resultIndex : value)));
  }

  return (
    <SiteShell active="fortune">
      <FortuneSymbol />
      <section className={styles.fortuneStage} aria-label="运势占卜翻牌互动">
        <div className={`${styles.cardField} ${spread ? styles.isSpread : ''}`} aria-label="运势占卜牌阵">
          <div className={styles.aura} aria-hidden="true" />
          {cards.map((card, index) => (
            <FortuneCard
              card={card}
              index={index}
              key={card.number}
              result={flipped[index] === null ? null : results[flipped[index] as number]}
              onFlip={flipCard}
            />
          ))}
          <p className={styles.fortuneNote}>点击三张牌，完成今日求职状态占卜。</p>
        </div>
      </section>
    </SiteShell>
  );
}
