import { type CSSProperties } from 'react';
import styles from './IdPhotoPage.module.css';
import GlassDropdown from './GlassDropdown';
import {
  backgroundOptions,
  modernStyleOptions,
  type BackgroundKey,
  type ModernStyleKey,
  type StyleKey,
} from './idPhotoContent';
import { styleCopy } from './idPhotoContent';

type IdPhotoPreviewProps = {
  customPrompt: string;
  exportError: string;
  fileName: string;
  generatedImageUrl: string;
  isProcessing: boolean;
  generationProgress: number;
  onDownload: () => void;
  onOptimize: () => void;
  previewImageUrl: string;
  resultReady: boolean;
  selectedBackground: BackgroundKey;
  selectedModernStyle: ModernStyleKey;
  selectedStyle: StyleKey;
  setCustomPrompt: (prompt: string) => void;
  setSelectedBackground: (background: BackgroundKey) => void;
  setSelectedModernStyle: (style: ModernStyleKey) => void;
};

function SamplePortrait() {
  return (
    <div className={styles.samplePortrait} aria-hidden="true">
      <div className={styles.sampleHead} />
      <div className={styles.sampleSuit} />
    </div>
  );
}

export default function IdPhotoPreview({
  customPrompt,
  exportError,
  fileName,
  generatedImageUrl,
  isProcessing,
  generationProgress,
  onDownload,
  onOptimize,
  previewImageUrl,
  resultReady,
  selectedBackground,
  selectedModernStyle,
  selectedStyle,
  setCustomPrompt,
  setSelectedBackground,
  setSelectedModernStyle,
}: IdPhotoPreviewProps) {
  const selectedCopy = styleCopy[selectedStyle];
  const selectedBackgroundCopy = backgroundOptions[selectedBackground];
  const selectedModernStyleCopy = modernStyleOptions[selectedModernStyle];
  const hasPhoto = Boolean(previewImageUrl);

  return (
    <section className={styles.section} aria-label="AI 证件照工作台">
      <div className={styles.sectionHead}>
        <h2>AI 渲染工作台</h2>
        <p>先完成 AI 渲染，再进入裁剪比例和下载导出。</p>
      </div>

      <div className={styles.generationWorkbench}>
          <div className={styles.sourcePanel}>
            <span className={styles.panelLabel}>{hasPhoto ? '用户原图' : '示例图'}</span>
            <div
              className={styles.sourcePortrait}
              style={{ '--portrait-bg': selectedStyle === 'traditional' ? selectedBackgroundCopy.value : selectedModernStyleCopy.value } as CSSProperties}
            >
              {previewImageUrl ? (
                <img src={previewImageUrl} alt="用户上传原图" />
              ) : (
                <SamplePortrait />
              )}
              {isProcessing ? <span className={styles.processingBadge}>AI 渲染中</span> : null}
            </div>
            <p>{hasPhoto ? fileName : '用于展示该模式的预期生成方向'}</p>
          </div>

          <div className={styles.modePanel}>
            <span className={styles.panelLabel}>{selectedCopy.title}</span>

            {selectedStyle === 'traditional' ? (
              <div className={styles.optionBlock}>
                <strong>选择证件照背景</strong>
                <GlassDropdown label="证件照背景" value={selectedBackground} options={(Object.keys(backgroundOptions) as BackgroundKey[]).map((key) => ({ value: key, label: backgroundOptions[key].label }))} onChange={setSelectedBackground} />
              </div>
            ) : null}

            {selectedStyle === 'modern' ? (
              <div className={styles.optionBlock}>
                <strong>选择新式照片样式</strong>
                <div className={styles.styleOptionGrid}>
                  {(Object.keys(modernStyleOptions) as ModernStyleKey[]).map((key) => (
                    <button
                      className={key === selectedModernStyle ? styles.styleOptionActive : undefined}
                      key={key}
                      onClick={() => setSelectedModernStyle(key)}
                      type="button"
                    >
                      <span>{modernStyleOptions[key].label}</span>
                      <em>{modernStyleOptions[key].copy}</em>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {selectedStyle === 'custom' ? (
              <div className={styles.promptPanel}>
                <strong>告诉智能体你想要的照片效果</strong>
                <textarea
                  onChange={(event) => setCustomPrompt(event.target.value)}
                  placeholder="例如：保持职业感，背景更清透，整体偏高级、自然，不要过度磨皮。"
                  value={customPrompt}
                />
              </div>
            ) : null}

            <div className={styles.actionStrip}>
              {exportError ? <span className={styles.errorText}>{exportError}</span> : null}
              <button
                className={`${styles.optimizeButton} ${isProcessing ? styles.optimizeButtonBusy : ''}`}
                disabled={!previewImageUrl || isProcessing}
                onClick={onOptimize}
                type="button"
                aria-busy={isProcessing}
              >
                {isProcessing ? (
                  <span className={styles.generationProgressTrack} aria-hidden="true">
                    <svg viewBox="0 0 400 54" preserveAspectRatio="none">
                      <rect className={styles.generationProgressBase} x="1" y="1" width="398" height="52" rx="26" pathLength="100" />
                      <rect
                        className={styles.generationProgressValue}
                        x="1"
                        y="1"
                        width="398"
                        height="52"
                        rx="26"
                        pathLength="100"
                        style={{ strokeDashoffset: 100 - generationProgress }}
                      />
                    </svg>
                  </span>
                ) : null}
                {isProcessing ? '正在 AI 渲染' : resultReady && generatedImageUrl ? '重新生成' : '开始 AI 渲染'}
              </button>
              {resultReady && generatedImageUrl ? <button className={styles.secondaryButton} onClick={onDownload} type="button">下载当前规格</button> : null}
            </div>
          </div>
      </div>
    </section>
  );
}
