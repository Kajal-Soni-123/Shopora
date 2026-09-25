import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { sendCategoryRequestToAdmin } from '@/lib/emailService';
import { createNotification } from '@/lib/notificationService';
import { ApiResponse } from '@/lib/api-response';

function slugifyText(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

// POST /api/vendor/category-requests - Submit a new category request
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser || authUser.role !== 'VENDOR' || !authUser.vendorId) {
      return ApiResponse.unauthorized('Unauthorized. Merchant Partner authentication required.');
    }

    const body = await req.json();
    const { name, suggestedParentId, reason, fields } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return ApiResponse.badRequest('Category name is required.');
    }

    const trimmedName = name.trim();

    // Check if category with this name already exists in active categories
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: { equals: trimmedName, mode: 'insensitive' },
      },
    });

    if (existingCategory) {
      return ApiResponse.badRequest(`A category named "${trimmedName}" already exists on the marketplace.`);
    }

    // Fetch vendor details
    const vendor = await prisma.vendor.findUnique({
      where: { id: authUser.vendorId },
    });

    if (!vendor) {
      return ApiResponse.notFound('Vendor account record not found.');
    }

    // Fetch suggested parent category name if specified
    let suggestedParentName: string | null = null;
    if (suggestedParentId) {
      const parentCat = await prisma.category.findUnique({
        where: { id: suggestedParentId },
        select: { name: true },
      });
      if (parentCat) {
        suggestedParentName = parentCat.name;
      }
    }

    // Create Category Request in DB
    const delegate = (prisma as any).categoryRequest || (prisma as any).category_requests || (prisma as any).CategoryRequest;
    if (!delegate) {
      return ApiResponse.serverError('CategoryRequest Prisma model delegate is not available on database client.');
    }

    const categoryRequest = await delegate.create({
      data: {
        vendorId: authUser.vendorId,
        name: trimmedName,
        suggestedParentId: suggestedParentId || null,
        reason: reason?.trim() || null,
        fields: Array.isArray(fields) ? fields : null,
        status: 'PENDING',
      },
    });

    // Dispatch email notification to Admin
    let emailLog = null;
    try {
      emailLog = await sendCategoryRequestToAdmin({
        requestId: categoryRequest.id,
        categoryName: trimmedName,
        vendorName: vendor.name,
        vendorEmail: vendor.email,
        suggestedParentName,
        reason: categoryRequest.reason,
        fields: categoryRequest.fields as any,
      });
    } catch (emailErr) {
      console.error('Failed to send admin email notification:', emailErr);
    }

    // Dispatch in-app notification to Vendor
    await createNotification({
      userId: authUser.userId,
      email: vendor.email,
      title: 'Category Request Submitted 📂',
      message: `Your request for category "${trimmedName}" has been submitted for admin review.`,
      type: 'CATEGORY_REQUEST',
      link: '/vendor/dashboard',
    });

    // Dispatch in-app notification to Admin users
    try {
      const adminUsers = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true, email: true },
      });
      for (const admin of adminUsers) {
        await createNotification({
          userId: admin.id,
          email: admin.email,
          title: 'New Category Request 📂',
          message: `Vendor ${vendor.name} requested new category "${trimmedName}".`,
          type: 'CATEGORY_REQUEST',
          link: '/admin/dashboard?tab=category-requests',
        });
      }
    } catch (adminNotifErr) {
      console.error('Error notifying admins of category request:', adminNotifErr);
    }

    return ApiResponse.created(
      categoryRequest,
      'Category request submitted successfully. Super Admin has been notified via email and in-app notification.'
    );
  } catch (error: any) {
    console.error('POST /api/vendor/category-requests error:', error);
    return ApiResponse.serverError(error.message || 'Internal Server Error');
  }
}

// GET /api/vendor/category-requests - List category requests for logged-in vendor
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser || authUser.role !== 'VENDOR' || !authUser.vendorId) {
      return ApiResponse.unauthorized('Unauthorized. Merchant Partner authentication required.');
    }

    const delegate = (prisma as any).categoryRequest || (prisma as any).category_requests || (prisma as any).CategoryRequest;
    if (!delegate) {
      return ApiResponse.serverError('CategoryRequest Prisma model delegate is not available on database client.');
    }

    const requests = await delegate.findMany({
      where: { vendorId: authUser.vendorId },
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
    console.error('GET /api/vendor/category-requests error:', error);
    return ApiResponse.serverError(error.message || 'Internal Server Error');
  }
}
