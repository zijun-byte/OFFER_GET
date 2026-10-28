import { NextRequest, NextResponse } from 'next/server';
import { photoBindings } from '../../../../../lib/photo/cloudflareStore';
import { photoInputKey, photoJobKey, photoResultKey, type PhotoJob } from '../../../../../lib/photo/jobTypes';
import { startLocalPhotoJob } from '../../../../../lib/photo/localJobRunner';

const COOKIE = 'offerget_photo_device';
type Context = { params: Promise<{ id: string }> };

async function ownedJob(request: NextRequest, context: Context) {
  const owner = request.cookies.get(COOKIE)?.value || '';
  const { id } = await context.params;
  if (!/^[a-f0-9-]{36}$/.test(owner) || !/^[a-f0-9-]{36}$/.test(id)) return null;
  const { kv } = await photoBindings();
  const value = await kv.get(photoJobKey(owner, id));
  return value ? { kv, owner, id, job: JSON.parse(value) as PhotoJob } : null;
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const owned = await ownedJob(request, context);
    if (!owned) return NextResponse.json({ error: '任务不存在或已过期。' }, { status: 404 });
    if (owned.job.status === 'queued' || owned.job.status === 'processing') startLocalPhotoJob(owned.kv, owned.owner, owned.job);
    const imageUrl = owned.job.status === 'completed' ? await owned.kv.get(photoResultKey(owned.id)) : null;
    return NextResponse.json({ job: owned.job, imageUrl });
  } catch {
    return NextResponse.json({ error: '任务状态暂时不可用。' }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const owned = await ownedJob(request, context);
    if (!owned) return NextResponse.json({ error: '任务不存在或已过期。' }, { status: 404 });
    if (owned.job.status === 'queued' || owned.job.status === 'processing') {
      return NextResponse.json({ error: '生成中的任务暂不能删除。' }, { status: 409 });
    }
    await Promise.all([owned.kv.delete(photoJobKey(owned.owner, owned.id)), owned.kv.delete(photoResultKey(owned.id)), owned.kv.delete(photoInputKey(owned.id))]);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: '删除失败，请稍后重试。' }, { status: 503 });
  }
}
