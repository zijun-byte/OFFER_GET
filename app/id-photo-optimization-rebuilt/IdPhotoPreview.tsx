import { type CSSProperties, type PointerEvent, useRef, useState } from 'react';
import styles from './IdPhotoPage.module.css';
import {
  backgroundOptions,
  modernStyleOptions,
  sizeOptions,
  type BackgroundKey,
  type ModernStyleKey,
  type SizeKey,
  type StyleKey,
} from './idPhotoContent';
import { styleCopy } from './idPhotoContent';

type CropDragMode = 'move' | 'top' | 'right' | 'bottom' | 'left' | 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft';

type IdPhotoPreviewProps = {
  customPrompt: string;
  exportError: string;
  fileName: string;
  freeCropArea: {
    height: number;
    width: number;
    x: number;
    y: number;
  };
  generatedImageUrl: string;
  isProcessing: boolean;
  onDownload: () => void;
  onOptimize: () => void;
  previewImageUrl: string;
  resultReady: boolean;
  selectedBackground: BackgroundKey;
  selectedModernStyle: ModernStyleKey;
  selectedSize: SizeKey;
  selectedStyle: StyleKey;
  setCustomPrompt: (prompt: string) => void;
  setFreeCropArea: (area: { height: number; width: number; x: number; y: number }) => void;
  setSelectedBackground: (background: BackgroundKey) => void;
  setSelectedModernStyle: (style: ModernStyleKey) => void;
  setSelectedSize: (size: SizeKey) => void;
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
  freeCropArea,
  generatedImageUrl,
  isProcessing,
  onDownload,
  onOptimize,
  previewImageUrl,
  resultReady,
  selectedBackground,
  selectedModernStyle,
  selectedSize,
  selectedStyle,
  setCustomPrompt,
  setFreeCropArea,
  setSelectedBackground,
  setSelectedModernStyle,
  setSelectedSize,
}: IdPhotoPreviewProps) {
  const resultFrameRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    frameHeight: number;
    frameWidth: number;
    mode: CropDragMode;
    startArea: typeof freeCropArea;
    startX: number;
    startY: number;
  } | null>(null);
  const selectedCopy = styleCopy[selectedStyle];
  const selectedBackgroundCopy = backgroundOptions[selectedBackground];
  const selectedModernStyleCopy = modernStyleOptions[selectedModernStyle];
  const selectedSizeCopy = sizeOptions[selectedSize];
  const hasPhoto = Boolean(previewImageUrl);

  function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  function handleCropPointerDown(event: PointerEvent<HTMLElement>, mode: CropDragMode) {
    if (selectedSize !== 'free') return;

    const frame = resultFrameRef.current;
    if (!frame) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = frame.getBoundingClientRect();
    setDragState({
      frameHeight: rect.height,
      frameWidth: rect.width,
      mode,
      startArea: freeCropArea,
      startX: event.clientX,
      startY: event.clientY,
    });
  }

  function handleCropPointerMove(event: PointerEvent<HTMLElement>) {
    if (!dragState || selectedSize !== 'free') return;

    const dx = ((event.clientX - dragState.startX) / dragState.frameWidth) * 100;
    const dy = ((event.clientY - dragState.startY) / dragState.frameHeight) * 100;

    if (dragState.mode === 'move') {
      setFreeCropArea({
        ...dragState.startArea,
        x: clamp(dragState.startArea.x + dx, 0, 100 - dragState.startArea.width),
        y: clamp(dragState.startArea.y + dy, 0, 100 - dragState.startArea.height),
      });
      return;
    }

    let nextX = dragState.startArea.x;
    let nextY = dragState.startArea.y;
    let nextWidth = dragState.startArea.width;
    let nextHeight = dragState.startArea.height;
    const minSize = 18;

    if (dragState.mode.includes('Left') || dragState.mode === 'left') {
      const maxX = dragState.startArea.x + dragState.startArea.width - minSize;
      nextX = clamp(dragState.startArea.x + dx, 0, maxX);
      nextWidth = dragState.startArea.width + (dragState.startArea.x - nextX);
    }

    if (dragState.mode.includes('Right') || dragState.mode === 'right') {
      nextWidth = clamp(dragState.startArea.width + dx, minSize, 100 - dragState.startArea.x);
    }

    if (dragState.mode.includes('top') || dragState.mode === 'top') {
      const maxY = dragState.startArea.y + dragState.startArea.height - minSize;
      nextY = clamp(dragState.startArea.y + dy, 0, maxY);
      nextHeight = dragState.startArea.height + (dragState.startArea.y - nextY);
    }

    if (dragState.mode.includes('bottom') || dragState.mode === 'bottom') {
      nextHeight = clamp(dragState.startArea.height + dy, minSize, 100 - dragState.startArea.y);
    }

    setFreeCropArea({ height: nextHeight, width: nextWidth, x: nextX, y: nextY });
  }

  function handleCropPointerUp(event: PointerEvent<HTMLElement>) {
    if (!dragState) return;

    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragState(null);
  }

  return (
    <section className={styles.section} aria-label="AI 证件照工作台">
      <div className={styles.sectionHead}>
        <h2>AI 渲染工作台</h2>
        <p>先完成 AI 渲染，再进入裁剪比例和下载导出。</p>
      </div>

      {resultReady && generatedImageUrl ? (
        <div className={styles.resultWorkbench}>
          <aside className={styles.cropRail} aria-label="裁剪比例">
            {(Object.keys(sizeOptions) as SizeKey[]).map((key) => (
              <button
                className={key === selectedSize ? styles.cropActive : undefined}
                key={key}
                onClick={() => setSelectedSize(key)}
                type="button"
              >
                <span>{sizeOptions[key].label}</span>
                <em>{sizeOptions[key].ratio}</em>
              </button>
            ))}
          </aside>

          <div className={styles.resultStage}>
            <div
              className={`${styles.resultPortrait} ${selectedSize === 'free' ? styles.freeCropEnabled : ''}`}
              ref={resultFrameRef}
              style={
                selectedSize === 'free'
                  ? undefined
                  : ({
                      '--output-ratio': `${selectedSizeCopy.width} / ${selectedSizeCopy.height}`,
                    } as CSSProperties)
              }
            >
              <img src={generatedImageUrl} alt="AI 渲染结果" />
              <span className={styles.readyBadge}>AI 结果</span>
              {selectedSize === 'free' ? (
                <div
                  className={styles.cropBox}
                  onPointerDown={(event) => handleCropPointerDown(event, 'move')}
                  onPointerMove={handleCropPointerMove}
                  onPointerUp={handleCropPointerUp}
                  style={
                    {
                      height: `${freeCropArea.height}%`,
                      left: `${freeCropArea.x}%`,
                      top: `${freeCropArea.y}%`,
                      width: `${freeCropArea.width}%`,
                    } as CSSProperties
                  }
                >
                  {(['top', 'right', 'bottom', 'left', 'topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const).map(
                    (mode) => (
                      <span
                        className={`${styles.cropHandle} ${styles[`cropHandle_${mode}`]}`}
                        key={mode}
                        onPointerDown={(event) => {
                          event.stopPropagation();
                          handleCropPointerDown(event, mode);
                        }}
                        onPointerMove={handleCropPointerMove}
                        onPointerUp={handleCropPointerUp}
                      />
                    ),
                  )}
                </div>
              ) : null}
            </div>
          </div>

          <aside className={styles.exportPanel} aria-label="下载导出">
            <strong>{selectedSizeCopy.label}</strong>
            <p>
              {selectedSizeCopy.width}x{selectedSizeCopy.height}px · {selectedSizeCopy.copy}
            </p>
            <button className={styles.optimizeButton} onClick={onDownload} type="button">
              下载 PNG
            </button>
            <button className={styles.secondaryButton} disabled={isProcessing} onClick={onOptimize} type="button">
              {isProcessing ? '正在重新生成' : '不满意，重新生成'}
            </button>
            {exportError ? <span className={styles.errorText}>{exportError}</span> : null}
          </aside>
        </div>
      ) : (
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
                <div className={styles.swatchRow}>
                  {(Object.keys(backgroundOptions) as BackgroundKey[]).map((key) => (
                    <button
                      aria-pressed={key === selectedBackground}
                      className={`${styles.swatchOption} ${key === selectedBackground ? styles.swatchActive : ''}`}
                      key={key}
                      onClick={() => setSelectedBackground(key)}
                      style={{ '--swatch': backgroundOptions[key].value } as CSSProperties}
                      type="button"
                    >
                      <i aria-hidden="true" />
                      <span>{backgroundOptions[key].label}</span>
                    </button>
                  ))}
                </div>
                <p>{selectedBackgroundCopy.copy}</p>
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
                className={styles.optimizeButton}
                disabled={!previewImageUrl || isProcessing}
                onClick={onOptimize}
                type="button"
              >
                {isProcessing ? '正在 AI 渲染' : '开始 AI 渲染'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
