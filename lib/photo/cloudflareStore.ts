import { getCloudflareContext } from '@opennextjs/cloudflare';

export type PhotoKv = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options: { prefix: string; limit: number }): Promise<{ keys: { name: string }[] }>;
};

export async function photoBindings(): Promise<{ kv: PhotoKv; queue: { send(body: unknown): Promise<void> } }> {
  const { env } = await getCloudflareContext({ async: true });
  const bound = env as CloudflareEnv & { PHOTO_JOBS?: PhotoKv; PHOTO_QUEUE?: { send(body: unknown): Promise<void> } };
  if (!bound.PHOTO_JOBS || !bound.PHOTO_QUEUE) throw new Error('照片任务存储或队列尚未配置。');
  return { kv: bound.PHOTO_JOBS, queue: bound.PHOTO_QUEUE };
}
