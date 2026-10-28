import styles from './QaChatPage.module.css';
import type { Message } from './chatMessages';

export default function MessageBubble({ message }: { message: Message }) {
  if (message.notice) return <p className={styles.notice} role="alert">{message.content}</p>;
  const isUser = message.role === 'user';
  const total = message.scorecard?.items.reduce((sum, item) => sum + item.score, 0);

  return (
    <div className={`${styles.messageRow} ${isUser ? styles.userRow : ''}`}>
      <div className={styles.messageBody}>
        {!isUser ? <span className={styles.messageAuthor}>Offer GET</span> : null}
        <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.aiBubble}`}>
          <span className={styles.srOnly}>{isUser ? '我：' : '面试官：'}</span>
          <p>{message.content}</p>
        </div>
        {message.scorecard ? (
          <section className={styles.scorecard} aria-label="本轮面试评分">
            <div className={styles.scoreHead}>
              <strong>面试反馈</strong>
              <span>{total}/20 {message.scorecard.provisional ? '· 提前结束，仅供参考' : '· 本轮练习'}</span>
            </div>
            <p className={styles.scoreSummary}>{message.scorecard.summary}</p>
            <div className={styles.scoreItems}>
              {message.scorecard.items.map((item) => (
                <article key={item.label}>
                  <div><strong>{item.label}</strong><span>{item.score}/5</span></div>
                  <p>{item.evidence}</p>
                  <small>{item.advice}</small>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
