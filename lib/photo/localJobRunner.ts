import { POST as enhancePhoto } from '../../app/api/photo/enhance/route';
import { PHOTO_RESULT_TTL, photoInputKey, photoJobKey, photoResultKey, type PhotoJob } from './jobTypes';
import type { PhotoKv } from './cloudflareStore';

const running = new Set<string>();

export function startLocalPhotoJob(kv: PhotoKv, owner: string, job: PhotoJob) {
  if (process.env.NODE_ENV !== 'development' || running.has(job.id)) return;
  running.add(job.id);
  void (async () => {
    const key = photoJobKey(owner, job.id);
    try {
      const input = await kv.get(photoInputKey(job.id));
      if (!input) throw new Error('原图暂存已过期，请重新提交。');
      await kv.put(key, JSON.stringify({ ...job, status: 'processing' }), { expirationTtl: PHOTO_RESULT_TTL });
      const response = await enhancePhoto(new Request('http://localhost/api/photo/enhance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: input,
      }));
      const payload = await response.json() as { imageUrl?: string; error?: string };
      if (!response.ok || !payload.imageUrl?.startsWith('data:image/')) throw new Error(payload.error || '图像生成失败。');
      await kv.put(photoResultKey(job.id), payload.imageUrl, { expirationTtl: PHOTO_RESULT_TTL });
      await kv.put(key, JSON.stringify({ ...job, status: 'completed', expiresAt: Date.now() + PHOTO_RESULT_TTL * 1000 }), { expirationTtl: PHOTO_RESULT_TTL });
    } catch (error) {
      await kv.put(key, JSON.stringify({ ...job, status: 'failed', error: error instanceof Error ? error.message : '图像生成失败。' }), { expirationTtl: PHOTO_RESULT_TTL });
    } finally {
      await kv.delete(photoInputKey(job.id));
      running.delete(job.id);
    }
  })();
}
