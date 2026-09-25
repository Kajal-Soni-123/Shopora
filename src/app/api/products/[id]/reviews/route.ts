export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/lib/api-response';

// GET /api/products/[id]/reviews - Fetch reviews & comments for a specific product
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: productId } = params;

    if (!productId) {
      return ApiResponse.badRequest('Product ID is required.');
    }

    const reviews = await prisma.review.findMany({
      where: { productId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ApiResponse.success(reviews);
  } catch (error) {
    console.error('Fetch product reviews error:', error);
    return ApiResponse.serverError('Failed to fetch product reviews.');
  }
}
