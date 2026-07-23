export const ADMIN_SESSION_COOKIE = 'offer_get_admin_session';
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

type SessionPayload = {
  exp: number;
  username: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function createAdminSession(username: string, secret: string) {
  const payload: SessionPayload = {
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE_SECONDS,
    username,
  };
  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await sign(encodedPayload, secret);
  return encodedPayload + '.' + toBase64Url(signature);
}

export async function verifyAdminSession(token: string | undefined, secret: string | undefined) {
  if (!token || !secret) return false;

  const [encodedPayload, encodedSignature, extra] = token.split('.');
  if (!encodedPayload || !encodedSignature || extra) return false;

  try {
    const payload = JSON.parse(decoder.decode(fromBase64Url(encodedPayload))) as Partial<SessionPayload>;
    if (!payload.username || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return false;

    const expectedSignature = await sign(encodedPayload, secret);
    return equalBytes(expectedSignature, fromBase64Url(encodedSignature));
  } catch {
    return false;
  }
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}

function toBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function fromBase64Url(value: string) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function equalBytes(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}