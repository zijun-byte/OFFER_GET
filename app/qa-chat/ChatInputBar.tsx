import { useEffect, type FormEvent, type RefObject } from 'react';
import styles from './QaChatPage.module.css';

type ChatInputBarProps = {
  input: string;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  isSending: boolean;
  placeholder: string;
  onInputChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function ChatInputBar({ input, inputRef, isSending, placeholder, onInputChange, onSubmit }: ChatInputBarProps) {
  useEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${Math.min(field.scrollHeight, 148)}px`;
  }, [input, inputRef]);

  return (
    <form className={styles.chatInputBar} onSubmit={onSubmit}>
      <textarea
        aria-label="输入面试回答或问题"
        className={styles.chatInput}
        disabled={isSending}
        placeholder={placeholder}
        ref={inputRef}
        rows={1}
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && window.innerWidth > 760) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <button className={styles.sendButton} disabled={isSending || !input.trim()} type="submit" aria-label={isSending ? '正在处理' : '发送'}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6" /></svg>
      </button>
    </form>
  );
}
