import type { FormEvent } from 'react';
import shellStyles from '../components/JobPrepShell.module.css';
import styles from './QaChatPage.module.css';

type ChatInputBarProps = {
  input: string;
  isSending: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function ChatInputBar({ input, isSending, onInputChange, onSubmit }: ChatInputBarProps) {
  return (
    <form className={styles.chatInputBar} onSubmit={onSubmit}>
      <input
        aria-label="输入你的问题"
        autoComplete="off"
        className={styles.chatInput}
        disabled={isSending}
        placeholder="继续输入你的问题，比如：这段经历怎么改得更像运营岗？"
        type="text"
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
      />
      <button className={shellStyles.button} disabled={isSending || !input.trim()} type="submit">
        {isSending ? '发送中…' : '发送问题'}
      </button>
    </form>
  );
}
