'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import SiteShell from '../components/SiteShell';
import { LOTS } from './lotsData';
import type { Motion } from './FortuneScene';
import styles from './TarotFortunePage.module.css';

const FortuneScene = dynamic(() => import('./FortuneScene'), { ssr: false });
const GUIDE_KEY = 'offerget-lots-guide-v1';

type MotionPermission = { requestPermission?: () => Promise<'granted' | 'denied'> };
const motionApi = () => (typeof window !== 'undefined' && 'DeviceMotionEvent' in window
  ? (window.DeviceMotionEvent as unknown as MotionPermission) : null);
const needsPermission = () => typeof motionApi()?.requestPermission === 'function';
// iPadOS 13+ 的 Safari 会伪装成 Mac,用触点数区分
const isIOS = () => typeof navigator !== 'undefined'
  && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
const isTouch = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

export default function LotsFortunePage() {
  const [round, setRound] = useState(0);
  const [drawn, setDrawn] = useState<number | null>(null);
  const [ready, setReady] = useState(false); // 签已拾起,可点击
  const [modalOpen, setModalOpen] = useState(false);
  const [sound, setSound] = useState(true);
  const [guide, setGuide] = useState(false);
  const [touch, setTouch] = useState(false);
  const [motionOn, setMotionOn] = useState(false);
  // 场景每个物理步直接读这个对象,不经过 React 状态,避免每次指针移动都重渲染
  const motion = useRef<Motion>({ energy: 0, pitch: null }).current;
  const lastPointer = useRef<{ x: number; y: number; t: number } | null>(null);
  const drag = useRef<{ id: number; y0: number; captured: boolean } | null>(null);
  const autoUntil = useRef(0);

  // 输入能量自然衰减:停止移动后签筒慢慢放下
  useEffect(() => {
    let raf = 0, prev = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(.1, (now - prev) / 1000); prev = now;
      if (now < autoUntil.current) {
        motion.energy = .85 + .15 * Math.sin(now / 90);
      } else {
        motion.energy *= Math.exp(-dt * 5);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [motion]);

  // 首次进入的引导;iOS 每次会话都要用户点一下才能读陀螺仪
  useEffect(() => {
    // iOS「摇动以撤销」:Safari 的撤销记录跟着整个文档走。从简历编辑、问答等页面经 Next 客户端路由
    // 进来时,之前的输入记录还在,一晃手机就会弹「撤销键入」。整页重新加载能清掉这份记录,
    // 所以在 iOS 上如果本页是客户端路由进入的(导航记录的 URL 不是本页),就原地重载一次。
    if (isIOS()) {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const entryPath = nav ? new URL(nav.name).pathname : window.location.pathname;
      if (entryPath !== window.location.pathname) { window.location.replace(window.location.href); return; }
    }
    (document.activeElement as HTMLElement | null)?.blur?.();
    setTouch(isTouch());
    let seen = false;
    try { seen = window.localStorage.getItem(GUIDE_KEY) === '1'; } catch { /* 隐私模式 */ }
    if (!seen) setGuide(true);
    else if (!needsPermission()) setMotionOn(true);
  }, []);

  // 手机晃动 → 摇动能量
  useEffect(() => {
    if (!motionOn) return;
    // 以角速度(手腕前后摇)为主、线性加速度为辅,门槛都压低:轻摇就能出签。
    // iOS「摇动以撤销」由剧烈的线性甩动触发,网页无法关闭,只能让用户不必用力甩。
    const onMotion = (e: DeviceMotionEvent) => {
      const r = e.rotationRate, a = e.acceleration;
      const rot = r ? Math.hypot(r.alpha ?? 0, r.beta ?? 0, r.gamma ?? 0) : 0; // °/s
      const acc = a && a.x !== null ? Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0) : 0; // m/s²,已去重力
      // 角速度 50°/s 起算、220°/s 满;加速度 1 m/s² 起算、5 m/s² 满
      const speed = Math.min(1, Math.max(0, (rot - 50) / 170, (acc - 1) / 4));
      if (speed > motion.energy) motion.energy = speed;
    };
    window.addEventListener('devicemotion', onMotion);
    return () => window.removeEventListener('devicemotion', onMotion);
  }, [motionOn, motion]);

  const finishGuide = useCallback(async (useMotion: boolean) => {
    try { window.localStorage.setItem(GUIDE_KEY, '1'); } catch { /* ignore */ }
    setGuide(false);
    if (!useMotion) return;
    const api = motionApi();
    if (!api) return;
    if (typeof api.requestPermission !== 'function') { setMotionOn(true); return; }
    try { setMotionOn(await api.requestPermission() === 'granted'); } catch { setMotionOn(false); }
  }, []);

  // 按住拖动 = 前后摇:往下拖筒口朝你俯下,往上拖抬起;拖得越快摇得越猛
  const handlePointerDown = (e: React.PointerEvent<HTMLElement>) => {
    if (drawn !== null) return; // 签已出筒:不再拖动,让点击直接落到签上
    if (e.pointerType === 'touch' && motionOn) return; // 手机上以晃动为准
    drag.current = { id: e.pointerId, y0: e.clientY, captured: false };
    lastPointer.current = { x: e.clientX, y: e.clientY, t: performance.now() };
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    // 只有真正拖动起来(超过 6px)才捕获指针。一按下就捕获的话,click 会被重定向到外层容器,
    // 3D 场景里的签就收不到点击了。
    if (!d.captured) {
      if (Math.abs(e.clientY - d.y0) < 6) return;
      d.captured = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const now = performance.now(), prev = lastPointer.current;
    lastPointer.current = { x: e.clientX, y: e.clientY, t: now };
    const box = e.currentTarget.getBoundingClientRect();
    // 拖动 1/4 画面高度即满幅
    motion.pitch = Math.max(-1, Math.min(1, (e.clientY - d.y0) / (box.height * .25)));
    if (!prev) return;
    const v = Math.abs(e.clientY - prev.y) / Math.max(8, now - prev.t); // px/ms
    const speed = Math.min(1, Math.max(0, (v - .15) / 1.4));
    if (speed > motion.energy) motion.energy = speed;
  };
  const endDrag = (e: React.PointerEvent<HTMLElement>) => {
    if (drag.current?.id !== e.pointerId) return;
    drag.current = null; lastPointer.current = null; motion.pitch = null;
  };

  // 签蹦出时震一下。iOS Safari 不支持 Vibration API,navigator.vibrate 不存在,直接跳过
  const buzz = () => { try { navigator.vibrate?.(60); } catch { /* ignore */ } };

  const restart = () => {
    autoUntil.current = 0;
    motion.energy = 0; motion.pitch = null;
    lastPointer.current = null; drag.current = null;
    setModalOpen(false); setDrawn(null); setReady(false);
    setRound(v => v + 1);
  };

  const lot = drawn === null ? null : LOTS[drawn];
  const hint = ready ? '点击签身查看签文'
    : drawn !== null ? '签已出筒'
      : touch ? (motionOn ? '轻轻前后摇手机' : '按住画面上下来回滑动摇签') : '按住鼠标上下来回拖动摇签';

  return <SiteShell active="fortune" wide>
    <div className={styles.page} aria-label="求职摇签">
      <section className={styles.stage} aria-label="摇动签筒"
        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <FortuneScene key={round} motion={motion} sound={sound} hidden={modalOpen || guide}
          onFling={buzz} onEscape={id => setDrawn(id)} onLand={() => setReady(true)} onOpen={() => setModalOpen(true)} />
      </section>
      <p className={styles.hint} aria-live="polite">{hint}</p>
      <div className={styles.controls}>
        {drawn === null
          ? <button type="button" onClick={() => { autoUntil.current = performance.now() + 4500; }} aria-label="帮我摇签" title="帮我摇签">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M8 9h8l-1 12H9L8 9ZM10 9V3M12 9V2M14 9V4M4 12l-1.5 2L4 16M20 12l1.5 2L20 16" /></svg>
          </button>
          : <button type="button" disabled={!ready} onClick={() => setModalOpen(true)} aria-label="查看签文" title="查看签文">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M6 3h9l3 3v15H6zM15 3v4h3M9 12h6M9 16h5" /></svg>
          </button>}
        <button type="button" onClick={restart} aria-label="重新摇签" title="重新摇签">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M20 10a8 8 0 1 0 1 5M20 4v6h-6" /></svg>
        </button>
        {touch && !motionOn && <button type="button" onClick={() => void finishGuide(true)} aria-label="开启晃动摇签" title="开启晃动摇签">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="8" y="3" width="8" height="18" rx="2" /><path d="M4 8c-1 2.5-1 5.5 0 8M20 8c1 2.5 1 5.5 0 8" /></svg>
        </button>}
        <button type="button" onClick={() => setSound(v => !v)} aria-label={sound ? '关闭声音' : '开启声音'} title={sound ? '关闭声音' : '开启声音'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" />{sound ? <path d="M16 8c2 2 2 6 0 8M19 5c4 4 4 10 0 14" /> : <path d="m17 9 5 6m0-6-5 6" />}</svg>
        </button>
      </div>
      {modalOpen && lot && <div className={styles.modalBackdrop} onClick={() => setModalOpen(false)}>
        <section className={styles.paper} role="dialog" aria-modal="true" aria-label="求职签文" onClick={e => e.stopPropagation()}>
          <button className={styles.close} type="button" aria-label="关闭签文" onClick={() => setModalOpen(false)}>×</button>
          <span className={styles.paperKicker}>第 {String(lot.id).padStart(2, '0')} 签 · {lot.type}</span>
          <div className={styles.verse}>{lot.verse.map((line, i) => <p key={i}>{line}</p>)}</div>
          <div className={styles.paperRule} />
          <p className={styles.paperLabel}>解签</p>
          <p className={styles.paperText}>{lot.reading}</p>
          <button className={styles.paperAction} type="button" onClick={restart}>再摇一签</button>
        </section>
      </div>}
      {guide && <div className={styles.modalBackdrop}>
        <section className={styles.paper} role="dialog" aria-modal="true" aria-labelledby="lots-guide-title">
          <h2 id="lots-guide-title">求签之前</h2>
          <p className={styles.paperText}>心里默念想问的求职问题。{touch
            ? '像握签筒那样,手腕带着手机轻轻前后摇,不用用力甩,签筒会跟着摇,直到一支签从筒口蹦出来。'
            : '按住鼠标上下来回拖动,签筒会跟着前后摇,直到一支签从筒口蹦出来。'}签会自动拾起,点击签身即可查看签文。</p>
          {touch && <p className={styles.paperNote}>晃动需要读取手机的运动传感器,仅在本页使用,不会上传。iPhone 用力甩可能弹出系统的「撤销」提示,点「取消」即可;轻摇一般不会触发,也可在 设置 › 辅助功能 › 触控 中关闭「摇动以撤销」。</p>}
          <button className={styles.paperAction} type="button" onClick={() => void finishGuide(touch)}>{touch ? '允许晃动,开始求签' : '开始求签'}</button>
          {touch && <button className={styles.paperSecondary} type="button" onClick={() => void finishGuide(false)}>不用晃动,用手指滑动</button>}
        </section>
      </div>}
    </div>
  </SiteShell>;
}
