export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';

export async function POST() {
  try {
    const response = ApiResponse.success(null, 'Logged out successfully');
    clearAuthCookie(response);
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return ApiResponse.serverError('Failed to logout');
  }
}
