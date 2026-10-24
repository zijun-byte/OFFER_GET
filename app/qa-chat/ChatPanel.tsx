import type { FormEvent, RefObject } from 'react';
import ChatInputBar from './ChatInputBar';
import type { Message } from './chatMessages';
import MessageBubble from './MessageBubble';
import styles from './QaChatPage.module.css';

type ChatPanelProps = {
  input: string;
  inputRef: RefObject<HTMLInputElement | null>;
  isSending: boolean;
  jobTitle: string;
  messages: Message[];
  onInputChange: (value: string) => void;
  onPickSuggestion: (text: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  threadEndRef: RefObject<HTMLDivElement | null>;
};

export default function ChatPanel({
  input,
  inputRef,
  isSending,
  jobTitle,
  messages,
  onInputChange,
  onPickSuggestion,
  onSubmit,
  threadEndRef,
}: ChatPanelProps) {
  const firstExample = messages.findIndex((message) => message.example);
  const lastExample = messages.map((message) => Boolean(message.example)).lastIndexOf(true);

  return (
    <section className={styles.chatStage}>
      <div className={styles.chatPanel}>
        <header className={styles.chatHead}>
          <div>
            <h1>{jobTitle}</h1>
            <span>AI 提前问答助手</span>
          </div>
          <span className={styles.status}>{isSending ? 'AI 正在回复…' : 'AI 已接入'}</span>
        </header>

        <div aria-label="对话记录" aria-live="polite" className={styles.chatMessages} role="log">
          {messages.map((message, index) => (
            <div className={styles.threadItem} key={message.id}>
              {index === firstExample ? <p className={styles.exampleDivider}>下面是一段示例对话，帮你了解可以怎么问</p> : null}
              <MessageBubble message={message} onPickSuggestion={onPickSuggestion} />
              {index === lastExample ? <p className={styles.exampleDivider}>示例结束，从这里开始你的提问</p> : null}
            </div>
          ))}
          <div ref={threadEndRef} />
        </div>

        <ChatInputBar
          input={input}
          inputRef={inputRef}
          isSending={isSending}
          onInputChange={onInputChange}
          onSubmit={onSubmit}
        />
      </div>

      <aside className={styles.coachPanel} aria-labelledby="coach-title">
        <h2 id="coach-title">回答框架：STAR</h2>
        <p>面试官追问经历时，按这个顺序讲最清楚。</p>
        <ol>
          <li>
            <strong>场景</strong>
            <span>当时在什么背景下，要解决什么问题</span>
          </li>
          <li>
            <strong>任务</strong>
            <span>你负责的部分和目标</span>
          </li>
          <li>
            <strong>行动</strong>
            <span>你具体做了什么，为什么这么做</span>
          </li>
          <li>
            <strong>结果</strong>
            <span>数据变化或复盘结论</span>
          </li>
        </ol>
      </aside>
    </section>
  );
}
