export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';
import { isValidTryOnModelUrl, parseFitting, TRY_ON_MODEL_REQUIRED_MESSAGE } from '@/lib/try-on/tryOnModel';

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
    const {
      title,
      description,
      price,
      stock,
      frontImage,
      backImage,
      image,
      images,
      categoryId,
      attributes,
      isTryOnAvailable,
      model3dUrl,
      model3dFitting,
      tryOnCategory,
      tryOnImage,
    } = body;

    const finalFrontImage = (frontImage || image || '').trim();
    const finalBackImage = (backImage || (Array.isArray(images) && images[0]) || '').trim();

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
    if (!finalFrontImage) {
      return ApiResponse.badRequest('Product front image URL is required.');
    }
    if (!finalBackImage) {
      return ApiResponse.badRequest('Product back image URL is required.');
    }
    if (model3dUrl && !isValidTryOnModelUrl(model3dUrl)) {
      return ApiResponse.badRequest('The 3D model must be uploaded to Shopora or be an https:// link to a .glb file.');
    }
    const tryOnEnabled = Boolean(isTryOnAvailable);
    if (tryOnEnabled && !model3dUrl) {
      return ApiResponse.badRequest(TRY_ON_MODEL_REQUIRED_MESSAGE);
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

    const combinedImages = Array.from(
      new Set(
        [finalBackImage, ...(Array.isArray(images) ? images : [])].filter(
          (url) => typeof url === 'string' && url.trim().length > 0
        )
      )
    );

    const newProduct = await prisma.product.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        price,
        stock,
        image: finalFrontImage,
        images: combinedImages,
        tryOnImage: tryOnImage ? tryOnImage.trim() : finalFrontImage,
        tryOnCategory: tryOnCategory || null,
        isTryOnAvailable: tryOnEnabled,
        model3dUrl: model3dUrl ? model3dUrl.trim() : null,
        ...(model3dUrl ? { model3dFitting: { ...parseFitting(model3dFitting) } } : {}),
        attributes: {
          ...(attributes || {}),
          frontImage: finalFrontImage,
          backImage: finalBackImage,
        },
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
