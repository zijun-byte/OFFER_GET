'use client';

import { useEffect, useState } from 'react';
import { deletePhotoWork, listPhotoWorks, type PhotoWork } from '../../lib/photo/localWorks';
import styles from './UserCenter.module.css';

export default function PhotoWorks() {
  const [works, setWorks] = useState<PhotoWork[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    listPhotoWorks().then(setWorks).catch(() => setError('当前浏览器无法读取暂存作品。'));
  }, []);

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
    <p>作品在当前浏览器暂存 7 天，之后打开页面时自动清理。上传的原图不保存到作品库。</p>
    {error ? <p role="alert">{error}</p> : null}
    {works.length ? <div className={styles.workGrid}>{works.map((work) => <article className={styles.workCard} key={work.id}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={work.image} alt="已生成的证件照" />
      <div><span>{work.size} · {work.style === 'traditional' ? '传统证件照' : work.style === 'modern' ? '新式证件照' : '自定义'}</span><small>保留至 {new Date(work.expiresAt).toLocaleDateString('zh-CN')}</small></div>
      <div className={styles.workActions}><a href={work.image} download={`offer-get-${work.id}.${work.image.startsWith('data:image/jpeg') ? 'jpg' : work.image.startsWith('data:image/webp') ? 'webp' : 'png'}`}>下载</a><button type="button" onClick={() => void remove(work.id)}>删除</button></div>
    </article>)}</div> : !error ? <p>暂无暂存作品。</p> : null}
  </section>;
}
