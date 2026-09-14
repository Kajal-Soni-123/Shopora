import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';

// POST /api/reviews - Submit a review and comment on a product
export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return ApiResponse.unauthorized('Please sign in to submit a review.');
    }

    const body = await request.json();
    const { productId, rating, comment } = body;

    if (!productId || typeof productId !== 'string') {
      return ApiResponse.badRequest('Valid product ID is required.');
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return ApiResponse.badRequest('Rating must be an integer between 1 and 5 stars.');
    }

    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return ApiResponse.badRequest('Review comment text is required.');
    }

    // Verify product existence
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return ApiResponse.notFound('Product not found.');
    }

    // Create the review
    const review = await prisma.review.create({
      data: {
        rating: Math.round(numRating),
        comment: comment.trim(),
        userId: sessionUser.userId,
        productId: product.id,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        product: {
          select: { id: true, title: true, image: true },
        },
      },
    });

    // Recalculate average rating and total review count for the product
    const productReviews = await prisma.review.findMany({
      where: { productId: product.id },
      select: { rating: true },
    });

    const totalCount = productReviews.length;
    const avgRating = totalCount > 0
      ? Number((productReviews.reduce((acc, curr) => acc + curr.rating, 0) / totalCount).toFixed(1))
      : 5.0;

    await prisma.product.update({
      where: { id: product.id },
      data: {
        rating: avgRating,
        reviewsCount: totalCount,
      },
    });

    return ApiResponse.created(review, 'Review and comment submitted successfully!');
  } catch (error) {
    console.error('Submit review error:', error);
    return ApiResponse.serverError('Failed to submit review. Please try again.');
  }
}
