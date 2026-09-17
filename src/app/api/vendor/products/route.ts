import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';

// GET /api/vendor/products - Fetch products owned by the authenticated vendor
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'VENDOR' || !sessionUser.vendorId) {
      return ApiResponse.unauthorized('Access denied. Merchant Partner authentication required.');
    }

    const products = await prisma.product.findMany({
      where: { vendorId: sessionUser.vendorId },
      include: {
        category: true,
        vendor: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return ApiResponse.success(products);
  } catch (error) {
    console.error('Fetch vendor products error:', error);
    return ApiResponse.serverError('Failed to fetch vendor products.');
  }
}

// POST /api/vendor/products - Create a new product under the vendor's catalog
export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'VENDOR' || !sessionUser.vendorId) {
      return ApiResponse.unauthorized('Access denied. Merchant Partner authentication required.');
    }

    const body = await request.json();
    const { title, description, price, stock, image, images, categoryId, attributes } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return ApiResponse.badRequest('Product title is required.');
    }
    if (!description || typeof description !== 'string') {
      return ApiResponse.badRequest('Product description is required.');
    }
    if (typeof price !== 'number' || price <= 0) {
      return ApiResponse.badRequest('A valid positive price is required.');
    }
    if (typeof stock !== 'number' || stock < 0) {
      return ApiResponse.badRequest('Stock quantity must be 0 or greater.');
    }
    if (!image || typeof image !== 'string') {
      return ApiResponse.badRequest('Product image URL is required.');
    }

    // Ensure category exists or fallback to first existing category
    let finalCategoryId = categoryId;
    if (!finalCategoryId) {
      const firstCategory = await prisma.category.findFirst();
      if (!firstCategory) {
        const defaultCat = await prisma.category.create({
          data: { name: 'General Merchandise', slug: 'general-merchandise' },
        });
        finalCategoryId = defaultCat.id;
      } else {
        finalCategoryId = firstCategory.id;
      }
    }

    const newProduct = await prisma.product.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        price,
        stock,
        image,
        images: Array.isArray(images) ? images : [],
        attributes: attributes || {},
        vendorId: sessionUser.vendorId,
        categoryId: finalCategoryId,
        rating: 4.8,
        reviewsCount: 1,
      },
      include: {
        category: true,
        vendor: true,
      },
    });

    return ApiResponse.created(newProduct, 'Product published successfully!');
  } catch (error) {
    console.error('Create vendor product error:', error);
    return ApiResponse.serverError('Failed to create product. Please try again.');
  }
}
