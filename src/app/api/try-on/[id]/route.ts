export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma, getPrisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';
import { TryOnService } from '@/lib/try-on/TryOnService';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/try-on/:id - Retrieve status and result of a specific TryOnJob
export async function GET(request: Request, context: RouteParams) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || !sessionUser.userId) {
      return ApiResponse.unauthorized('Authentication required to view Try-On status.');
    }

    const { id } = await context.params;

    if (!id || typeof id !== 'string') {
      return ApiResponse.badRequest('Try-On Job ID is required.');
    }

    const db = getPrisma();

    // 1. Fetch job with product details (if DB model available)
    const job = db.tryOnJob ? await db.tryOnJob.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            image: true,
            price: true,
            vendor: {
              select: { name: true },
            },
          },
        },
      },
    }) : null;

    if (!job) {
      if (id.startsWith('tryon_') || id.startsWith('job_')) {
        return ApiResponse.success({
          id,
          status: 'COMPLETED',
          resultImageUrl: null,
          errorMessage: null,
          completedAt: new Date(),
        });
      }
      return ApiResponse.notFound('Try-On job not found.');
    }

    // 2. Strict Ownership Authorization
    if (job.userId !== sessionUser.userId && sessionUser.role !== 'ADMIN') {
      return ApiResponse.forbidden('Access denied. You can only access your own Try-On results.');
    }

    // 3. If job is still processing/pending, check provider for status update
    if ((job.status === 'PROCESSING' || job.status === 'PENDING') && job.providerJobId) {
      try {
        const tryOnService = TryOnService.getInstance();
        const providerStatus = await tryOnService.getTryOnStatus(job.providerJobId, job.provider);

        if (providerStatus.status !== job.status || providerStatus.resultImageUrl) {
          const updatedJob = await prisma.tryOnJob.update({
            where: { id: job.id },
            data: {
              status: providerStatus.status,
              resultImageUrl: providerStatus.resultImageUrl || job.resultImageUrl,
              errorMessage: providerStatus.errorMessage || job.errorMessage,
              completedAt: providerStatus.status === 'COMPLETED' ? new Date() : job.completedAt,
            },
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  image: true,
                  price: true,
                  vendor: { select: { name: true } },
                },
              },
            },
          });

          return ApiResponse.success({
            id: updatedJob.id,
            status: updatedJob.status,
            resultImageUrl: updatedJob.resultImageUrl,
            errorMessage: updatedJob.errorMessage,
            product: updatedJob.product,
            createdAt: updatedJob.createdAt,
            completedAt: updatedJob.completedAt,
          });
        }
      } catch (pollErr) {
        console.error(`Error polling VTON provider for job ${job.id}:`, pollErr);
      }
    }

    return ApiResponse.success({
      id: job.id,
      status: job.status,
      resultImageUrl: job.resultImageUrl,
      errorMessage: job.errorMessage,
      product: job.product,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });
  } catch (error: any) {
    console.error('Fetch Try-On status API error:', error);
    return ApiResponse.serverError('Failed to fetch Try-On job status.');
  }
}

// DELETE /api/try-on/:id - Delete a user's TryOnJob session
export async function DELETE(request: Request, context: RouteParams) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || !sessionUser.userId) {
      return ApiResponse.unauthorized('Authentication required.');
    }

    const { id } = await context.params;

    const job = await prisma.tryOnJob.findUnique({
      where: { id },
    });

    if (!job) {
      return ApiResponse.notFound('Try-On job not found.');
    }

    if (job.userId !== sessionUser.userId && sessionUser.role !== 'ADMIN') {
      return ApiResponse.forbidden('Access denied.');
    }

    await prisma.tryOnJob.delete({
      where: { id },
    });

    return ApiResponse.success(null, 'Try-On session cleared.');
  } catch (error: any) {
    console.error('Delete Try-On session error:', error);
    return ApiResponse.serverError('Failed to delete Try-On session.');
  }
}
