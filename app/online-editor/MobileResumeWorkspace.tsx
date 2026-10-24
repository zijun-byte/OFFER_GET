'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import styles from './MobileResume.module.css';
import brandStyles from '../components/SiteShell.module.css';

export default function MobileResumeWorkspace({ messages, complete, busy, error, preview, composer, saveStatus, step, totalSteps }: {
  messages: Array<{ id: string; role: 'agent' | 'user'; content: string }>;
  complete: boolean; busy: boolean; error: string; preview: ReactNode; composer: ReactNode; saveStatus: string; step: number; totalSteps: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState(false);
  useEffect(() => {
    const viewport = window.visualViewport;
    const sync = () => {
      if (!root.current) return;
      root.current.style.top = `${viewport?.offsetTop || 0}px`;
      root.current.style.height = `${viewport?.height || window.innerHeight}px`;
      root.current.dataset.keyboard = String(!!viewport && window.innerHeight - viewport.height > 150);
    };
    sync();
    viewport?.addEventListener('resize', sync); viewport?.addEventListener('scroll', sync);
    window.addEventListener('resize', sync);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { viewport?.removeEventListener('resize', sync); viewport?.removeEventListener('scroll', sync); window.removeEventListener('resize', sync); document.body.style.overflow = oldOverflow; };
  }, []);
  useEffect(() => {
    const container = conversation.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages.length, busy, history]);

  return <div ref={root} className={styles.workspace}>
    <header className={styles.header}>
      <a href="/template-library" aria-label="返回模板库">‹</a>
      <span className={brandStyles.brandName}>Offer <span className={brandStyles.brandAccent}>GET</span></span>
      <span className={styles.spacer} />
      {complete && <button type="button" onClick={() => setHistory(!history)}>{history ? '简历' : '记录'}</button>}
      {complete && <button className={styles.iconButton} type="button" aria-label="下载简历 PDF" onClick={() => { setHistory(false); requestAnimationFrame(() => window.print()); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 18v3h14v-3" /></svg></button>}
    </header>
    {complete && !history ? <div className={styles.resumeArea}>{preview}</div> : <div className={styles.conversation} ref={conversation} aria-label="简历问答记录">
      {messages.map((message, index) => <div key={message.id} className={`${styles.message} ${message.role === 'user' ? styles.userMessage : styles.agentMessage}`}>
        {message.role === 'agent' && <span className={styles.author}>Offer GET</span>}
        <div className={styles.bubble}>
        <MessageText text={message.content} collapsible={message.role === 'user'} />
        </div>
        {message.role === 'agent' && index === messages.length - 1 && !complete && <div className={styles.progress} role="progressbar" aria-label="问答进度" aria-valuemin={0} aria-valuemax={totalSteps} aria-valuenow={step + 1}>{Array.from({ length: totalSteps }, (_, i) => <span key={i} data-active={i <= step} />)}</div>}
      </div>)}
      {busy && <p className={styles.thinking} role="status">正在整理你的回答<span>…</span></p>}
    </div>}
    <footer className={styles.footer}>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {composer}
      {saveStatus && <small className={styles.saveStatus} role="status">{saveStatus}</small>}
    </footer>
  </div>;
}

function MessageText({ text, collapsible }: { text: string; collapsible: boolean }) {
  const node = useRef<HTMLParagraphElement>(null);
  const [more, setMore] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const element = node.current;
    if (!element || !collapsible) return;
    const observer = new ResizeObserver(() => {
      if (!expanded) setMore(element.scrollHeight > element.clientHeight + 2);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [collapsible, expanded, text]);
  return <><p ref={node} className={collapsible && !expanded ? styles.clamped : ''}>{text}</p>{more && <button className={styles.textButton} type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? '收起' : '显示更多'}</button>}</>;
}

export function MobileSheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    const previous = document.activeElement as HTMLElement | null;
    node.showModal();
    const resize = () => {
      node.style.maxHeight = `${Math.max(160, (window.visualViewport?.height || window.innerHeight) - 24)}px`;
    };
    resize(); window.visualViewport?.addEventListener('resize', resize);
    return () => { node.close(); window.visualViewport?.removeEventListener('resize', resize); if (previous?.isConnected && !previous.matches('textarea,input')) previous.focus(); };
  }, []);
  return <dialog ref={dialog} className={styles.dialog} aria-label={label} onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className={styles.sheetPanel}><button type="button" onClick={onClose} autoFocus>完成</button>{children}</section>
  </dialog>;
}
