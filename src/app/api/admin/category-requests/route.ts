import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';

// GET /api/admin/category-requests - List all category requests for Admin review
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser || authUser.role !== 'ADMIN') {
      return ApiResponse.forbidden('Unauthorized. Super Admin access required.');
    }

    const delegate = (prisma as any).categoryRequest || (prisma as any).category_requests || (prisma as any).CategoryRequest;
    if (!delegate) {
      return ApiResponse.serverError('CategoryRequest Prisma model delegate is not available on database client.');
    }

    const requests = await delegate.findMany({
      include: {
        vendor: {
          select: { id: true, name: true, email: true, warehouseLocation: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Populate suggested parent category names
    const parentIds = requests
      .map((r: any) => r.suggestedParentId)
      .filter((id: any): id is string => Boolean(id));

    const parentCategories = parentIds.length > 0
      ? await prisma.category.findMany({
          where: { id: { in: parentIds } },
          select: { id: true, name: true },
        })
      : [];

    const parentMap = new Map(parentCategories.map((p) => [p.id, p.name]));

    const enrichedRequests = requests.map((r: any) => ({
      ...r,
      suggestedParentName: r.suggestedParentId ? parentMap.get(r.suggestedParentId) || null : null,
    }));

    return ApiResponse.success(enrichedRequests);
  } catch (error: any) {
    console.error('GET /api/admin/category-requests error:', error);
    return ApiResponse.serverError(error.message || 'Internal Server Error');
  }
}
