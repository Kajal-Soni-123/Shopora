export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/lib/api-response';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: productId } = params;

    if (!productId) {
      return ApiResponse.badRequest('Product ID is required.');
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        vendor: true,
        category: true,
        reviews: {
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
        },
      },
    });

    if (!product) {
      return ApiResponse.notFound('Product not found.');
    }

    // Fetch all categories to determine category family (exact category, parent, siblings, descendants)
    const allCategories = await prisma.category.findMany({
      select: { id: true, parentId: true },
    });

    const targetCatId = product.categoryId;
    const parentCatId = product.category?.parentId;

    const relatedCategoryIds = new Set<string>([targetCatId]);

    // Include parent category and sibling categories sharing the same parent
    if (parentCatId) {
      relatedCategoryIds.add(parentCatId);
      allCategories.forEach((c) => {
        if (c.parentId === parentCatId || c.id === parentCatId) {
          relatedCategoryIds.add(c.id);
        }
      });
    }

    // Include child/descendant categories of the target category
    allCategories.forEach((c) => {
      if (c.parentId === targetCatId) {
        relatedCategoryIds.add(c.id);
      }
    });

    // Fetch related products strictly matching the target category family (NO cross-category fallback)
    const relatedProducts = await prisma.product.findMany({
      where: {
        categoryId: { in: Array.from(relatedCategoryIds) },
        id: { not: product.id },
      },
      include: {
        vendor: true,
        category: true,
      },
      take: 8,
      orderBy: { createdAt: 'desc' },
    });

    // Check if current user has purchased this product
    let hasPurchased = false;
    try {
      const { getSessionUser } = await import('@/lib/auth');
      const sessionUser = await getSessionUser();
      if (sessionUser?.userId) {
        const userPurchase = await prisma.order.findFirst({
          where: {
            userId: sessionUser.userId,
            paymentStatus: { in: ['PAID', 'COD_PENDING', 'COD_COLLECTED'] },
            subOrders: {
              some: {
                items: {
                  some: { productId },
                },
              },
            },
          },
        });
        hasPurchased = !!userPurchase;
      }
    } catch (e) {
      // Ignored if unauthenticated
    }

    return ApiResponse.success({
      product,
      relatedProducts,
      hasPurchased,
    });
  } catch (error) {
    console.error('Error fetching product details:', error);
    return ApiResponse.serverError('Failed to fetch product details.');
  }
}
