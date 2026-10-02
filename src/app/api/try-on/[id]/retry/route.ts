export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';
import { TryOnService } from '@/lib/try-on/TryOnService';
import { mapToTryOnCategory } from '@/lib/try-on/categoryMapper';
import { detectWearableItem } from '@/lib/try-on/wearableItems';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/try-on/:id/retry - Retry a failed or incomplete TryOnJob
export async function POST(request: Request, context: RouteParams) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || !sessionUser.userId) {
      return ApiResponse.unauthorized('Authentication required to retry Try-On.');
    }

    const { id } = await context.params;

    const job = await prisma.tryOnJob.findUnique({
      where: { id },
      include: { product: { include: { category: true } } },
    });

    if (!job) {
      return ApiResponse.notFound('Try-On job not found.');
    }

    if (job.userId !== sessionUser.userId) {
      return ApiResponse.forbidden('Access denied.');
    }

    const categoryMapping = mapToTryOnCategory(
      job.product.category?.name,
      job.product.title,
      job.product.tryOnCategory
    );

    const itemType = detectWearableItem(job.product.tryOnCategory, job.product.title, job.product.category?.name);

    const tryOnService = TryOnService.getInstance();
    const providerResult = await tryOnService.createTryOnJob({
      userImageUrl: job.userImageUrl,
      productImageUrl: job.productImageUrl,
      category: categoryMapping.category,
      productId: job.productId,
      userId: sessionUser.userId,
      productTitle: job.product.title,
      itemType,
    });

    const updatedJob = await prisma.tryOnJob.update({
      where: { id: job.id },
      data: {
        provider: tryOnService.getProviderName(itemType),
        providerJobId: providerResult.providerJobId || null,
        status: providerResult.status,
        resultImageUrl: providerResult.resultImageUrl || null,
        errorMessage: providerResult.errorMessage || null,
        completedAt: providerResult.status === 'COMPLETED' ? new Date() : null,
      },
    });

    if (providerResult.status === 'FAILED') {
      return ApiResponse.error(providerResult.errorMessage || 'Failed to retry Virtual Try-On.', 502, { tryOnId: updatedJob.id });
    }

    return ApiResponse.success({
      tryOnId: updatedJob.id,
      status: updatedJob.status,
      resultImageUrl: updatedJob.resultImageUrl,
      provider: updatedJob.provider,
    }, 'Try-On retry initiated successfully.');
  } catch (error: any) {
    console.error('Retry Try-On API error:', error);
    return ApiResponse.serverError(error.message || 'Failed to retry Virtual Try-On.');
  }
}
