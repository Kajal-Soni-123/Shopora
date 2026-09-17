import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';

export async function GET() {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return ApiResponse.unauthorized('No active session found.');
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        homeAddress: true,
        workAddress: true,
        primaryAddressType: true,
        vendorId: true,
        vendor: {
          select: {
            id: true,
            name: true,
            warehouseLocation: true,
          },
        },
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      return ApiResponse.unauthorized('User not found.');
    }

    return ApiResponse.success(user, 'Session active');
  } catch (error) {
    console.error('Fetch session user error:', error);
    return ApiResponse.serverError('Failed to fetch session user.');
  }
}
