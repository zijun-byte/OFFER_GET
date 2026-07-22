const ARK_IMAGE_ENDPOINT = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';

type ArkImageRequest = {
  image: string;
  model?: string;
  prompt: string;
};

export async function generateArkImage({ image, model, prompt }: ArkImageRequest): Promise<string> {
  const apiKey = process.env.ARK_IMAGE_API_KEY;
  if (!apiKey) throw new Error('图像模型尚未配置。请在服务端设置 ARK_IMAGE_API_KEY。');

  const response = await fetch(ARK_IMAGE_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image,
      model: model || process.env.ARK_IMAGE_MODEL || 'doubao-seedream-5-0-260128',
      prompt,
      response_format: 'url',
      sequential_image_generation: 'disabled',
      size: '2K',
      stream: false,
      watermark: false,
    }),
    signal: AbortSignal.timeout(90_000),
  });

  const payload = (await response.json().catch(() => null)) as {
    data?: Array<{ b64_json?: string; url?: string }>;
    error?: { message?: string } | string;
  } | null;

  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : payload?.error?.message;
    throw new Error(message || `图像模型请求失败（${response.status}）。`);
  }

  const imageResult = payload?.data?.[0];
  if (imageResult?.url) return imageResult.url;
  if (imageResult?.b64_json) return `data:image/png;base64,${imageResult.b64_json}`;

  throw new Error('图像模型没有返回可用图片。');
}
