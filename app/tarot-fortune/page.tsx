'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import SiteShell from '../components/SiteShell';
import { results } from './fortuneData';
import styles from './TarotFortunePage.module.css';

const FortuneScene = dynamic(() => import('./FortuneScene'), { ssr: false });

export default function TarotFortunePage() {
  const [round, setRound] = useState(0);
  const [drawn, setDrawn] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [motion, setMotion] = useState({ x: 0, z: 0, px: 0, pz: 0, energy: 0 });
  const [sound, setSound] = useState(true);
  const last = useRef<{ x: number; y: number; time: number } | null>(null);
  const assisted = useRef<number | undefined>(undefined);
  const roundResult = useRef(0);

  useEffect(() => { roundResult.current = Math.floor(Math.random() * results.length); }, [round]);
  useEffect(() => () => window.clearInterval(assisted.current), []);
  useEffect(() => {
    if (motion.energy === 0) return;
    const timer = window.setTimeout(() => setMotion(current => ({ ...current, x: 0, z: 0, energy: 0 })), 110);
    return () => window.clearTimeout(timer);
  }, [motion]);

  const handleMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const now = performance.now();
    const previous = last.current;
    last.current = { x: event.clientX, y: event.clientY, time: now };
    if (!previous) return;
    const elapsed = Math.max(16, now - previous.time);
    const dx = Math.max(-1, Math.min(1, (event.clientX - previous.x) / elapsed / .8));
    const dy = Math.max(-1, Math.min(1, (event.clientY - previous.y) / elapsed / .8));
    const bounds = event.currentTarget.getBoundingClientRect();
    const px = Math.max(-.4, Math.min(.4, ((event.clientX - bounds.left) / bounds.width * 2 - 1) * .4));
    const pz = Math.max(-.18, Math.min(.18, ((event.clientY - bounds.top) / bounds.height * 2 - 1) * .18));
    setMotion({ x: drawn === null ? dy : 0, z: drawn === null ? -dx : 0, px, pz, energy: drawn === null ? Math.min(1, Math.hypot(dx, dy)) : 0 });
  }, [drawn]);

  function restart() {
    window.clearInterval(assisted.current);
    assisted.current = undefined;
    setOpen(false); setDrawn(null); setMotion({ x: 0, z: 0, px: 0, pz: 0, energy: 0 });
    last.current = null;
    setRound(value => value + 1);
  }

  function shakeByButton() {
    window.clearInterval(assisted.current);
    let step = 0;
    assisted.current = window.setInterval(() => {
      step += 1;
      setMotion({ x: Math.sin(step * 2.2) * .9, z: Math.cos(step * 2.2) * .9, px: Math.sin(step * 2.2) * .12, pz: Math.cos(step * 2.2) * .07, energy: 1 });
      if (step >= 30) { window.clearInterval(assisted.current); assisted.current = undefined; }
    }, 100);
  }

  const result = drawn === null ? null : results[roundResult.current];
  return <SiteShell active="fortune" wide>
    <div className={styles.page} aria-label="求职摇签">
    <section className={styles.stage} aria-label="摇动签筒" onPointerMove={handleMove} onPointerLeave={() => { last.current = null; setMotion({ x: 0, z: 0, px: 0, pz: 0, energy: 0 }); }}>
      <FortuneScene key={round} motion={motion} sound={sound} onDraw={setDrawn} onOpen={() => setOpen(true)} />
    </section>
    <div className={styles.controls}>
      <button type="button" onClick={drawn === null ? shakeByButton : () => setOpen(true)} aria-label={drawn === null ? '帮我摇签' : '查看签文'} title={drawn === null ? '帮我摇签' : '查看签文'}>
        {drawn === null ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M9 3h6M7 8h10l-1 12H8L7 8ZM9 8V5h6v3M3 11l-1 2 1 2M21 11l1 2-1 2" /></svg> : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M6 3h9l3 3v15H6zM15 3v4h3M9 12h6M9 16h5" /></svg>}
      </button>
      <button type="button" onClick={restart} aria-label="重新摇签" title="重新摇签"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M20 10a8 8 0 1 0 1 5M20 4v6h-6" /></svg></button>
      <button type="button" onClick={() => setSound(value => !value)} aria-label={sound ? '关闭声音' : '开启声音'} title={sound ? '关闭声音' : '开启声音'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" />{sound ? <path d="M16 8c2 2 2 6 0 8M19 5c4 4 4 10 0 14" /> : <path d="m17 9 5 6m0-6-5 6" />}</svg></button>
    </div>
    {open && result && <div className={styles.modalBackdrop} onClick={() => setOpen(false)}>
      <section className={styles.paper} role="dialog" aria-modal="true" aria-label="求职签文" onClick={event => event.stopPropagation()}>
        <button className={styles.close} type="button" aria-label="关闭签文" onClick={() => setOpen(false)}>×</button>
        <span className={styles.paperKicker}>第 {String(drawn! + 1).padStart(2, '0')} 签</span>
        <h2>{result.title}</h2>
        <p className={styles.verse}>{result.verse}</p>
        <div className={styles.paperRule} />
        <p className={styles.paperText}>{result.text}</p>
        <button className={styles.paperAction} type="button" onClick={restart}>再摇一签</button>
      </section>
    </div>}
    </div>
  </SiteShell>;
}
