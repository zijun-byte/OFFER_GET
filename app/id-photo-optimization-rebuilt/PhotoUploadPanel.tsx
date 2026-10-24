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
            <div className={styles.uploadIcon} aria-hidden="true"><span /><i /></div>
            <h2>选择一张清晰正面照</h2>
            <p>支持 JPG、PNG、WebP，单张不超过 8MB</p>
            <div className={styles.dropzoneActions}>
              <span className={styles.button}>上传照片</span>
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
