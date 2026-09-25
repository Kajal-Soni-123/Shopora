export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';

// DELETE /api/vendor/category-requests/[id] - Delete a PENDING category request
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser || authUser.role !== 'VENDOR' || !authUser.vendorId) {
      return ApiResponse.unauthorized('Unauthorized. Merchant Partner authentication required.');
    }

    const requestId = params.id;
    const delegate = (prisma as any).categoryRequest || (prisma as any).category_requests || (prisma as any).CategoryRequest;
    if (!delegate) {
      return ApiResponse.serverError('CategoryRequest Prisma model delegate is not available on database client.');
    }

    // Find the category request ensuring it belongs to the authenticated vendor
    const existingRequest = await delegate.findUnique({
      where: { id: requestId },
    });

    if (!existingRequest || existingRequest.vendorId !== authUser.vendorId) {
      return ApiResponse.notFound('Category request not found.');
    }

    // Only PENDING category requests can be deleted by vendor
    if (existingRequest.status !== 'PENDING') {
      return ApiResponse.badRequest(
        `Cannot delete category request with status "${existingRequest.status}". Only requests in PENDING status can be deleted.`
      );
    }

    // Delete request from DB
    await delegate.delete({
      where: { id: requestId },
    });

    return ApiResponse.success(null, 'Category request deleted successfully.');
  } catch (error: any) {
    console.error('DELETE /api/vendor/category-requests/[id] error:', error);
    return ApiResponse.serverError(error.message || 'Internal Server Error');
  }
}
