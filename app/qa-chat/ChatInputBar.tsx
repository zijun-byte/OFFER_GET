import type { FormEvent, RefObject } from 'react';
import { shellStyles } from '../components/SiteShell';
import styles from './QaChatPage.module.css';

type ChatInputBarProps = {
  input: string;
  inputRef: RefObject<HTMLInputElement | null>;
  isSending: boolean;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function ChatInputBar({ input, inputRef, isSending, onInputChange, onSubmit }: ChatInputBarProps) {
  return (
    <form className={styles.chatInputBar} onSubmit={onSubmit}>
      <input
        aria-label="输入你的问题"
        autoComplete="off"
        className={styles.chatInput}
        disabled={isSending}
        placeholder="比如：这段经历怎么讲更像运营岗？"
        ref={inputRef}
        type="text"
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
      />
      <button className={shellStyles.button} disabled={isSending || !input.trim()} type="submit">
        {isSending ? '发送中…' : '发送'}
      </button>
    </form>
  );
}
