import { decodeJwt } from 'jose';

export function tokenUnexpired(token: string): boolean {
  try {
    const payload = decodeJwt(token);
    const exp = payload?.exp;
    if (typeof exp !== 'number') return true;
    return exp * 1000 > Date.now();
  } catch {
    return false;
  }
}