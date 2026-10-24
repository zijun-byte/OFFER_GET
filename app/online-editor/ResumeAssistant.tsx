'use client';

import { useEffect, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { applyResumeEdits, isResumeData, needsConfirmation, type ResumeEdit } from '../../lib/resumeEdits';
import { createResumeDataFromExtractionDraft, type ResumeData, type ResumeExtractionDraft } from './resumePreviewData';
import styles from './MobileResume.module.css';

type Pending = { before: string; next: ResumeData; label: string; import?: boolean };
type Props = {
  resumeData: ResumeData;
  setResumeData: Dispatch<SetStateAction<ResumeData>>;
  onImported: () => void;
  onMessage?: (role: 'agent' | 'user', content: string) => void;
  tools?: ReactNode;
  paste?: boolean;
  guided?: { value: string; onChange: (text: string) => void; onSubmit: () => void; onSkip: () => void; busy: boolean; placeholder: string; required: boolean };
};

export default function ResumeAssistant({ resumeData, setResumeData, onImported, onMessage, guided, tools, paste = false }: Props) {
  const [input, setInput] = useState('');
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);
  const [undo, setUndo] = useState<{ before: ResumeData; after: string } | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [importText, setImportText] = useState<string | null>(null);
  const [pasteMode, setPasteMode] = useState(paste);
  const [clarification, setClarification] = useState('');
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const current = useRef(resumeData);
  current.current = resumeData;
  const value = guided && !pasteMode ? guided.value : input;
  const change = guided && !pasteMode ? guided.onChange : setInput;
  const disabled = busy || !!guided?.busy;

  useEffect(() => {
    try {
      setInput(localStorage.getItem('offerGetCommandDraft') || '');
      const savedUndo = JSON.parse(sessionStorage.getItem('offerGetLastAiEdit') || 'null');
      if (isResumeData(savedUndo?.before) && savedUndo.after === JSON.stringify(current.current)) setUndo(savedUndo);
    } catch { setStatus('浏览器不允许保存输入草稿'); }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem('offerGetCommandDraft', input); } catch { setStatus('输入尚未保存，请勿关闭页面'); }
  }, [input, ready]);
  useEffect(() => {
    const node = textRef.current;
    if (!node) return;
    node.style.height = 'auto';
    node.style.height = `${Math.min(expanded ? 320 : 132, Math.max(52, node.scrollHeight))}px`;
  }, [value, expanded]);
  useEffect(() => {
    if (!busy && !attachment && !pending) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [busy, attachment, pending]);

  async function jsonRequest(url: string, body: BodyInit, multipart = false) {
    const response = await fetch(url, { method: 'POST', body, headers: multipart ? undefined : { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(75000) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || '请求失败，请重试');
    return payload;
  }
  function report(message: string) {
    setStatus(message);
    onMessage?.('agent', message);
  }
  function apply(proposal: Pending) {
    if (JSON.stringify(current.current) !== proposal.before) {
      report('简历在处理期间已发生变化，本次结果未应用，请重新发送。');
      setPending(null);
      return;
    }
    setUndo({ before: structuredClone(current.current), after: JSON.stringify(proposal.next) });
    try { sessionStorage.setItem('offerGetLastAiEdit', JSON.stringify({ before: current.current, after: JSON.stringify(proposal.next) })); } catch { /* In-memory undo remains available. */ }
    current.current = proposal.next;
    setResumeData(proposal.next);
    setPending(null);
    report(`${proposal.label}\n已更新简历，可撤销本次修改。`);
    setInput('');
    if (proposal.import) { setImportText(null); setAttachment(null); setPasteMode(false); onImported(); }
  }
  async function send() {
    if (lock.current || disabled || pending || importText !== null) return;
    if (guided && !pasteMode && !attachment) { guided.onSubmit(); return; }
    if (!value.trim() && !attachment) return;
    lock.current = true;
    onMessage?.('user', attachment ? `${value.trim() ? `${value.trim()}\n` : ''}上传附件：${attachment.name}` : value.trim());
    setBusy(true);
    setStatus(attachment ? '正在读取附件…' : '正在处理…');
    const before = JSON.stringify(current.current);
    try {
      if (attachment) {
        const form = new FormData(); form.append('file', attachment);
        const result = await jsonRequest('/api/resume/attachment', form, true);
        setImportText(result.text);
        report('请核对识别文字，尤其是姓名、电话和日期。尚未写入简历。');
      } else if (pasteMode) {
        setImportText(input);
        report('核对后可生成导入预览。');
      } else {
        const instruction = clarification ? `${clarification}\n用户补充：${input}` : input;
        const result = await jsonRequest('/api/resume/edit', JSON.stringify({ instruction, resumeData: current.current }));
        const edits = result.edits as ResumeEdit[];
        if (!edits?.length) { report(result.message || '没有需要修改的内容，请补充具体要求。'); if (result.clarification) { setClarification(`原始需求：${instruction}\n助手追问：${result.message}`); setInput(''); } return; }
        setClarification('');
        const next = applyResumeEdits(JSON.parse(before), edits, `${Date.now()}-${Math.random().toString(36).slice(2)}`);
        const proposal = { before, next, label: result.message || '修改建议' };
        if (needsConfirmation(edits)) { setPending(proposal); report(`${proposal.label}\n请检查修改预览，确认后才会生效。`); }
        else apply(proposal);
      }
    } catch (error) { report(error instanceof Error && error.name !== 'TimeoutError' ? error.message : '处理超时，请重试。输入和简历均已保留。'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function prepareImport() {
    if (lock.current || !importText?.trim()) return;
    lock.current = true; setBusy(true);
    const before = JSON.stringify(current.current);
    try {
      const draft = await jsonRequest('/api/resume/extract', JSON.stringify({ text: importText })) as ResumeExtractionDraft;
      const next = createResumeDataFromExtractionDraft(draft);
      if (!isResumeData(next) || !Object.values(next.basics).some(Boolean) && !next.education.length && !next.experiences.length && !next.projects.length && !next.skills.length) throw new Error('没有识别到有效简历，请检查文字后重试');
      setPending({ before, next, label: '导入这份简历将替换当前内容，模板保持不变。', import: true });
      report('请核对导入后的字段，再确认替换。');
    } catch { report('识别失败，原文和简历均未改动，请重试。'); }
    finally { lock.current = false; setBusy(false); }
  }

  return <div className={styles.assistant}>
    {status && <p className={styles.status} role="status">{status}</p>}
    {undo && <button type="button" className={styles.textButton} disabled={disabled} onClick={() => {
      if (JSON.stringify(current.current) !== undo.after) { setStatus('你已继续编辑，为避免覆盖新内容，不能直接撤销这次修改。'); return; }
      setResumeData(undo.before); setUndo(null); report('已撤销，恢复到本次修改之前。');
      try { sessionStorage.removeItem('offerGetLastAiEdit'); } catch { /* optional persistence */ }
    }}>撤销上次 AI 修改</button>}
    {importText !== null && !pending && <section className={styles.review} aria-label="核对附件文字">
      <label>核对识别文字<textarea value={importText} onChange={(event) => setImportText(event.target.value)} disabled={busy} /></label>
      <button type="button" disabled={busy || !importText.trim()} onClick={prepareImport}>生成导入预览</button>
      <button type="button" disabled={busy} onClick={() => setImportText(null)}>取消</button>
    </section>}
    {pending && <section className={styles.review} aria-label="确认简历修改">
      <p>{pending.label}</p>
      <ChangePreview before={JSON.parse(pending.before)} after={pending.next} />
      <button type="button" onClick={() => apply(pending)}>确认{pending.import ? '替换' : '修改'}</button>
      <button type="button" onClick={() => { setPending(null); report('已取消，原简历未改动。'); }}>取消</button>
    </section>}
    <div className={styles.composer}>
      <button className={styles.expand} type="button" aria-label={expanded ? '收起输入框' : '展开输入框'} aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? '收起' : '展开'}</button>
      <textarea ref={textRef} aria-label={guided && !pasteMode ? '回答问题' : '告诉 AI 如何修改简历'} value={value} onChange={(event) => change(event.target.value)} readOnly={disabled} placeholder={pasteMode ? '粘贴旧简历或完整经历文字…' : guided?.placeholder || '告诉我想补充或修改的内容…'} maxLength={16000} />
      {attachment && <div className={styles.attachment}>{attachment.name}<button type="button" disabled={disabled} onClick={() => setAttachment(null)} aria-label="移除附件">×</button></div>}
      <div className={styles.composerTools}>
        {tools}
        <button type="button" className={styles.toolButton} disabled={disabled || !!pending} aria-pressed={pasteMode} onClick={() => setPasteMode(!pasteMode)}>粘贴简历</button>
        {guided && !guided.required && !pasteMode && <button className={styles.textButton} type="button" disabled={disabled || !!pending || importText !== null || !!attachment} onClick={guided.onSkip}>跳过</button>}
        <span className={styles.spacer} />
        <input hidden ref={fileRef} type="file" accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp" onChange={(event) => {
          const file = event.target.files?.[0]; event.target.value = '';
          if (!file) return;
          if (file.size > 8 * 1024 * 1024) { setStatus('文件不能超过 8MB'); return; }
          setAttachment(file); setStatus('点击发送后，附件内容会交给已配置的 AI 服务解析；本应用不保存原附件。');
        }} />
        <button className={styles.iconButton} type="button" aria-label="添加文件或图片" disabled={disabled || !!pending || importText !== null} onClick={() => fileRef.current?.click()}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></button>
        <button className={styles.send} type="button" aria-label="发送" disabled={disabled || !!pending || importText !== null || !value.trim() && !attachment} onClick={send}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg></button>
      </div>
    </div>
  </div>;
}

function ChangePreview({ before, after }: { before: ResumeData; after: ResumeData }) {
  const labels = { basics: '基础信息', education: '教育经历', experiences: '工作经历', projects: '项目经历', skills: '技能' };
  return <div className={styles.diff}>{(Object.keys(labels) as Array<keyof ResumeData>).filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key])).map((key) => <details key={key} open><summary>{labels[key]}</summary><div><small>修改前</small><pre>{humanText(before[key])}</pre><small>修改后</small><pre>{humanText(after[key])}</pre></div></details>)}</div>;
}
function humanText(value: unknown): string {
  if (Array.isArray(value)) return value.map(humanText).join('\n');
  if (value && typeof value === 'object') return Object.entries(value).filter(([key]) => !['id', 'source', 'type'].includes(key)).map(([, item]) => humanText(item)).filter(Boolean).join(' · ');
  return typeof value === 'string' ? value : '';
}
