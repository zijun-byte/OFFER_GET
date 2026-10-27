import type { ChangeEvent } from 'react';
import styles from './IdPhotoPage.module.css';
import PhotoMascot from './PhotoMascot';
import type { StyleKey } from './idPhotoContent';

type PhotoUploadPanelProps = {
  fileName: string;
  previewImageUrl: string;
  selectedStyle: StyleKey;
  selectedFormLabel: string;
  onSelectStyle: (style: StyleKey) => void;
  onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

const stylesList: { key: StyleKey; label: string }[] = [
  { key: 'traditional', label: '传统证件照' },
  { key: 'modern', label: '新式证件照' },
  { key: 'custom', label: '自定义' },
];

export default function PhotoUploadPanel({ fileName, previewImageUrl, selectedStyle, selectedFormLabel, onSelectStyle, onPhotoChange }: PhotoUploadPanelProps) {
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
        <label className={`${styles.dropzone} ${previewImageUrl ? styles.hasImage : ''}`} htmlFor="photo-input">
          <input
            className={styles.fileInput}
            id="photo-input"
            type="file"
            accept="image/*"
            onChange={onPhotoChange}
          />
          <div className={styles.dropzoneContent}>
            <PhotoMascot />
            <h2>选择一张清晰正面照</h2>
            <p>支持 JPG、PNG、WebP，单张不超过 8MB</p>
            <div className={styles.dropzoneActions}>
              <span className={styles.button}>上传照片</span>
            </div>
          </div>
          {previewImageUrl ? <img src={previewImageUrl} alt="上传照片预览" /> : null}
        </label>
      </div>
    </aside>
  );
}
