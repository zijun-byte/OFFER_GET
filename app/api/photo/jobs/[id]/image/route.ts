import { NextRequest, NextResponse } from 'next/server';
import { photoBindings } from '../../../../../../lib/photo/cloudflareStore';
import { photoJobKey, photoResultKey, type PhotoJob } from '../../../../../../lib/photo/jobTypes';

const COOKIE = 'offerget_photo_device';
type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const owner = request.cookies.get(COOKIE)?.value || '';
    const { id } = await context.params;
    if (!/^[a-f0-9-]{36}$/.test(owner) || !/^[a-f0-9-]{36}$/.test(id)) {
      return NextResponse.json({ error: '作品不存在或已过期。' }, { status: 404 });
    }
    const { kv } = await photoBindings();
    const rawJob = await kv.get(photoJobKey(owner, id));
    if (!rawJob) return NextResponse.json({ error: '作品不存在或已过期。' }, { status: 404 });
    const job = JSON.parse(rawJob) as PhotoJob;
    if (job.status !== 'completed') return NextResponse.json({ error: '作品尚未生成完成。' }, { status: 409 });
    const image = await kv.get(photoResultKey(id));
    const match = image?.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return NextResponse.json({ error: '作品读取失败或格式无效。' }, { status: 404 });
    return new NextResponse(Buffer.from(match[2], 'base64'), {
      headers: {
        'Content-Type': match[1],
        'Cache-Control': 'private, max-age=300',
        'Content-Disposition': 'inline',
      },
    });
  } catch {
    return NextResponse.json({ error: '作品暂时无法读取。' }, { status: 503 });
  }
}
