import type { FormEvent } from 'react';
import ChatInputBar from './ChatInputBar';
import type { Message } from './chatMessages';
import MessageBubble from './MessageBubble';
import styles from './QaChatPage.module.css';

type ChatPanelProps = {
  input: string;
  jobTitle: string;
  messages: Message[];
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function ChatPanel({ input, jobTitle, messages, onInputChange, onSubmit }: ChatPanelProps) {
  return (
    <section className={styles.chatStage}>
      <div className={styles.chatPanel} aria-label="AI 提前问答对话区">
        <div className={styles.chatHead}>
          <div>
            <strong>{jobTitle}</strong>
            <span>AI 提前问答助手</span>
          </div>
          <span className={styles.status}>对话进行中</span>
        </div>

        <div className={styles.chatMessages}>
          {messages.map((message) => (
            <MessageBubble message={message} key={message.id} />
          ))}
        </div>

        <ChatInputBar input={input} onInputChange={onInputChange} onSubmit={onSubmit} />
      </div>
    </section>
  );
}
