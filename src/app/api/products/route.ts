export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/lib/api-response';
import { getDescendantCategoryIds } from '@/lib/categoryUtils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const query = searchParams.get('query');

    const where: any = {};

    if (category && category !== 'all') {
      const allCategories = await prisma.category.findMany({
        select: { id: true, name: true, slug: true, parentId: true },
      });

      const catParamLower = category.toLowerCase().trim();
      const targetCategory = allCategories.find(
        (c) =>
          c.id === category ||
          c.slug.toLowerCase() === catParamLower ||
          c.name.toLowerCase() === catParamLower
      );

      if (targetCategory) {
        const matchingCategoryIds = getDescendantCategoryIds(targetCategory.id, allCategories);
        where.categoryId = { in: matchingCategoryIds };
      } else {
        where.OR = [
          { categoryId: category },
          { category: { slug: category } },
        ];
      }
    }

    if (query && query.trim().length > 0) {
      const q = query.trim();
      where.AND = [
        {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    let products: any[] = [];
    try {
      products = await prisma.product.findMany({
        where,
        include: {
          vendor: true,
          category: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (dbErr: any) {
      console.warn('[ProductsAPI] findMany failed, attempting explicit field selection:', dbErr?.message);
      products = await prisma.product.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          stock: true,
          image: true,
          images: true,
          rating: true,
          reviewsCount: true,
          attributes: true,
          vendorId: true,
          categoryId: true,
          vendor: true,
          category: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return ApiResponse.success(products, 'Products retrieved successfully');
  } catch (error) {
    console.error('Products retrieval error:', error);
    return ApiResponse.serverError('Failed to retrieve products');
  }
}
