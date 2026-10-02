export const dynamic = 'force-dynamic';
export const maxDuration = 120; // AI image generation can take up to ~90s

import { NextResponse } from 'next/server';
import { prisma, getPrisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';
import { TryOnService } from '@/lib/try-on/TryOnService';
import { mapToTryOnCategory } from '@/lib/try-on/categoryMapper';
import { validateUserImage } from '@/lib/try-on/imageValidation';
import { detectWearableItem } from '@/lib/try-on/wearableItems';
import { isTryOnEnabled } from '@/lib/try-on/tryOnModel';

// POST /api/try-on - Create a new AI Virtual Try-On Job
export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || !sessionUser.userId) {
      return ApiResponse.unauthorized('Please log in to your Shopora account to use Virtual Try-On.');
    }

    const body = await request.json();
    const { productId } = body;
    const userImage = body.userImage || body.personImage;

    if (!productId || typeof productId !== 'string') {
      return ApiResponse.badRequest('Product ID is required.');
    }

    // 1. Image Validation
    const validation = validateUserImage(userImage);
    if (!validation.isValid) {
      return ApiResponse.badRequest(validation.error || 'Invalid user photograph provided.');
    }

    // 2. Fetch and Validate Product
    let product: any = null;
    try {
      product = await prisma.product.findUnique({
        where: { id: productId },
        include: { category: true },
      });
    } catch (dbErr: any) {
      console.warn('[TryOnAPI] High-level query failed, attempting standard product selection:', dbErr?.message);
      // Fallback query omitting new try-on columns if DB migration is pending in dev server memory
      product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          title: true,
          description: true,
          price: true,
          stock: true,
          image: true,
          images: true,
          vendorId: true,
          categoryId: true,
          category: { select: { id: true, name: true, slug: true } }
        }
      });
    }

    if (!product) {
      return ApiResponse.notFound('Target product not found.');
    }

    if (!isTryOnEnabled(product)) {
      return ApiResponse.badRequest('Virtual Try-On is currently not enabled for this product.');
    }

    // 3. Category Capability Check
    const categoryMapping = mapToTryOnCategory(
      product.category?.name,
      product.title,
      product.tryOnCategory
    );

    if (!categoryMapping.isSupported || categoryMapping.category === 'UNSUPPORTED') {
      return ApiResponse.badRequest(
        `Virtual Try-On is not available for this product category yet. (${product.category?.name || 'General Item'})`
      );
    }

    const itemType = detectWearableItem(product.tryOnCategory, product.title, product.category?.name);

    // 4. Clean Product Image Selection
    const productTryOnImage =
      (product.tryOnImage || '').trim() ||
      (product.image || '').trim() ||
      (Array.isArray(product.images) && product.images[0] ? product.images[0].trim() : '');

    if (!productTryOnImage) {
      return ApiResponse.badRequest('No suitable clean product image available for Virtual Try-On.');
    }

    // 5. Caching / Idempotency Check
    const tryOnService = TryOnService.getInstance();
    const inputHash = tryOnService.generateInputHash(
      userImage,
      product.id,
      `${categoryMapping.category}_${itemType}`
    );

    const db: any = getPrisma();

    // Check if an exact completed job exists created within the last 24 hours
    let existingJob: any = null;
    try {
      if (db.tryOnJob) {
        existingJob = await db.tryOnJob.findFirst({
          where: {
            userId: sessionUser.userId,
            productId: product.id,
            inputHash,
            status: 'COMPLETED',
            resultImageUrl: { not: null },
          },
          orderBy: { createdAt: 'desc' },
        });
      }
    } catch (e: any) {
      console.warn('[TryOnAPI] Could not check existing tryOnJob cache:', e?.message);
    }

    if (existingJob && existingJob.resultImageUrl) {
      return ApiResponse.success({
        tryOnId: existingJob.id,
        status: 'COMPLETED',
        resultImageUrl: existingJob.resultImageUrl,
        cached: true,
        category: existingJob.category,
      }, 'Try-On preview loaded from previous session.');
    }

    // 6. Record Initial TryOnJob in DB (if DB table ready)
    let tryOnJob: any = null;
    try {
      if (db.tryOnJob) {
        tryOnJob = await db.tryOnJob.create({
          data: {
            userId: sessionUser.userId,
            productId: product.id,
            provider: tryOnService.getProviderName(itemType),
            status: 'PROCESSING',
            userImageUrl: userImage,
            productImageUrl: productTryOnImage,
            category: categoryMapping.category,
            inputHash,
          },
        });
      }
    } catch (e: any) {
      console.warn('[TryOnAPI] Could not log initial tryOnJob to DB:', e?.message);
    }

    // 7. Submit Job to Provider
    const providerResult = await tryOnService.createTryOnJob({
      userImageUrl: userImage,
      productImageUrl: productTryOnImage,
      category: categoryMapping.category,
      productId: product.id,
      userId: sessionUser.userId,
      productTitle: product.title,
      itemType,
    });

    // 8. Update DB with Provider Details (if tryOnJob exists)
    try {
      if (tryOnJob && db.tryOnJob) {
        await db.tryOnJob.update({
          where: { id: tryOnJob.id },
          data: {
            providerJobId: providerResult.providerJobId || null,
            status: providerResult.status,
            resultImageUrl: providerResult.resultImageUrl || null,
            errorMessage: providerResult.errorMessage || null,
            completedAt: providerResult.status === 'COMPLETED' ? new Date() : null,
          },
        });
      }
    } catch (e: any) {
      console.warn('[TryOnAPI] Could not update tryOnJob status in DB:', e?.message);
    }

    if (providerResult.status === 'FAILED') {
      return ApiResponse.error(
        providerResult.errorMessage || 'We couldn\'t create your try-on right now. Please try again.',
        502,
        { tryOnId: tryOnJob?.id }
      );
    }

    const generatedId = tryOnJob?.id || `tryon_${Date.now()}`;

    return ApiResponse.created({
      id: generatedId,
      tryOnId: generatedId,
      status: providerResult.status,
      resultImageUrl: providerResult.resultImageUrl || null,
      provider: tryOnService.getProviderName(itemType),
      itemType,
    }, 'Try-On generation started successfully');
  } catch (error: any) {
    console.error('Create Try-On API error:', error);
    return ApiResponse.serverError(error.message || 'An error occurred while creating your Virtual Try-On.');
  }
}
