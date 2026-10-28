import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import type { QaSessionState } from '../../lib/ai/qaWorkflowTypes';
import ChatInputBar from './ChatInputBar';
import { calculateChatViewport } from './chatViewport';
import { exampleMessages, type Message } from './chatMessages';
import MessageBubble from './MessageBubble';
import styles from './QaChatPage.module.css';

const EXAMPLE_SEEN_KEY = 'offerGetQaExampleSeenV1';

type ChatPanelProps = {
  canBeginInterview: boolean;
  input: string;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  isSending: boolean;
  jobTitle: string;
  messages: Message[];
  onBeginInterview: () => void;
  onFinishInterview: () => void;
  onInputChange: (value: string) => void;
  onRetry: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  session: QaSessionState;
};

export default function ChatPanel({ canBeginInterview, input, inputRef, isSending, jobTitle, messages, onBeginInterview, onFinishInterview, onInputChange, onRetry, onSubmit, session }: ChatPanelProps) {
  const stageRef = useRef<HTMLElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [dialog, setDialog] = useState<'example' | 'star' | null>(null);
  const currentQuestion = session.phase === 'interview' ? session.questions[session.questionIndex] : '';
  const missingQuestion = currentQuestion && !messages.some((message) => message.role === 'ai' && message.content.includes(currentQuestion));
  const visibleMessages: Message[] = missingQuestion
    ? [...messages, { id: `restored-question-${session.questionIndex}`, role: 'ai', content: `第 ${session.questionIndex + 1} 题（共 ${session.questions.length} 题）：${currentQuestion}` }]
    : messages;

  useEffect(() => {
    try {
      if (!localStorage.getItem(EXAMPLE_SEEN_KEY)) setDialog('example');
    } catch {
      // The interview still works without local storage.
    }
  }, []);

  useEffect(() => {
    const container = messagesRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [visibleMessages.length, isSending, session.questionIndex]);

  useEffect(() => {
    const node = dialogRef.current;
    if (dialog && node && !node.open) node.showModal();
    if (!dialog && node?.open) node.close();
  }, [dialog]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const viewport = window.visualViewport;
    const media = window.matchMedia('(max-width: 760px)');
    const oldBodyOverflow = document.body.style.overflow;
    const sync = () => {
      if (!media.matches) {
        stage.style.removeProperty('top');
        stage.style.removeProperty('height');
        stage.style.removeProperty('left');
        stage.style.removeProperty('width');
        delete document.body.dataset.qaKeyboard;
        document.body.style.overflow = oldBodyOverflow;
        return;
      }
      document.body.style.overflow = 'hidden';
      const headerHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 70;
      const navHeight = document.querySelector<HTMLElement>('nav[aria-label="功能导航（小屏）"]')?.getBoundingClientRect().height || 66;
      const geometry = calculateChatViewport(viewport?.height || window.innerHeight, viewport?.offsetTop || 0, window.innerHeight, headerHeight, navHeight, document.activeElement === inputRef.current);
      stage.style.top = `${geometry.top}px`;
      stage.style.height = `${geometry.height}px`;
      stage.style.left = `${viewport?.offsetLeft || 0}px`;
      stage.style.width = `${viewport?.width || window.innerWidth}px`;
      document.body.dataset.qaKeyboard = String(geometry.keyboardOpen);
    };
    sync();
    viewport?.addEventListener('resize', sync);
    viewport?.addEventListener('scroll', sync);
    media.addEventListener('change', sync);
    window.addEventListener('resize', sync);
    inputRef.current?.addEventListener('focus', sync);
    inputRef.current?.addEventListener('blur', sync);
    const field = inputRef.current;
    return () => {
      viewport?.removeEventListener('resize', sync);
      viewport?.removeEventListener('scroll', sync);
      media.removeEventListener('change', sync);
      window.removeEventListener('resize', sync);
      field?.removeEventListener('focus', sync);
      field?.removeEventListener('blur', sync);
      delete document.body.dataset.qaKeyboard;
      document.body.style.overflow = oldBodyOverflow;
    };
  }, [inputRef]);

  function closeDialog() {
    if (dialog === 'example') {
      try { localStorage.setItem(EXAMPLE_SEEN_KEY, '1'); } catch { /* Storage is optional. */ }
    }
    setDialog(null);
  }

  const status = session.phase === 'intake' ? '了解你的经历' : session.phase === 'interview' ? '正式面试' : '面试复盘';
  const placeholder = session.phase === 'intake' ? '补充你的目标和经历…' : session.phase === 'interview' ? '输入你的回答…' : '询问评分或改进方法…';

  return (
    <section ref={stageRef} className={styles.chatStage} aria-label="提前问答">
      <div className={styles.chatPanel}>
        <header className={styles.chatHead}>
          <div className={styles.chatHeading}>
            <h1>{jobTitle}</h1>
            <span>{status}{session.phase === 'interview' ? ` · ${session.questionIndex + 1}/${session.questions.length} 题` : ''}</span>
          </div>
          <div className={styles.headActions}>
            <button className={styles.subtleButton} type="button" onClick={() => setDialog('example')}>示例</button>
            <button className={styles.coachTrigger} type="button" onClick={() => setDialog('star')}>STAR 提示</button>
          </div>
        </header>

        <div aria-label="面试对话记录" aria-live="polite" className={styles.chatMessages} ref={messagesRef} role="log">
          {visibleMessages.map((message) => <MessageBubble key={message.id} message={message} />)}
          {isSending ? <p className={styles.thinking} role="status">{messages.length ? '正在整理下一步…' : '正在了解你的信息…'}</p> : null}
          {!isSending && messages.length === 1 && messages[0].notice ? <button className={styles.retryButton} type="button" onClick={onRetry}>重新连接</button> : null}
          {session.phase === 'intake' && !isSending && session.intakeTurns > 0 && canBeginInterview ? <button className={styles.stageAction} type="button" onClick={onBeginInterview}>信息已足够，开始面试</button> : null}
          {session.phase === 'interview' && !isSending && (session.answers.length > 0 || session.pendingAnswer) ? <button className={styles.stageAction} type="button" onClick={onFinishInterview}>提前结束并评分</button> : null}
        </div>

        <div className={styles.composerDock}>
          <ChatInputBar input={input} inputRef={inputRef} isSending={isSending} placeholder={placeholder} onInputChange={onInputChange} onSubmit={onSubmit} />
        </div>
      </div>

      <dialog ref={dialogRef} className={styles.helpDialog} aria-label={dialog === 'star' ? 'STAR 回答提示' : '面试示例对话'} onCancel={(event) => { event.preventDefault(); closeDialog(); }} onClick={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
        <div className={styles.dialogContent}>
          <div className={styles.dialogHead}>
            <div><span className={styles.dialogEyebrow}>Offer GET · 面试练习</span><h2>{dialog === 'star' ? '用 STAR 讲清一段经历' : '先看一段面试示例'}</h2></div>
            <button type="button" onClick={closeDialog} aria-label="关闭提示">×</button>
          </div>
          {dialog === 'star' ? (
            <ol className={styles.starSteps}>
              <li><strong>场景 S</strong><span>当时发生了什么，要解决什么问题？</span></li>
              <li><strong>任务 T</strong><span>你的职责和目标是什么？</span></li>
              <li><strong>行动 A</strong><span>你亲自做了什么，为什么这样做？</span></li>
              <li><strong>结果 R</strong><span>有什么可核实的结果和复盘？</span></li>
            </ol>
          ) : (
            <div className={styles.exampleThread}>
              <p>示例只用于说明问答方式，不会进入你的面试记录。</p>
              {exampleMessages.map((message) => <MessageBubble key={message.id} message={message} />)}
            </div>
          )}
          <button className={styles.dialogDone} type="button" onClick={closeDialog}>{dialog === 'star' ? '知道了' : '开始我的面试'}</button>
        </div>
      </dialog>
    </section>
  );
}
