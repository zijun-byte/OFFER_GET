type UuidProvider = { randomUUID?: () => string };
let fallbackSequence = 0;

export function createChatMessageId(prefix: string, provider: UuidProvider | undefined = globalThis.crypto): string {
  const uuid = provider?.randomUUID?.();
  if (uuid) return `${prefix}-${uuid}`;
  fallbackSequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${fallbackSequence.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
