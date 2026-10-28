'use client';

import SiteShell from '../components/SiteShell';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import styles from './IdPhotoPage.module.css';
import IdPhotoPreview from './IdPhotoPreview';
import {
  backgroundOptions,
  modernStyleOptions,
  sizeOptions,
  type BackgroundKey,
  type ModernStyleKey,
  type SizeKey,
  type StyleKey,
} from './idPhotoContent';
import PhotoUploadPanel from './PhotoUploadPanel';
import GlassDropdown from './GlassDropdown';
import type { PhotoJob } from '../../lib/photo/jobTypes';

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

function estimatePhotoProgress(job: PhotoJob) {
  if (job.status === 'queued') return 3;
  if (job.status === 'processing') {
    const elapsed = Math.max(0, Date.now() - (job.processingAt || job.createdAt));
    const elapsedEstimate = 8 + 87 * (1 - Math.exp(-elapsed / 12_000));
    return Math.min(95, Math.max(job.progress || 8, Math.round(elapsedEstimate)));
  }
  return job.status === 'completed' ? 100 : 0;
}

const modeOptions: { key: StyleKey; label: string }[] = [
  { key: 'traditional', label: '传统证件照' },
  { key: 'modern', label: '新式证件照' },
  { key: 'custom', label: '自定义' },
];

type CropArea = {
  height: number;
  width: number;
  x: number;
  y: number;
};

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('照片读取失败，请重新上传一张清晰图片。'));
    image.src = src;
  });
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('图片读取失败。')));
    reader.onerror = () => reject(new Error('图片读取失败。'));
    reader.readAsDataURL(file);
  });
}

async function cropImageDataUrl(src: string, cropArea: CropArea) {
  const image = await loadImage(src);
  const sourceX = (cropArea.x / 100) * image.naturalWidth;
  const sourceY = (cropArea.y / 100) * image.naturalHeight;
  const sourceWidth = (cropArea.width / 100) * image.naturalWidth;
  const sourceHeight = (cropArea.height / 100) * image.naturalHeight;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('当前浏览器不支持图片导出，请换一个浏览器再试。');
  }

  canvas.width = Math.round(sourceWidth);
  canvas.height = Math.round(sourceHeight);
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/png');
}

async function exportFixedSizeDataUrl(src: string, size: SizeKey) {
  const image = await loadImage(src);
  const { height, width } = sizeOptions[size];
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('当前浏览器不支持图片导出，请换一个浏览器再试。');
  }

  canvas.width = width;
  canvas.height = height;

  const targetRatio = width / height;
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const sourceWidth = imageRatio > targetRatio ? image.naturalHeight * targetRatio : image.naturalWidth;
  const sourceHeight = imageRatio > targetRatio ? image.naturalHeight : image.naturalWidth / targetRatio;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;

  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);

  return canvas.toDataURL('image/png');
}


