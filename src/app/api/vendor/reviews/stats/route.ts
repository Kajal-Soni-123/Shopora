export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';

export interface BestProductMonthly {
  monthKey: string; // e.g. "2026-09"
  monthName: string; // e.g. "September 2026"
  bestProduct: {
    id: string;
    title: string;
    image: string;
    price: number;
    monthlyAvgRating: number;
    monthlyReviewCount: number;
    fiveStarCount: number;
  } | null;
}

export interface MonthlyStatSummary {
  monthKey: string;
  monthName: string;
  totalReviews: number;
  avgRating: number;
  ratingsBreakdown: { 5: number; 4: number; 3: number; 2: number; 1: number };
}

// GET /api/vendor/reviews/stats - Monthly & Product statistics for vendor's reviews & comments
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'VENDOR' || !sessionUser.vendorId) {
      return ApiResponse.unauthorized('Access denied. Vendor authentication required.');
    }

    // 1. Fetch vendor products
    const vendorProducts = await prisma.product.findMany({
      where: { vendorId: sessionUser.vendorId },
      include: { category: true },
    });

    const vendorProductIds = vendorProducts.map((p) => p.id);

    if (vendorProductIds.length === 0) {
      return ApiResponse.success({
        totalReviews: 0,
        overallAvgRating: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        bestProductsPerMonth: [],
        monthlyStats: [],
        productSummaries: [],
      });
    }

    // 2. Fetch all reviews for vendor products
    const allReviews = await prisma.review.findMany({
      where: { productId: { in: vendorProductIds } },
      include: {
        product: {
          select: { id: true, title: true, image: true, price: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalReviews = allReviews.length;

    // 3. Overall average rating & rating distribution
    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let ratingSum = 0;

    allReviews.forEach((r) => {
      ratingSum += r.rating;
      if (r.rating >= 1 && r.rating <= 5) {
        ratingDistribution[r.rating as 1 | 2 | 3 | 4 | 5]++;
      }
    });

    const overallAvgRating = totalReviews > 0 ? Number((ratingSum / totalReviews).toFixed(2)) : 0;

    // 4. Monthly Statistics & Best Product per Month Calculation
    // Group reviews by Month (YYYY-MM)
    const monthGroups: { [monthKey: string]: typeof allReviews } = {};

    allReviews.forEach((r) => {
      const d = new Date(r.createdAt);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${month}`;
      if (!monthGroups[key]) {
        monthGroups[key] = [];
      }
      monthGroups[key].push(r);
    });

    // Sort month keys descending (e.g. 2026-09, 2026-08, 2026-07...)
    const sortedMonthKeys = Object.keys(monthGroups).sort((a, b) => b.localeCompare(a));

    const bestProductsPerMonth: BestProductMonthly[] = [];
    const monthlyStats: MonthlyStatSummary[] = [];

    sortedMonthKeys.forEach((monthKey) => {
      const reviewsInMonth = monthGroups[monthKey];
      const [yearStr, monthStr] = monthKey.split('-');
      const dateObj = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
      const monthName = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });

      // Monthly aggregates
      let mRatingSum = 0;
      const mRatingsBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

      // Group month reviews by Product
      const productMonthMap: {
        [prodId: string]: {
          product: (typeof reviewsInMonth)[0]['product'];
          ratings: number[];
        };
      } = {};

      reviewsInMonth.forEach((r) => {
        mRatingSum += r.rating;
        if (r.rating >= 1 && r.rating <= 5) {
          mRatingsBreakdown[r.rating as 1 | 2 | 3 | 4 | 5]++;
        }

        if (!productMonthMap[r.productId]) {
          productMonthMap[r.productId] = {
            product: r.product,
            ratings: [],
          };
        }
        productMonthMap[r.productId].ratings.push(r.rating);
      });

      const mAvgRating = reviewsInMonth.length > 0
        ? Number((mRatingSum / reviewsInMonth.length).toFixed(2))
        : 0;

      monthlyStats.push({
        monthKey,
        monthName,
        totalReviews: reviewsInMonth.length,
        avgRating: mAvgRating,
        ratingsBreakdown: mRatingsBreakdown,
      });

      // Determine Best Product of the month
      let topProductEntry: BestProductMonthly['bestProduct'] = null;
      let highestScore = -1;

      Object.entries(productMonthMap).forEach(([prodId, data]) => {
        const count = data.ratings.length;
        const avg = data.ratings.reduce((a, b) => a + b, 0) / count;
        const fiveStars = data.ratings.filter((x) => x === 5).length;
        // Composite score favoring high avg rating + volume of positive reviews
        const compositeScore = avg * 10 + count * 2 + fiveStars * 3;

        if (compositeScore > highestScore) {
          highestScore = compositeScore;
          topProductEntry = {
            id: data.product.id,
            title: data.product.title,
            image: data.product.image,
            price: data.product.price,
            monthlyAvgRating: Number(avg.toFixed(2)),
            monthlyReviewCount: count,
            fiveStarCount: fiveStars,
          };
        }
      });

      bestProductsPerMonth.push({
        monthKey,
        monthName,
        bestProduct: topProductEntry,
      });
    });

    // 5. Product-wise Summaries across all time
    const productSummaries = vendorProducts.map((p) => {
      const pReviews = allReviews.filter((r) => r.productId === p.id);
      const count = pReviews.length;
      const avg = count > 0 ? Number((pReviews.reduce((sum, r) => sum + r.rating, 0) / count).toFixed(2)) : p.rating;
      const latestComment = pReviews.length > 0 ? pReviews[0].comment : 'No comments yet';
      const fiveStarPct = count > 0 ? Math.round((pReviews.filter((r) => r.rating === 5).length / count) * 100) : 0;

      return {
        id: p.id,
        title: p.title,
        image: p.image,
        price: p.price,
        stock: p.stock,
        category: p.category.name,
        totalReviews: count,
        avgRating: avg,
        fiveStarPct,
        latestComment,
      };
    });

    return ApiResponse.success({
      totalReviews,
      overallAvgRating,
      ratingDistribution,
      bestProductsPerMonth,
      monthlyStats,
      productSummaries,
    });
  } catch (error) {
    console.error('Fetch vendor review stats error:', error);
    return ApiResponse.serverError('Failed to calculate vendor review statistics.');
  }
}
