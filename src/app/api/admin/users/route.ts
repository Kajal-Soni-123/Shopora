import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return ApiResponse.unauthorized('Authentication required.');
    }

    if (sessionUser.role !== 'ADMIN') {
      return ApiResponse.forbidden('Admin access required.');
    }

    // Fetch all Users (Customers & Admins)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
        vendorId: true,
        _count: {
          select: { orders: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch all Vendors
    const vendors = await prisma.vendor.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        warehouseLocation: true,
        rating: true,
        createdAt: true,
        _count: {
          select: { products: true, subOrders: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ApiResponse.success(
      {
        customers: users.filter((u) => u.role === 'CUSTOMER'),
        vendors,
      },
      'User and Vendor records fetched successfully.'
    );
  } catch (error) {
    console.error('Admin users retrieval error:', error);
    return ApiResponse.serverError('Failed to fetch user directory.');
  }
}
