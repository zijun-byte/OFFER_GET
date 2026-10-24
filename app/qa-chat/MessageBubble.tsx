import styles from './QaChatPage.module.css';
import type { Message } from './chatMessages';

type MessageBubbleProps = {
  message: Message;
  onPickSuggestion: (text: string) => void;
};

export default function MessageBubble({ message, onPickSuggestion }: MessageBubbleProps) {
  if (message.notice) {
    return (
      <p className={styles.notice} role="status">
        {message.content}
      </p>
    );
  }

  const isUser = message.role === 'user';
  const card = message.quickCard;

  return (
    <div className={`${styles.messageRow} ${isUser ? styles.userRow : ''} ${message.example ? styles.exampleRow : ''}`}>
      {!isUser ? (
        <span className={`${styles.avatar} ${styles.aiAvatar}`} aria-hidden="true">
          AI
        </span>
      ) : null}
      <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.aiBubble}`}>
        <span className={styles.srOnly}>{isUser ? '我：' : 'AI：'}</span>
        {message.content}
        {card ? (
          <div className={styles.quickCard}>
            <strong>{card.title}</strong>
            {card.suggestions ? (
              <ul className={styles.suggestionList}>
                {card.items.map((item) => (
                  <li key={item}>
                    <button onClick={() => onPickSuggestion(item)} type="button">
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <ol className={styles.pointList}>
                {card.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            )}
          </div>
        ) : null}
      </div>
      {isUser ? (
        <span className={`${styles.avatar} ${styles.userAvatar}`} aria-hidden="true">
          我
        </span>
      ) : null}
    </div>
  );
}
