'use client';

import { useEffect, useRef, useState } from 'react';
import SiteShell from '../components/SiteShell';
import FortuneCard from './FortuneCard';
import { cards, results } from './fortuneData';
import FortuneSymbol from './FortuneSymbol';
import styles from './TarotFortunePage.module.css';

// Matches the .flipShell transition in TarotFortunePage.module.css.
const FLIP_MS = 640;

function shuffledResults(count: number) {
  const pool = [...results.keys()];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export default function TarotFortunePage() {
  // Which result each card holds. Starts deterministic so server and client HTML match;
  // the real shuffle happens on the first flip. Kept while cards turn back so text doesn't blank mid-flip.
  const [assigned, setAssigned] = useState<number[]>(() => cards.map((_, i) => i));
  const [faceUp, setFaceUp] = useState<boolean[]>(() => cards.map(() => false));
  const [redrawing, setRedrawing] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const allUp = faceUp.every(Boolean);
  const anyUp = faceUp.some(Boolean);

  function flipCard(index: number) {
    if (faceUp[index] || redrawing) return;
    if (!anyUp) setAssigned(shuffledResults(cards.length));
    setFaceUp((current) => current.map((value, i) => (i === index ? true : value)));
  }

  function handleDraw() {
    if (redrawing) return;
    if (!anyUp) {
      setAssigned(shuffledResults(cards.length));
      setFaceUp(cards.map(() => true));
      return;
    }
    // Turn every card back first, then deal a fresh spread once they're face down.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setRedrawing(true);
    setFaceUp(cards.map(() => false));
    timer.current = window.setTimeout(() => {
      setAssigned(shuffledResults(cards.length));
      setFaceUp(cards.map(() => true));
      setRedrawing(false);
    }, reduce ? 0 : FLIP_MS + 80);
  }

  return (
    <SiteShell active="fortune">
      <FortuneSymbol />
      <section className={styles.fortuneStage} aria-label="运势占卜翻牌互动">
        <div className={`${styles.cardField} ${allUp ? styles.isSpread : ''}`} aria-label="运势占卜牌阵">
          <div className={styles.aura} aria-hidden="true" />
          {cards.map((card, index) => (
            <FortuneCard
              card={card}
              faceUp={faceUp[index]}
              index={index}
              key={card.number}
              result={results[assigned[index]]}
              onFlip={flipCard}
            />
          ))}
        </div>
        <div className={styles.drawActions}>
          <button disabled={redrawing} onClick={handleDraw} type="button">
            {redrawing ? '正在洗牌…' : anyUp ? '重新抽取' : '一次翻开三张'}
          </button>
          <p>{anyUp ? '今日主题：相信准备，也相信时机。' : '点任意一张牌翻开，或一次翻开三张。'}</p>
        </div>
      </section>
    </SiteShell>
  );
}
