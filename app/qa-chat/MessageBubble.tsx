import styles from './QaChatPage.module.css';
import type { Message } from './chatMessages';

type MessageBubbleProps = {
  message: Message;
  onPickSuggestion: (text: string) => void;
};

export default function MessageBubble({ message, onPickSuggestion }: MessageBubbleProps) {
  return (
    <div className={`${styles.messageRow} ${message.role === 'user' ? styles.userRow : ''}`}>
      {message.role === 'ai' ? <span className={`${styles.avatar} ${styles.aiAvatar}`}>AI</span> : null}
      <div className={`${styles.bubble} ${message.role === 'user' ? styles.userBubble : styles.aiBubble}`}>
        {message.content}
        {message.quickCard ? (
          <div className={styles.quickCard}>
            <strong>{message.quickCard.title}</strong>
            {message.quickCard.suggestions
              ? message.quickCard.items.map((item) => (
                  <button key={item} onClick={() => onPickSuggestion(item)} type="button">
                    {item}
                  </button>
                ))
              : message.quickCard.items.map((item) => <span key={item}>{item}</span>)}
          </div>
        ) : null}
      </div>
      {message.role === 'user' ? <span className={`${styles.avatar} ${styles.userAvatar}`}>我</span> : null}
    </div>
  );
}