export default function IdPhotoOptimizationPage() {
  const [selectedStyle, setSelectedStyle] = useState<StyleKey>('traditional');
  const [selectedBackground, setSelectedBackground] = useState<BackgroundKey>('blue');
  const [selectedModernStyle, setSelectedModernStyle] = useState<ModernStyleKey>('style1');
  const [selectedSize, setSelectedSize] = useState<SizeKey>('resume');
  const lastStandardSize = useRef<SizeKey>('resume');
  const [customPrompt, setCustomPrompt] = useState('');
  const [fileName, setFileName] = useState('未选择文件');
  const [previewUrl, setPreviewUrl] = useState('');
  const [sourceImageDataUrl, setSourceImageDataUrl] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [freeCropArea, setFreeCropArea] = useState<CropArea>({ x: 18, y: 12, width: 64, height: 72 });
  const [exportError, setExportError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [generationStage, setGenerationStage] = useState<'queued' | 'processing' | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [resultReady, setResultReady] = useState(false);
  const [showingOriginal, setShowingOriginal] = useState(false);
  const [activeJobId, setActiveJobId] = useState('');

  const previewImageUrl = useMemo(() => previewUrl, [previewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      const rememberedId = window.localStorage.getItem('offerget-active-photo-job');
      const hasRememberedId = Boolean(rememberedId && /^[a-f0-9-]{36}$/.test(rememberedId));
      if (hasRememberedId) {
        setActiveJobId(rememberedId!);
        setIsProcessing(true);
      } else if (rememberedId) {
        window.localStorage.removeItem('offerget-active-photo-job');
      }
      try {
        const response = await fetch('/api/photo/jobs', { cache: 'no-store' });
        if (!response.ok) throw new Error('任务状态暂时无法读取。');
        const data = await response.json() as { jobs?: PhotoJob[] };
        if (cancelled) return;
        const jobs = data.jobs || [];
        const remembered = rememberedId ? jobs.find((job) => job.id === rememberedId) : undefined;
        const latestActive = jobs.find((job) => job.status === 'queued' || job.status === 'processing');
        const job = remembered || (!hasRememberedId ? latestActive : undefined);
        if (!job) {
          return;
        }
        window.localStorage.setItem('offerget-active-photo-job', job.id);
        setActiveJobId(job.id);
        setIsProcessing(job.status === 'queued' || job.status === 'processing');
        setGenerationStage(job.status === 'queued' || job.status === 'processing' ? job.status : null);
        setGenerationProgress(estimatePhotoProgress(job));
      } catch {
        // The poll below will surface transient read failures when an id is known.
      }
    };
    void restore();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!activeJobId) return;
    let cancelled = false;
    let terminalHandled = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/photo/jobs/${activeJobId}`, { cache: 'no-store' });
        if (cancelled) return;
        if (response.status === 404) {
          window.localStorage.removeItem('offerget-active-photo-job');
          setActiveJobId('');
          setIsProcessing(false);
          setGenerationStage(null);
          setGenerationProgress(0);
          setExportError('生成任务已过期或不可读取，请重新选择照片生成。');
          return;
        }
        if (!response.ok) throw new Error('任务状态暂时无法读取，正在重试。');
        const payload = await response.json() as { job: PhotoJob; imageUrl?: string | null };
        if (cancelled) return;
        if (terminalHandled) return;
        if (payload.job.status === 'queued' || payload.job.status === 'processing') {
          setGenerationStage(payload.job.status);
          const estimatedProgress = estimatePhotoProgress(payload.job);
          setIsProcessing(true);
          setGenerationProgress((current) => Math.max(current, payload.job.status === 'queued' ? 3 : estimatedProgress));
          setExportError('');
          return;
        }
        if (payload.job.status === 'completed' && payload.imageUrl) {
          terminalHandled = true;
          setGenerationProgress(100);
          setExportError('');
          const revealResult = () => {
            if (cancelled) return;
            window.localStorage.removeItem('offerget-active-photo-job');
            setActiveJobId('');
            setIsProcessing(false);
            setGenerationStage(null);
            setGeneratedImageUrl(payload.imageUrl!);
            setResultReady(true);
          };
          if (isProcessing) window.setTimeout(revealResult, 450);
          else revealResult();
        } else {
          terminalHandled = true;
          window.localStorage.removeItem('offerget-active-photo-job');
          setActiveJobId('');
          setIsProcessing(false);
          setGenerationStage(null);
          setGenerationProgress(0);
          setGeneratedImageUrl('');
          setResultReady(false);
          setExportError(payload.job.error || '生成失败，请重新提交。');
        }
      } catch (error) {
        if (!cancelled) setExportError(error instanceof Error ? error.message : '任务状态暂时不可用。');
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 2500);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [activeJobId]);

  useEffect(() => {
    if (generationStage !== 'processing') return;
    const timer = window.setInterval(() => setGenerationProgress((value) => Math.min(95, value + Math.max(0.5, (95 - value) * 0.08))), 1000);
    return () => window.clearInterval(timer);
  }, [generationStage]);

  useEffect(() => {
    if (!generatedImageUrl) return;

    setGeneratedImageUrl('');
    setShowingOriginal(false);
    setResultReady(false);
    setExportError('');
  }, [previewUrl, selectedBackground, selectedModernStyle, selectedStyle, customPrompt]);

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    window.localStorage.removeItem('offerget-active-photo-job');
    setActiveJobId('');
    setIsProcessing(false);
    setGenerationStage(null);

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    if (!file) {
      setFileName('未选择文件');
      setPreviewUrl('');
      setSourceImageDataUrl('');
      setGeneratedImageUrl('');
      setShowingOriginal(false);
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      event.target.value = '';
      setFileName('未选择文件');
      setPreviewUrl('');
      setSourceImageDataUrl('');
      setGeneratedImageUrl('');
      setShowingOriginal(false);
      setResultReady(false);
      setExportError(`这张照片有 ${(file.size / 1024 / 1024).toFixed(1)}MB，超过 8MB 上限。请压缩或换一张后再上传。`);
      return;
    }

    setFileName(file.name);
    setPreviewUrl(URL.createObjectURL(file));
    setSourceImageDataUrl('');
    setGeneratedImageUrl('');
    setShowingOriginal(false);
    setExportError('');
    setResultReady(false);

    try {
      setSourceImageDataUrl(await readFileAsDataUrl(file));
    } catch (error) {
      setExportError(error instanceof Error ? error.message : '图片读取失败，请重新上传。');
    }
  }

  async function handleOptimize() {
    if (!previewImageUrl || isProcessing) return;

    setIsProcessing(true);
    setGenerationStage('queued');
    setGenerationProgress(0);
    setExportError('');
    setShowingOriginal(false);
    try {
      if (!sourceImageDataUrl) throw new Error('照片正在准备中，请稍后再试。');

      const response = await fetch('/api/photo/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          background: selectedStyle === 'traditional' ? backgroundOptions[selectedBackground].label : undefined,
          customPrompt,
          image: sourceImageDataUrl,
          modernStyle: selectedStyle === 'modern' ? modernStyleOptions[selectedModernStyle].label : undefined,
          size: sizeOptions[selectedSize].label,
          style: selectedStyle,
        }),
      });
      const payload = (await response.json()) as { error?: string; job?: PhotoJob };
      if (!response.ok || !payload.job) throw new Error(payload.error || '创建任务失败。');
      window.localStorage.setItem('offerget-active-photo-job', payload.job.id);
      setActiveJobId(payload.job.id);
      setGenerationStage(payload.job.status === 'processing' ? 'processing' : 'queued');
    } catch (error) {
      setExportError(error instanceof Error ? error.message : '生成失败，请重新上传照片后再试。');
      setIsProcessing(false);
      setGenerationStage(null);
      setGenerationProgress(0);
    }
  }

  function handleSelectSize(size: SizeKey) {
    setSelectedSize(size);
  }

  async function handleDownload() {
    if (!generatedImageUrl) return;

    try {
      const href =
        selectedSize === 'free'
          ? await cropImageDataUrl(generatedImageUrl, freeCropArea)
          : generatedImageUrl;
      const link = document.createElement('a');
      link.href = href;
      link.download = `offer-get-${sizeOptions[selectedSize].label}-${selectedStyle}.png`;
      link.click();
    } catch (error) {
      setExportError(error instanceof Error ? error.message : '下载失败，请重新生成后再试。');
    }
  }

  function handleGeneratedImageError() {
    setIsProcessing(false);
    setGenerationStage(null);
    setGenerationProgress(0);
    setResultReady(false);
    setGeneratedImageUrl('');
    setExportError('任务已完成，但生成图片读取失败。请到用户中心重新查看作品，或重新生成。');
  }

  return (
    <SiteShell active="photo">

      <div className={styles.page}>

        <div className={styles.studioGrid}>
          <PhotoUploadPanel
            fileName={fileName}
            freeCropArea={freeCropArea}
            generatedImageUrl={generatedImageUrl}
            isProcessing={isProcessing}
            previewImageUrl={previewImageUrl}
            resultReady={resultReady}
            selectedSize={selectedSize}
            showingOriginal={showingOriginal}
            selectedStyle={selectedStyle}
            selectedFormLabel={selectedStyle === 'traditional' ? backgroundOptions[selectedBackground].label : selectedStyle === 'modern' ? modernStyleOptions[selectedModernStyle].label : '自定义描述'}
            onSelectStyle={(style) => {
              if (style === 'custom' && selectedStyle !== 'custom') {
                lastStandardSize.current = selectedSize;
                handleSelectSize('resume');
              } else if (selectedStyle === 'custom' && style !== 'custom') {
                handleSelectSize(lastStandardSize.current);
              }
              setSelectedStyle(style);
            }}
            onPhotoChange={handlePhotoChange}
            onToggleOriginal={() => setShowingOriginal((current) => !current)}
            onGeneratedImageError={handleGeneratedImageError}
            setFreeCropArea={setFreeCropArea}
          />
          <div className={styles.settingsCard}>
            <h2>生成设置</h2>
            <div className={styles.desktopModeSelector}><GlassDropdown label="生成模式" value={selectedStyle} options={modeOptions.map((option) => ({ value: option.key, label: option.label }))} onChange={setSelectedStyle} /></div>
            <fieldset className={`${styles.choiceField} ${styles.desktopSizeSelector}`}>
              <legend>照片规格</legend>
              <div className={styles.sizeChips}>
                {(Object.keys(sizeOptions) as SizeKey[]).map((key) => (
                  <button
                    aria-pressed={selectedSize === key}
                    key={key}
                    onClick={() => handleSelectSize(key)}
                    type="button"
                  >
                    <span>{sizeOptions[key].label}</span>
                    <em>{key === 'free' ? '生成后拖动裁剪' : `${sizeOptions[key].width} × ${sizeOptions[key].height}`}</em>
                  </button>
                ))}
              </div>
            </fieldset>
            {selectedStyle !== 'custom' ? <div className={styles.mobileSettingsGrid}>
              <div className={styles.mobileSetting}><span>尺寸</span><GlassDropdown label="照片尺寸" value={selectedSize} options={(Object.keys(sizeOptions) as SizeKey[]).map((key) => ({ value: key, label: sizeOptions[key].label }))} onChange={handleSelectSize} openUp /></div>
              <div className={styles.mobileSetting}><span>形式</span>
                {selectedStyle === 'traditional' ? <GlassDropdown label="背景颜色" value={selectedBackground} options={(Object.keys(backgroundOptions) as BackgroundKey[]).map((key) => ({ value: key, label: backgroundOptions[key].label }))} onChange={setSelectedBackground} openUp /> : null}
                {selectedStyle === 'modern' ? <GlassDropdown label="新式照片样式" value={selectedModernStyle} options={(Object.keys(modernStyleOptions) as ModernStyleKey[]).map((key) => ({ value: key, label: modernStyleOptions[key].label }))} onChange={setSelectedModernStyle} openUp /> : null}
              </div>
            </div> : null}
        <IdPhotoPreview
          fileName={fileName}
          generatedImageUrl={generatedImageUrl}
          customPrompt={customPrompt}
          exportError={exportError}
          isProcessing={isProcessing}
          generationProgress={generationProgress}
          onDownload={handleDownload}
          onOptimize={handleOptimize}
          previewImageUrl={previewImageUrl}
          resultReady={resultReady}
          selectedBackground={selectedBackground}
          selectedModernStyle={selectedModernStyle}
          selectedStyle={selectedStyle}
          setCustomPrompt={setCustomPrompt}
          setSelectedBackground={setSelectedBackground}
          setSelectedModernStyle={setSelectedModernStyle}
        />
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
