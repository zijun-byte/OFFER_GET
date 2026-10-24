export async function limitedBody(request: Request, maximum: number): Promise<Uint8Array> {
  if (Number(request.headers.get('content-length')) > maximum) throw new Error('请求内容过大');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('请求内容为空');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > maximum) { await reader.cancel(); throw new Error('请求内容过大'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(length);
  let position = 0;
  for (const chunk of chunks) { result.set(chunk, position); position += chunk.length; }
  return result;
}
