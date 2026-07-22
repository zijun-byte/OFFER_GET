'use client';

import Link from 'next/link';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
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
import ParticleBackdrop from './ParticleBackdrop';
import PhotoUploadPanel from './PhotoUploadPanel';
import StyleChoiceGrid from './StyleChoiceGrid';

const navItems = [
  { label: '证件照优化', href: '/id-photo-optimization-rebuilt', active: true },
  { label: '简历优化', href: '/resume-optimization' },
  { label: '提前问答', href: '/advance-qa' },
  { label: '运势占卜', href: '/tarot-fortune' },
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
  const [customPrompt, setCustomPrompt] = useState('');
  const [fileName, setFileName] = useState('未选择文件');
  const [previewUrl, setPreviewUrl] = useState('');
  const [sourceImageDataUrl, setSourceImageDataUrl] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [freeCropArea, setFreeCropArea] = useState<CropArea>({ x: 18, y: 12, width: 64, height: 72 });
  const [exportError, setExportError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultReady, setResultReady] = useState(false);

  const previewImageUrl = useMemo(() => previewUrl, [previewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!generatedImageUrl) return;

    setGeneratedImageUrl('');
    setResultReady(false);
    setExportError('');
  }, [previewUrl, selectedBackground, selectedModernStyle, selectedStyle, customPrompt]);

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    if (!file) {
      setFileName('未选择文件');
      setPreviewUrl('');
      setSourceImageDataUrl('');
      setGeneratedImageUrl('');
      return;
    }

    setFileName(file.name);
    setPreviewUrl(URL.createObjectURL(file));
    setSourceImageDataUrl('');
    setGeneratedImageUrl('');
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
    setResultReady(false);
    setGeneratedImageUrl('');
    setExportError('');


    try {
      if (!sourceImageDataUrl) throw new Error('照片正在准备中，请稍后再试。');

      const response = await fetch('/api/photo/enhance', {
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
      const payload = (await response.json()) as { error?: string; imageUrl?: string };
      if (!response.ok || !payload.imageUrl) throw new Error(payload.error || '图像模型没有返回结果。');

      setGeneratedImageUrl(payload.imageUrl);
      setResultReady(true);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : '生成失败，请重新上传照片后再试。');
    } finally {
      setIsProcessing(false);
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

  return (
    <main className={styles.root}>
      <ParticleBackdrop />

      <div className={styles.page}>
        <header className={styles.siteHeader}>
          <Link className={styles.brand} href="/">
            <span className={styles.brandName}>Offer_GET</span>
            <span className={styles.brandTagline}>证件照优化工作台</span>
          </Link>

          <nav className={styles.nav} aria-label="主导航">
            {navItems.map((item) => (
              <Link className={item.active ? styles.navCurrent : undefined} href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
            <Link className={styles.navPrimary} href="/">
              开始准备
            </Link>
          </nav>
        </header>

        <section className={styles.hero} aria-labelledby="hero-title">
          <div>
            <span className={styles.eyebrow}>AI 证件照优化 / 为求职第一印象做准备</span>
            <h1 id="hero-title" className={styles.heroTitle}>
              普通照片，可以让你很专业
            </h1>
            <p className={styles.heroCopy}>
              先上传一张照片，再选择你喜欢的方向：传统证件照、新式证件照，或自定义照片设计。页面会提供预览感、风格感和输出感，让你在求职前准备里更从容一点。
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.button} href="#upload">
                上传照片
              </Link>
              <Link className={`${styles.button} ${styles.secondaryButton}`} href="#choices">
                选择风格
              </Link>
            </div>
          </div>

          <PhotoUploadPanel
            fileName={fileName}
            previewImageUrl={previewImageUrl}
            onPhotoChange={handlePhotoChange}
          />
        </section>

        <StyleChoiceGrid selectedStyle={selectedStyle} onSelectStyle={setSelectedStyle} />
        <IdPhotoPreview
          fileName={fileName}
          freeCropArea={freeCropArea}
          generatedImageUrl={generatedImageUrl}
          customPrompt={customPrompt}
          exportError={exportError}
          isProcessing={isProcessing}
          onDownload={handleDownload}
          onOptimize={handleOptimize}
          previewImageUrl={previewImageUrl}
          resultReady={resultReady}
          selectedBackground={selectedBackground}
          selectedModernStyle={selectedModernStyle}
          selectedSize={selectedSize}
          selectedStyle={selectedStyle}
          setCustomPrompt={setCustomPrompt}
          setFreeCropArea={setFreeCropArea}
          setSelectedBackground={setSelectedBackground}
          setSelectedModernStyle={setSelectedModernStyle}
          setSelectedSize={handleSelectSize}
        />
      </div>
    </main>
  );
}
