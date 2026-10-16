const encoder = new TextEncoder();

function base64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function signingKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret || (process.env.NODE_ENV === 'production' && secret.length < 32)) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción');
  }
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

async function signature(payload: string) {
  const result = await crypto.subtle.sign('HMAC', await signingKey(), encoder.encode(payload));
  return base64Url(new Uint8Array(result));
}

export async function createTwoFactorProof(userId: string, expires = Math.floor(Date.now() / 1000) + 12 * 60 * 60) {
  const payload = `${userId}.${expires}`;
  return `${payload}.${await signature(payload)}`;
}

export async function verifyTwoFactorProof(value: string | undefined, userId: string) {
  if (!value) return false;
  const parts = value.split('.');
  if (parts.length !== 3 || parts[0] !== userId) return false;
  const expires = Number(parts[1]);
  if (!Number.isFinite(expires) || expires <= Math.floor(Date.now() / 1000)) return false;
  return await createTwoFactorProof(userId, expires) === value;
}
