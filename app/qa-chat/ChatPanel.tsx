import type { FormEvent } from 'react';
import ChatInputBar from './ChatInputBar';
import type { Message } from './chatMessages';
import MessageBubble from './MessageBubble';
import styles from './QaChatPage.module.css';

type ChatPanelProps = {
  input: string;
  isSending: boolean;
  jobTitle: string;
  messages: Message[];
  onInputChange: (value: string) => void;
  onPickSuggestion: (text: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function ChatPanel({ input, isSending, jobTitle, messages, onInputChange, onPickSuggestion, onSubmit }: ChatPanelProps) {
  return (
    <section className={styles.chatStage}>
      <div className={styles.chatPanel} aria-label="AI 提前问答对话区">
        <div className={styles.chatHead}>
          <div>
            <strong>{jobTitle}</strong>
            <span>AI 提前问答助手</span>
          </div>
          <span className={styles.status}>{isSending ? 'AI 正在回复…' : 'AI 已接入'}</span>
        </div>

        <div className={styles.chatMessages}>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} onPickSuggestion={onPickSuggestion} />
          ))}
        </div>

        <ChatInputBar input={input} isSending={isSending} onInputChange={onInputChange} onSubmit={onSubmit} />
      </div>
    </section>
  );
}
