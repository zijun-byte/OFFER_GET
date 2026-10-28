import { PHOTO_RESULT_TTL, photoInputKey, photoJobKey, photoResultKey, type PhotoJob } from '../lib/photo/jobTypes';

type Kv = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
  delete(key: string): Promise<void>;
};
type Message = { body: { id?: string; owner?: string }; attempts: number; retry(options?: { delaySeconds?: number }): void };
type Environment = { PHOTO_JOBS: Kv; APP: { fetch(input: RequestInfo, init?: RequestInit): Promise<Response> } };

export default {
  async queue(batch: { messages: Message[] }, env: Environment) {
    for (const message of batch.messages) {
      const { id, owner } = message.body || {};
      if (!id || !owner || !/^[a-f0-9-]{36}$/.test(id) || !/^[a-f0-9-]{36}$/.test(owner)) continue;
      const key = photoJobKey(owner, id);
      const [rawJob, rawInput] = await Promise.all([env.PHOTO_JOBS.get(key), env.PHOTO_JOBS.get(photoInputKey(id))]);
      if (!rawJob) continue;
      const job = JSON.parse(rawJob) as PhotoJob;
      if (job.status === 'completed' || job.status === 'failed') {
        await env.PHOTO_JOBS.delete(photoInputKey(id));
        continue;
      }
      if (await env.PHOTO_JOBS.get(photoResultKey(id))) {
        await env.PHOTO_JOBS.put(key, JSON.stringify({ ...job, status: 'completed', expiresAt: Date.now() + PHOTO_RESULT_TTL * 1000 }), { expirationTtl: PHOTO_RESULT_TTL });
        await env.PHOTO_JOBS.delete(photoInputKey(id));
        continue;
      }
      if (!rawInput) {
        if (message.attempts < 3) { message.retry({ delaySeconds: 15 }); continue; }
        await env.PHOTO_JOBS.put(key, JSON.stringify({ ...job, status: 'failed', error: '原图暂存已过期，请重新提交。' }), { expirationTtl: PHOTO_RESULT_TTL });
        continue;
      }

      try {
        await env.PHOTO_JOBS.put(key, JSON.stringify({ ...job, status: 'processing' }), { expirationTtl: PHOTO_RESULT_TTL });
        const response = await env.APP.fetch('https://offerget.internal/api/photo/enhance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: rawInput,
        });
        const result = await response.json() as { imageUrl?: string; error?: string };
        if (!response.ok || !result.imageUrl?.startsWith('data:image/')) throw new Error(result.error || '图像生成失败。');
        await env.PHOTO_JOBS.put(photoResultKey(id), result.imageUrl, { expirationTtl: PHOTO_RESULT_TTL });
        await env.PHOTO_JOBS.put(key, JSON.stringify({ ...job, status: 'completed', expiresAt: Date.now() + PHOTO_RESULT_TTL * 1000 }), { expirationTtl: PHOTO_RESULT_TTL });
      } catch {
        await env.PHOTO_JOBS.put(key, JSON.stringify({ ...job, status: 'failed', error: '生成失败，请重新提交照片。' }), { expirationTtl: PHOTO_RESULT_TTL });
      } finally {
        await env.PHOTO_JOBS.delete(photoInputKey(id));
      }
    }
  },
};
