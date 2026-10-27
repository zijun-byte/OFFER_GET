import { useEffect, useRef, useState } from 'react';
import styles from './IdPhotoPage.module.css';

export default function GlassDropdown<T extends string>({ label, value, options, onChange, openUp = false }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void; openUp?: boolean }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  return <div ref={container} className={`${styles.glassDropdown} ${openUp ? styles.glassDropdownUp : ''}`} onKeyDown={(event) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } }}>
    <button ref={trigger} type="button" className={styles.glassTrigger} aria-label={label} aria-expanded={open} onClick={() => setOpen(!open)}><span>{options.find((option) => option.value === value)?.label}</span><span aria-hidden="true">{openUp ? '⌃' : '⌄'}</span></button>
    {open && <div className={styles.glassMenu} role="group" aria-label={label}>{options.map((option) => <button type="button" key={option.value} aria-pressed={option.value === value} onClick={() => { onChange(option.value); setOpen(false); trigger.current?.focus(); }}><span>{option.label}</span><span aria-hidden="true">{option.value === value ? '✓' : ''}</span></button>)}</div>}
  </div>;
}
