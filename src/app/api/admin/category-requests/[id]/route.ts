import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { sendCategoryRequestStatusToVendor } from '@/lib/emailService';
import { createNotification } from '@/lib/notificationService';
import { ApiResponse } from '@/lib/api-response';

function slugifyText(text: string): string {
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

// PATCH /api/admin/category-requests/[id] - Approve or Reject category request
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser || authUser.role !== 'ADMIN') {
      return ApiResponse.forbidden('Unauthorized. Super Admin access required.');
    }

    const requestId = params.id;
    const body = await req.json();
    const { status, adminNotes } = body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return ApiResponse.badRequest('Invalid status. Must be APPROVED or REJECTED.');
    }

    const delegate = (prisma as any).categoryRequest || (prisma as any).category_requests || (prisma as any).CategoryRequest;
    if (!delegate) {
      return ApiResponse.serverError('CategoryRequest Prisma model delegate is not available on database client.');
    }

    const categoryRequest = await delegate.findUnique({
      where: { id: requestId },
      include: {
        vendor: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!categoryRequest) {
      return ApiResponse.notFound('Category request not found.');
    }

    let createdCategory = null;
    let suggestedParentName: string | null = null;

    if (categoryRequest.suggestedParentId) {
      const parent = await prisma.category.findUnique({
        where: { id: categoryRequest.suggestedParentId },
        select: { name: true },
      });
      if (parent) {
        suggestedParentName = parent.name;
      }
    }

    // If APPROVING the request, create the Category if it doesn't already exist
    if (status === 'APPROVED') {
      const baseSlug = slugifyText(categoryRequest.name);
      let slug = baseSlug;

      // Handle duplicate slug resolution if necessary
      const existingSlugCount = await prisma.category.count({
        where: { slug: { startsWith: baseSlug } },
      });
      if (existingSlugCount > 0) {
        slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
      }

      // Check if category name already exists
      const existingCat = await prisma.category.findFirst({
        where: { name: { equals: categoryRequest.name, mode: 'insensitive' } },
      });

      if (existingCat) {
        createdCategory = existingCat;
      } else {
        createdCategory = await prisma.category.create({
          data: {
            name: categoryRequest.name,
            slug,
            parentId: categoryRequest.suggestedParentId || null,
            fields: categoryRequest.fields || [], // Custom dynamic form fields suggested by vendor!
          },
        });
      }
    }

    // Update Category Request status in DB
    const updatedRequest = await delegate.update({
      where: { id: requestId },
      data: {
        status,
        adminNotes: adminNotes?.trim() || null,
      },
    });

    // Dispatch email notification to Vendor
    let emailLog = null;
    try {
      emailLog = await sendCategoryRequestStatusToVendor({
        requestId: categoryRequest.id,
        categoryName: categoryRequest.name,
        vendorName: categoryRequest.vendor.name,
        vendorEmail: categoryRequest.vendor.email,
        suggestedParentName,
        status: status as 'APPROVED' | 'REJECTED',
        adminNotes: adminNotes?.trim() || null,
      });
    } catch (emailErr) {
      console.error('Failed to send vendor email notification:', emailErr);
    }

    // Dispatch in-app notification to Vendor
    await createNotification({
      email: categoryRequest.vendor.email,
      title: status === 'APPROVED' ? 'Category Request Approved! 🎉' : 'Category Request Update 📂',
      message: status === 'APPROVED'
        ? `Your request for category "${categoryRequest.name}" has been approved by admin.`
        : `Your request for category "${categoryRequest.name}" was rejected. Notes: ${adminNotes || 'No notes provided.'}`,
      type: 'CATEGORY_REQUEST',
      link: '/vendor/dashboard',
    });

    const message = status === 'APPROVED'
      ? `Category request approved! Category "${categoryRequest.name}" has been created and vendor notified via email.`
      : `Category request rejected. Vendor has been notified via email with your feedback.`;

    return ApiResponse.success(
      {
        request: updatedRequest,
        createdCategory,
        emailNotification: emailLog,
      },
      message
    );
  } catch (error: any) {
    console.error('PATCH /api/admin/category-requests/[id] error:', error);
    return ApiResponse.serverError(error.message || 'Internal Server Error');
  }
}
