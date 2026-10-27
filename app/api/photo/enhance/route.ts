import { NextResponse } from 'next/server';
import { readAgentByBinding } from '../../../../lib/ai/agentConfig';
import { editSenseNovaImage } from '../../../../lib/ai/providers/senseNovaImage';

type PhotoEnhanceRequest = {
  background?: string;
  customPrompt?: string;
  image?: string;
  modernStyle?: string;
  size?: string;
  style?: 'traditional' | 'modern' | 'custom';
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as PhotoEnhanceRequest | null;
  const image = body?.image?.trim();

  if (!image || !image.startsWith('data:image/')) {
    return NextResponse.json({ error: '请上传 JPG、PNG 或 WebP 图片。' }, { status: 400 });
  }

  if (image.length > 12 * 1024 * 1024) {
    return NextResponse.json({ error: '图片过大，请上传 8MB 以内的照片。' }, { status: 413 });
  }

  try {
    const agent = await readAgentByBinding('photo-enhance');
    if (!agent || agent.kind !== 'image-generation') throw new Error('未找到已绑定的证件照优化 Agent。');
    if (!agent.enabled) throw new Error('证件照优化 Agent 当前已停用。');
    if (agent.provider !== 'sensenova') throw new Error(`当前图像 Agent 使用 ${agent.provider}，但证件照优化仅支持 SenseNova。`);

    const imageUrl = await editSenseNovaImage({
      image,
      model: agent.model,
      prompt: [agent.prompt, buildIdPhotoPrompt(body || {})].join('\n\n'),
    });
    return NextResponse.json({
      agent: { id: agent.id, model: agent.model, promptVersion: agent.promptVersion },
      imageUrl,
      status: 'success',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '图像生成失败，请稍后重试。' },
      { status: 502 },
    );
  }
}

function buildIdPhotoPrompt(input: PhotoEnhanceRequest) {
  const style = input.style === 'modern' ? 'modern, polished but still professional' : 'standard, formal and trustworthy';
  const background = input.style === 'traditional' ? input.background || 'clean blue' : 'clean professional studio background';
  const custom = input.style === 'custom' && input.customPrompt?.trim() ? `User preference: ${input.customPrompt.trim()}` : '';

  return [
    'Use the supplied photo as the only identity reference.',
    'Create a high-quality professional Chinese job-application ID portrait.',
    'Preserve the same person identity, facial features, age, hairstyle, skin tone, and overall likeness.',
    'Front-facing head-and-shoulders composition, centered framing, natural expression, clean lighting, realistic photography.',
    `Visual direction: ${style}. Background: ${background}.`,
    `Target output: ${input.size || 'resume portrait'} ratio.`,
    'Do not add another person, text, logo, watermark, decorative objects, exaggerated beauty effects, or altered identity.',
    custom,
  ].filter(Boolean).join('\n');
}
