export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/lib/api-response';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        children: {
          select: { id: true, name: true, slug: true },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return ApiResponse.success(categories, 'Categories retrieved successfully.');
  } catch (error) {
    console.error('Categories retrieval error:', error);
    return ApiResponse.serverError('Failed to fetch categories.');
  }
}
