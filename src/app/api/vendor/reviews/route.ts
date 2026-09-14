import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';

// GET /api/vendor/reviews - Fetch all reviews and comments on products belonging to the logged-in vendor
export async function GET(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'VENDOR' || !sessionUser.vendorId) {
      return ApiResponse.unauthorized('Access denied. Vendor authentication required.');
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const ratingFilter = searchParams.get('rating');

    // Get vendor's product IDs
    const vendorProducts = await prisma.product.findMany({
      where: { vendorId: sessionUser.vendorId },
      select: { id: true },
    });

    const vendorProductIds = vendorProducts.map((p) => p.id);

    if (vendorProductIds.length === 0) {
      return ApiResponse.success([]);
    }

    const whereClause: any = {
      productId: { in: vendorProductIds },
    };

    if (productId && productId !== 'all') {
      whereClause.productId = productId;
    }

    if (ratingFilter && ratingFilter !== 'all') {
      whereClause.rating = parseInt(ratingFilter, 10);
    }

    const reviews = await prisma.review.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        product: {
          select: {
            id: true,
            title: true,
            image: true,
            price: true,
            rating: true,
            category: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ApiResponse.success(reviews);
  } catch (error) {
    console.error('Fetch vendor reviews error:', error);
    return ApiResponse.serverError('Failed to fetch vendor product reviews.');
  }
}
