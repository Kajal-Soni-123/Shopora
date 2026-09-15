import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-key-ecommerce-2026-auth-token-key';
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);
const COOKIE_NAME = 'auth_token';

export interface UserPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  vendorId?: string | null;
}

/**
 * Hash a plain-text password using bcryptjs.
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

/**
 * Compare plain-text password with hashed password.
 */
export async function comparePassword(password: string, hashed: string): Promise<boolean> {
  return await bcrypt.compare(password, hashed);
}

/**
 * Sign a JWT token using jose (edge runtime compatible).
 */
export async function signToken(payload: UserPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET_KEY);
}

/**
 * Verify a JWT token using jose.
 */
export async function verifyToken(token: string): Promise<UserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as string,
      vendorId: (payload.vendorId as string) || null,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Get current session user payload from request cookies.
 */
export async function getSessionUser(): Promise<UserPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyToken(token);
}

/**
 * Alias for getSessionUser to retrieve current session user payload.
 */
export async function getAuthUser(req?: any): Promise<UserPayload | null> {
  return await getSessionUser();
}

/**
 * Set HTTP-only auth token cookie on a NextResponse object.
 */
export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

/**
 * Clear the auth token cookie on a NextResponse object.
 */
export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
