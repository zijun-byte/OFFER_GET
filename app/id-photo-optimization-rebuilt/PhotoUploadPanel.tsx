import type { ChangeEvent } from 'react';
import styles from './IdPhotoPage.module.css';

type PhotoUploadPanelProps = {
  fileName: string;
  previewImageUrl: string;
  onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export default function PhotoUploadPanel({ fileName, previewImageUrl, onPhotoChange }: PhotoUploadPanelProps) {
  return (
    <aside className={styles.workspaceShell} aria-label="上传预览区域">
      <div className={styles.workspaceTitle}>
        <span>照片导入</span>
      </div>
      <div className={styles.uploadPanel} id="upload">
        <label className={`${styles.dropzone} ${previewImageUrl ? styles.hasImage : ''}`} htmlFor="photo-input">
          <input
            className={styles.fileInput}
            id="photo-input"
            type="file"
            accept="image/*"
            onChange={onPhotoChange}
          />
          <div className={styles.dropzoneContent}>
            <div className={styles.uploadIcon}>+</div>
            <h2>点击上传你的照片</h2>
            <p>支持 JPG / PNG / WebP。上传后可在此区域直接查看初步预览。</p>
            <div className={styles.dropzoneActions}>
              <span className={styles.button}>选择本地图片</span>
              <span className={`${styles.button} ${styles.secondaryButton}`}>拖入也可以</span>
            </div>
          </div>
          {previewImageUrl ? <img src={previewImageUrl} alt="上传照片预览" /> : null}
        </label>
        <div className={styles.fileMeta}>
          <span>状态</span>
          <span className={styles.fileName}>{fileName}</span>
        </div>
      </div>
    </aside>
  );
}
