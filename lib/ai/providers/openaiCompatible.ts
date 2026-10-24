type ChatCompletionMessage = {
  role: 'system' | 'user';
  content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
};

type ChatCompletionOptions = {
  messages: ChatCompletionMessage[];
  model: string;
  provider: string;
  temperature: number;
};

export async function runOpenAICompatibleJson<T>(options: ChatCompletionOptions): Promise<T> {
  const provider = resolveProvider(options.provider);
  const apiKey = provider.apiKey;
  const baseUrl = provider.baseUrl;

  if (!apiKey) {
    throw new Error('Missing DEEPSEEK_API_KEY, AI_API_KEY, or OPENAI_API_KEY.');
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    signal: AbortSignal.timeout(60000),
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`AI provider request failed: ${response.status} ${errorText}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('AI provider returned empty content.');
  }

  return JSON.parse(content) as T;
}

function resolveProvider(provider: string) {
  if (provider === 'deepseek') {
    return {
      apiKey: process.env.DEEPSEEK_API_KEY || process.env.AI_API_KEY || '',
      baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    };
  }

  return {
    apiKey: process.env.OPENAI_API_KEY || process.env.AI_API_KEY || '',
    baseUrl: process.env.OPENAI_BASE_URL || process.env.AI_BASE_URL || 'https://api.openai.com/v1',
  };
}
