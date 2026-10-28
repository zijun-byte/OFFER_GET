import { NextRequest, NextResponse } from 'next/server';
import { photoBindings } from '../../../../lib/photo/cloudflareStore';
import { PHOTO_INPUT_TTL, PHOTO_RESULT_TTL, photoInputKey, photoJobKey, type PhotoJob } from '../../../../lib/photo/jobTypes';
import { startLocalPhotoJob } from '../../../../lib/photo/localJobRunner';

const COOKIE = 'offerget_photo_device';

export async function GET(request: NextRequest) {
  const owner = request.cookies.get(COOKIE)?.value;
  if (!owner || !/^[a-f0-9-]{36}$/.test(owner)) return NextResponse.json({ jobs: [] });
  try {
    const { kv } = await photoBindings();
    const names = await kv.list({ prefix: `photo-job:${owner}:`, limit: 100 });
    const jobs = (await Promise.all(names.keys.map((key) => kv.get(key.name))))
      .filter((value): value is string => Boolean(value))
      .map((value) => JSON.parse(value) as PhotoJob)
      .sort((a, b) => b.createdAt - a.createdAt);
    if (process.env.NODE_ENV === 'development') {
      for (const job of jobs) {
        if (job.status === 'queued' || job.status === 'processing') startLocalPhotoJob(kv, owner, job);
      }
    }
    return NextResponse.json({ jobs });
  } catch {
    return NextResponse.json({ error: '暂时无法读取照片任务。' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(body.image) || body.image.length > 12 * 1024 * 1024) {
    return NextResponse.json({ error: '请上传 8MB 以内的 JPG、PNG 或 WebP 照片。' }, { status: 400 });
  }
  if (!['traditional', 'modern', 'custom'].includes(body.style)) return NextResponse.json({ error: '请选择生成风格。' }, { status: 400 });

  try {
    const { kv, queue } = await photoBindings();
    const owner = /^[a-f0-9-]{36}$/.test(request.cookies.get(COOKIE)?.value || '') ? request.cookies.get(COOKIE)!.value : crypto.randomUUID();
    const id = crypto.randomUUID();
    const createdAt = Date.now();
    const job: PhotoJob = { id, status: 'queued', createdAt, expiresAt: createdAt + PHOTO_RESULT_TTL * 1000, style: body.style, size: String(body.size || '简历头像').slice(0, 80) };
    const input = JSON.stringify({ image: body.image, style: body.style, size: job.size, background: String(body.background || '').slice(0, 80), modernStyle: String(body.modernStyle || '').slice(0, 80), customPrompt: String(body.customPrompt || '').slice(0, 1000) });
    await kv.put(photoInputKey(id), input, { expirationTtl: PHOTO_INPUT_TTL });
    await kv.put(photoJobKey(owner, id), JSON.stringify(job), { expirationTtl: PHOTO_RESULT_TTL });
    try {
      if (process.env.NODE_ENV === 'development') startLocalPhotoJob(kv, owner, job);
      else await queue.send({ id, owner });
    } catch (error) {
      await Promise.all([kv.delete(photoInputKey(id)), kv.delete(photoJobKey(owner, id))]);
      throw error;
    }
    const response = NextResponse.json({ job }, { status: 202 });
    response.cookies.set(COOKIE, owner, { httpOnly: true, sameSite: 'lax', secure: request.nextUrl.protocol === 'https:', path: '/', maxAge: PHOTO_RESULT_TTL });
    return response;
  } catch {
    return NextResponse.json({ error: '无法创建生成任务，请稍后重试。' }, { status: 503 });
  }
}
