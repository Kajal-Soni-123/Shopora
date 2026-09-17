import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

export interface VendorOfferItem {
  id: string;
  title: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  scope: 'ALL_PRODUCTS' | 'CATEGORY' | 'SPECIFIC_PRODUCTS';
  categoryId?: string | null;
  categoryName?: string | null;
  productIds?: string[];
  productTitles?: string[];
  startDate: string;
  endDate: string;
  note?: string;
  vendorId: string;
  createdAt: string;
}

// GET /api/vendor/offers - Fetch offers for logged-in vendor from PostgreSQL
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'VENDOR' || !sessionUser.vendorId) {
      return ApiResponse.unauthorized('Access denied. Merchant Partner authentication required.');
    }

    const dbOffers = await prisma.offer.findMany({
      where: { vendorId: sessionUser.vendorId },
      orderBy: { createdAt: 'desc' },
    });

    const formattedOffers = dbOffers.map((o) => ({
      id: o.id,
      title: o.title,
      discountType: o.discountType as 'PERCENTAGE' | 'FIXED_AMOUNT',
      discountValue: o.discountValue,
      scope: o.scope as 'ALL_PRODUCTS' | 'CATEGORY' | 'SPECIFIC_PRODUCTS',
      categoryId: o.categoryId,
      categoryName: o.categoryName,
      productIds: o.productIds,
      productTitles: o.productTitles,
      startDate: o.startDate.toISOString(),
      endDate: o.endDate.toISOString(),
      note: o.note || undefined,
      vendorId: o.vendorId,
      createdAt: o.createdAt.toISOString(),
    }));

    return ApiResponse.success(formattedOffers);
  } catch (error) {
    console.error('Fetch vendor offers error:', error);
    return ApiResponse.serverError('Failed to fetch vendor offers.');
  }
}

// POST /api/vendor/offers - Create new promotional offer in PostgreSQL
export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'VENDOR' || !sessionUser.vendorId) {
      return ApiResponse.unauthorized('Access denied. Merchant Partner authentication required.');
    }

    const body = await request.json();
    const {
      title,
      discountType,
      discountValue,
      scope,
      categoryId,
      categoryName,
      productIds,
      productTitles,
      startDate,
      endDate,
      note,
    } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return ApiResponse.badRequest('Offer title/occasion is required.');
    }
    if (!discountType || !['PERCENTAGE', 'FIXED_AMOUNT'].includes(discountType)) {
      return ApiResponse.badRequest('Valid discount type (PERCENTAGE or FIXED_AMOUNT) is required.');
    }
    if (typeof discountValue !== 'number' || discountValue <= 0) {
      return ApiResponse.badRequest('Discount value must be greater than 0.');
    }
    if (discountType === 'PERCENTAGE' && discountValue > 100) {
      return ApiResponse.badRequest('Percentage discount cannot exceed 100%.');
    }
    if (!startDate || !endDate) {
      return ApiResponse.badRequest('Start date and End date are required.');
    }
    if (new Date(endDate) <= new Date(startDate)) {
      return ApiResponse.badRequest('End date must be after the start date.');
    }

    const newOffer = await prisma.offer.create({
      data: {
        title: title.trim(),
        discountType,
        discountValue,
        scope: scope || 'ALL_PRODUCTS',
        categoryId: categoryId || null,
        categoryName: categoryName || null,
        productIds: productIds || [],
        productTitles: productTitles || [],
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        note: note ? note.trim() : null,
        vendorId: sessionUser.vendorId,
      },
    });

    const formattedOffer = {
      id: newOffer.id,
      title: newOffer.title,
      discountType: newOffer.discountType as 'PERCENTAGE' | 'FIXED_AMOUNT',
      discountValue: newOffer.discountValue,
      scope: newOffer.scope as 'ALL_PRODUCTS' | 'CATEGORY' | 'SPECIFIC_PRODUCTS',
      categoryId: newOffer.categoryId,
      categoryName: newOffer.categoryName,
      productIds: newOffer.productIds,
      productTitles: newOffer.productTitles,
      startDate: newOffer.startDate.toISOString(),
      endDate: newOffer.endDate.toISOString(),
      note: newOffer.note || undefined,
      vendorId: newOffer.vendorId,
      createdAt: newOffer.createdAt.toISOString(),
    };

    return ApiResponse.created(formattedOffer, 'Promotional offer created successfully!');
  } catch (error) {
    console.error('Create vendor offer error:', error);
    return ApiResponse.serverError('Failed to create promotional offer.');
  }
}

// DELETE /api/vendor/offers - Delete an existing offer from PostgreSQL
export async function DELETE(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'VENDOR') {
      return ApiResponse.unauthorized('Access denied.');
    }

    const { searchParams } = new URL(request.url);
    const offerId = searchParams.get('id');

    if (!offerId) {
      return ApiResponse.badRequest('Offer ID is required for deletion.');
    }

    await prisma.offer.deleteMany({
      where: {
        id: offerId,
        ...(sessionUser.role === 'VENDOR' && sessionUser.vendorId ? { vendorId: sessionUser.vendorId } : {}),
      },
    });

    return ApiResponse.success({ id: offerId }, 'Offer deleted successfully!');
  } catch (error) {
    console.error('Delete vendor offer error:', error);
    return ApiResponse.serverError('Failed to delete offer.');
  }
}
