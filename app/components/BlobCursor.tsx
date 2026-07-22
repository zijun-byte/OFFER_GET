'use client';

import { useCallback, useEffect, useRef } from 'react';
import gsap from 'gsap';
import styles from './BlobCursor.module.css';

type BlobCursorProps = {
  blobType?: 'circle' | 'square';
  fillColor?: string;
  trailCount?: number;
  sizes?: number[];
  innerSizes?: number[];
  innerColor?: string;
  opacities?: number[];
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  filterId?: string;
  filterStdDeviation?: number;
  filterColorMatrixValues?: string;
  useFilter?: boolean;
  fastDuration?: number;
  slowDuration?: number;
  fastEase?: string;
  slowEase?: string;
  zIndex?: number;
};

export default function BlobCursor({
  blobType = 'circle',
  fillColor = '#dff8df',
  trailCount = 2,
  sizes = [34, 58],
  innerSizes = [10, 18],
  innerColor = 'rgba(255,255,255,0.72)',
  opacities = [0.74, 0.3],
  shadowColor = 'rgba(24,163,95,0.18)',
  shadowBlur = 16,
  shadowOffsetX = 0,
  shadowOffsetY = 0,
  filterId = 'offer-blob-cursor',
  filterStdDeviation = 18,
  filterColorMatrixValues = '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 28 -8',
  useFilter = true,
  fastDuration = 0.12,
  slowDuration = 0.42,
  fastEase = 'power3.out',
  slowEase = 'power1.out',
  zIndex = 80,
}: BlobCursorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const blobsRef = useRef<Array<HTMLDivElement | null>>([]);

  const handleMove = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const firstTouch = 'touches' in event ? event.touches[0] : undefined;
      const x = firstTouch ? firstTouch.clientX : (event as MouseEvent).clientX;
      const y = firstTouch ? firstTouch.clientY : (event as MouseEvent).clientY;

      blobsRef.current.forEach((element, index) => {
        if (!element) return;
        const isLead = index === 0;
        gsap.to(element, {
          x,
          y,
          duration: isLead ? fastDuration : slowDuration,
          ease: isLead ? fastEase : slowEase,
        });
      });
    },
    [fastDuration, fastEase, slowDuration, slowEase],
  );

  useEffect(() => {
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
      gsap.killTweensOf(blobsRef.current.filter(Boolean));
    };
  }, [handleMove]);

  return (
    <div
      ref={containerRef}
      className={styles.container}
      style={{ '--blob-cursor-z-index': zIndex } as React.CSSProperties}
      aria-hidden="true"
    >
      {useFilter && (
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation={filterStdDeviation} />
            <feColorMatrix in="blur" values={filterColorMatrixValues} />
          </filter>
        </svg>
      )}

      <div className={styles.blobMain} style={{ filter: useFilter ? `url(#${filterId})` : undefined }}>
        {Array.from({ length: trailCount }).map((_, index) => {
          const size = sizes[index] ?? sizes[sizes.length - 1] ?? 40;
          const innerSize = innerSizes[index] ?? innerSizes[innerSizes.length - 1] ?? 12;

          return (
            <div
              key={index}
              ref={(element) => {
                blobsRef.current[index] = element;
              }}
              className={styles.blob}
              style={{
                width: size,
                height: size,
                borderRadius: blobType === 'circle' ? '50%' : '0%',
                backgroundColor: fillColor,
                opacity: opacities[index] ?? opacities[opacities.length - 1] ?? 0.5,
                boxShadow: `${shadowOffsetX}px ${shadowOffsetY}px ${shadowBlur}px 0 ${shadowColor}`,
              }}
            >
              <div
                className={styles.innerDot}
                style={{
                  width: innerSize,
                  height: innerSize,
                  top: (size - innerSize) / 2,
                  left: (size - innerSize) / 2,
                  backgroundColor: innerColor,
                  borderRadius: blobType === 'circle' ? '50%' : '0%',
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
