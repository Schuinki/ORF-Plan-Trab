import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  omId: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// Cookie "secure" exige HTTPS. Em servidor de intranet acessado por HTTP
// (ex.: http://192.168.x.x:3000) o cookie secure nunca é enviado e o login
// quebra. Por isso o flag deriva do protocolo da APP_URL, com override
// explícito via COOKIE_SECURE=true|false.
function isSecureCookie(): boolean {
  if (process.env.COOKIE_SECURE !== undefined) {
    return process.env.COOKIE_SECURE === 'true';
  }
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  if (appUrl.startsWith('http://')) return false;
  return process.env.NODE_ENV === 'production';
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('auth-token')?.value || null;
}

export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
}

export async function getCurrentUser(): Promise<JWTPayload | null> {
  const token = await getAuthToken();
  if (!token) return null;
  return verifyToken(token);
}
