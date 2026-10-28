'use client';

import { useEffect, useState } from 'react';
import { deletePhotoWork, listPhotoWorks, type PhotoWork } from '../../lib/photo/localWorks';
import type { PhotoJob } from '../../lib/photo/jobTypes';
import styles from './UserCenter.module.css';

export default function PhotoWorks() {
  const [works, setWorks] = useState<PhotoWork[]>([]);
  const [jobs, setJobs] = useState<PhotoJob[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    listPhotoWorks().then(setWorks).catch(() => setError('当前浏览器无法读取暂存作品。'));
    const refresh = () => fetch('/api/photo/jobs', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: { jobs: PhotoJob[] }) => setJobs(data.jobs))
      .catch(() => setError('暂时无法读取云端照片任务。'));
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, []);

  async function showResult(id: string) {
    try {
      const response = await fetch(`/api/photo/jobs/${id}`);
      if (!response.ok) throw new Error();
      const payload = await response.json() as { imageUrl?: string };
      if (!payload.imageUrl) throw new Error();
      setImages((current) => ({ ...current, [id]: payload.imageUrl! }));
    } catch {
      setError('作品读取失败，请稍后再试。');
    }
  }

  async function removeJob(id: string) {
    try {
      const response = await fetch(`/api/photo/jobs/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      setJobs((current) => current.filter((job) => job.id !== id));
    } catch {
      setError('任务删除失败，请稍后重试。');
    }
  }

  async function remove(id: string) {
    try {
      await deletePhotoWork(id);
      setWorks((current) => current.filter((work) => work.id !== id));
    } catch {
      setError('删除失败，请稍后重试。');
    }
  }

  return <section className={styles.works} aria-label="我的证件照作品">
    <h2>我的证件照作品</h2>
    <p>生成任务绑定当前浏览器。作品保留 7 天，上传原图在任务结束后删除。</p>
    {error ? <p role="alert">{error}</p> : null}
    {jobs.length ? <div className={styles.workGrid}>{jobs.map((job) => <article className={styles.workCard} key={job.id}>
      {images[job.id] ? <img src={images[job.id]} alt="已生成的证件照" /> : <div className={styles.workPlaceholder}>{job.status === 'completed' ? '作品已生成' : job.status === 'failed' ? '生成失败' : '正在生成'}</div>}
      <div><span>{job.size} · {job.style === 'traditional' ? '传统证件照' : job.style === 'modern' ? '新式证件照' : '自定义'}</span>{job.status === 'completed' ? <small>保留至 {new Date(job.expiresAt).toLocaleDateString('zh-CN')}</small> : job.status === 'failed' ? <small>{job.error || '请重新提交照片'}</small> : null}</div>
      <div className={styles.workActions}>{job.status === 'completed' && !images[job.id] ? <button type="button" onClick={() => void showResult(job.id)}>查看作品</button> : null}{images[job.id] ? <a href={images[job.id]} download={`offer-get-${job.id}.png`}>下载</a> : null}{job.status === 'completed' || job.status === 'failed' ? <button type="button" onClick={() => void removeJob(job.id)}>删除</button> : null}</div>
    </article>)}</div> : null}
    {works.length ? <div className={styles.workGrid}>{works.map((work) => <article className={styles.workCard} key={work.id}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={work.image} alt="已生成的证件照" />
      <div><span>{work.size} · {work.style === 'traditional' ? '传统证件照' : work.style === 'modern' ? '新式证件照' : '自定义'}</span><small>保留至 {new Date(work.expiresAt).toLocaleDateString('zh-CN')}</small></div>
      <div className={styles.workActions}><a href={work.image} download={`offer-get-${work.id}.${work.image.startsWith('data:image/jpeg') ? 'jpg' : work.image.startsWith('data:image/webp') ? 'webp' : 'png'}`}>下载</a><button type="button" onClick={() => void remove(work.id)}>删除</button></div>
    </article>)}</div> : !error && !jobs.length ? <p>暂无暂存作品。</p> : null}
  </section>;
}
