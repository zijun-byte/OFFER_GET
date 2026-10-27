type SenseNovaImageRequest = {
  image: string;
  model?: string;
  prompt: string;
};

type SenseNovaImageResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
  error?: { message?: string } | string;
  message?: string;
};

export async function editSenseNovaImage({ image, model, prompt }: SenseNovaImageRequest): Promise<string> {
  const apiKey = process.env.SENSENOVA_API_KEY;
  if (!apiKey) throw new Error('图像模型尚未配置。请在服务端设置 SENSENOVA_API_KEY。');

  const baseUrl = (process.env.SENSENOVA_IMAGE_BASE_URL || 'https://token.sensenova.cn/v1').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/images/edits`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || process.env.SENSENOVA_IMAGE_MODEL || 'sensenova-u1.5-lite',
      images: [{ image_url: image }],
      prompt,
      n: 1,
      prompt_extend: true,
      response_format: 'url',
      size: 'auto',
      watermark: false,
    }),
    signal: AbortSignal.timeout(90_000),
  });

  const payload = (await response.json().catch(() => null)) as SenseNovaImageResponse | null;

  if (!response.ok) {
    const message =
      typeof payload?.error === 'string' ? payload.error : payload?.error?.message || payload?.message;
    throw new Error(message || `图像模型请求失败（${response.status}）。`);
  }

  const imageResult = payload?.data?.[0];
  if (imageResult?.url) return imageResult.url;
  if (imageResult?.b64_json) return `data:image/png;base64,${imageResult.b64_json}`;

  throw new Error('图像模型没有返回可用图片。');
}
