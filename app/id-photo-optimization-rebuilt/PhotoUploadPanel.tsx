import { type ChangeEvent, type PointerEvent, useRef, useState } from 'react';
import styles from './IdPhotoPage.module.css';
import PhotoMascot from './PhotoMascot';
import type { SizeKey, StyleKey } from './idPhotoContent';

type PhotoUploadPanelProps = {
  fileName: string;
  freeCropArea: { height: number; width: number; x: number; y: number };
  generatedImageUrl: string;
  isProcessing: boolean;
  previewImageUrl: string;
  resultReady: boolean;
  selectedSize: SizeKey;
  selectedStyle: StyleKey;
  selectedFormLabel: string;
  onSelectStyle: (style: StyleKey) => void;
  onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggleOriginal: () => void;
  showingOriginal: boolean;
  setFreeCropArea: (area: { height: number; width: number; x: number; y: number }) => void;
};

type CropDragMode = 'move' | 'top' | 'right' | 'bottom' | 'left' | 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft';

const stylesList: { key: StyleKey; label: string }[] = [
  { key: 'traditional', label: '传统证件照' },
  { key: 'modern', label: '新式证件照' },
  { key: 'custom', label: '自定义' },
];

export default function PhotoUploadPanel({ fileName, freeCropArea, generatedImageUrl, isProcessing, previewImageUrl, resultReady, selectedSize, selectedStyle, selectedFormLabel, onSelectStyle, onPhotoChange, onToggleOriginal, showingOriginal, setFreeCropArea }: PhotoUploadPanelProps) {
  const displayImageUrl = resultReady && !showingOriginal ? generatedImageUrl : previewImageUrl;
  const frameRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState<{ mode: CropDragMode; startX: number; startY: number; frameWidth: number; frameHeight: number; area: typeof freeCropArea } | null>(null);
  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
  function startCrop(event: PointerEvent<HTMLElement>, mode: CropDragMode) {
    const frame = frameRef.current;
    if (!frame) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = frame.getBoundingClientRect();
    setDrag({ mode, startX: event.clientX, startY: event.clientY, frameWidth: rect.width, frameHeight: rect.height, area: freeCropArea });
  }
  function moveCrop(event: PointerEvent<HTMLElement>) {
    if (!drag) return;
    const dx = (event.clientX - drag.startX) / drag.frameWidth * 100;
    const dy = (event.clientY - drag.startY) / drag.frameHeight * 100;
    if (drag.mode === 'move') {
      setFreeCropArea({ ...drag.area, x: clamp(drag.area.x + dx, 0, 100 - drag.area.width), y: clamp(drag.area.y + dy, 0, 100 - drag.area.height) });
      return;
    }
    let { x, y, width, height } = drag.area;
    const minSize = 18;
    if (drag.mode.includes('Left') || drag.mode === 'left') { const next = clamp(x + dx, 0, x + width - minSize); width += x - next; x = next; }
    if (drag.mode.includes('Right') || drag.mode === 'right') width = clamp(width + dx, minSize, 100 - x);
    if (drag.mode.includes('top') || drag.mode === 'top') { const next = clamp(y + dy, 0, y + height - minSize); height += y - next; y = next; }
    if (drag.mode.includes('bottom') || drag.mode === 'bottom') height = clamp(height + dy, minSize, 100 - y);
    setFreeCropArea({ x, y, width, height });
  }
  function endCrop(event: PointerEvent<HTMLElement>) {
    if (!drag) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDrag(null);
  }
  return (
    <aside className={styles.workspaceShell} aria-label="上传预览区域">
      <div className={styles.uploadPanel} id="upload">
        <div className={styles.mobileModeChooser} role="group" aria-label="照片风格">
          {stylesList.map(({ key, label }) => (
            <button key={key} type="button" aria-pressed={selectedStyle === key} onClick={() => onSelectStyle(key)}>{label}</button>
          ))}
        </div>
        <div key={previewImageUrl || 'empty'} className={`${styles.uploadStatus} ${previewImageUrl ? styles.uploadStatusReady : ''}`} role="status">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m7 12 3 3 7-7" /></svg>
          <span title={fileName}>{previewImageUrl ? `已选择 · ${fileName}` : '未选择照片'}</span>
        </div>
        <div className={styles.mobileFormStatus} aria-live="polite"><span>当前形式</span><strong>{selectedFormLabel}</strong></div>
        <input
          ref={inputRef}
          className={styles.fileInput}
          id="photo-input"
          type="file"
          accept="image/*"
          onChange={onPhotoChange}
        />
        <div ref={frameRef} className={`${styles.dropzone} ${displayImageUrl ? styles.hasImage : ''} ${isProcessing ? styles.photoRendering : ''} ${resultReady && !showingOriginal && selectedSize === 'free' ? styles.freeCropEnabled : ''}`}>
          <div className={styles.dropzoneContent}>
            <PhotoMascot />
            <h2>选择一张清晰正面照</h2>
            <p>支持 JPG、PNG、WebP，单张不超过 8MB</p>
            <div className={styles.dropzoneActions}>
              <button className={styles.button} type="button" onClick={() => inputRef.current?.click()}>
                {previewImageUrl ? '更换照片' : '上传照片'}
              </button>
            </div>
          </div>
          {displayImageUrl ? <img src={displayImageUrl} alt={resultReady && !showingOriginal ? 'AI 生成证件照' : '上传照片预览'} /> : null}
          {displayImageUrl ? (
            <div className={styles.photoFrameActions}>
              {resultReady && generatedImageUrl ? (
                <button className={styles.originalPhotoButton} type="button" onClick={onToggleOriginal} aria-label={showingOriginal ? '查看 AI 生成结果' : '查看原始照片'} title={showingOriginal ? '查看 AI 结果' : '查看原图'}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="m5 17 4.5-4 3.2 2.7 2.1-1.8L19 18" /></svg>
                  <span>{showingOriginal ? 'AI 结果' : '看原图'}</span>
                </button>
              ) : null}
              <button className={styles.changePhotoButton} type="button" onClick={() => inputRef.current?.click()}>更换照片</button>
            </div>
          ) : null}
          {isProcessing ? <div className={styles.photoRenderStatus} role="status"><span className={styles.statusSpinner} />正在生成，完成后会显示在这里</div> : null}
          {resultReady && !showingOriginal && selectedSize === 'free' ? <div className={styles.cropBox} style={{ left: `${freeCropArea.x}%`, top: `${freeCropArea.y}%`, width: `${freeCropArea.width}%`, height: `${freeCropArea.height}%` }} onPointerDown={(event) => startCrop(event, 'move')} onPointerMove={moveCrop} onPointerUp={endCrop}>
            {(['top', 'right', 'bottom', 'left', 'topLeft', 'topRight', 'bottomRight', 'bottomLeft'] as const).map((mode) => <span key={mode} className={`${styles.cropHandle} ${styles[`cropHandle_${mode}`]}`} onPointerDown={(event) => startCrop(event, mode)} onPointerMove={moveCrop} onPointerUp={endCrop} />)}
          </div> : null}
        </div>
      </div>
    </aside>
  );
}
