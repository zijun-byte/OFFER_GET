import styles from './IdPhotoPage.module.css';
import { styleCopy, type StyleKey } from './idPhotoContent';

type StyleChoiceGridProps = {
  selectedStyle: StyleKey;
  onSelectStyle: (style: StyleKey) => void;
};

export default function StyleChoiceGrid({ selectedStyle, onSelectStyle }: StyleChoiceGridProps) {
  return (
    <section className={styles.section} id="choices" aria-label="证件照优化流程">
      <div className={styles.sectionHead}>
        <h2>上传照片 - 选定风格 - 证件优化</h2>
        <p>按这个顺序完成即可：先上传，再选风格，最后进入证件照优化。</p>
      </div>

      <div className={styles.choiceGrid}>
        {(Object.keys(styleCopy) as StyleKey[]).map((key) => {
          const item = styleCopy[key];
          const isActive = key === selectedStyle;
          return (
            <button
              className={`${styles.choiceCard} ${isActive ? styles.activeChoice : ''}`}
              key={key}
              onClick={() => onSelectStyle(key)}
              type="button"
            >
              <span className={styles.choicePill}>{item.pill}</span>
              <strong>{item.title}</strong>
              <p>{item.cardCopy}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
