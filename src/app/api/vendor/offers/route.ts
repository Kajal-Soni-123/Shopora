import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';

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

// In-memory persistent offer store for vendor promotional campaigns
let vendorOffersStore: VendorOfferItem[] = [
  {
    id: 'offer-1',
    title: 'Festive Season Clearance',
    discountType: 'PERCENTAGE',
    discountValue: 20,
    scope: 'ALL_PRODUCTS',
    startDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 10 * 86400000).toISOString(),
    note: 'Special 20% discount across all store products for the holiday season.',
    vendorId: 'vendor-1',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'offer-2',
    title: 'Footwear & Apparel Flash Sale',
    discountType: 'FIXED_AMOUNT',
    discountValue: 15,
    scope: 'CATEGORY',
    categoryName: 'Footwear',
    startDate: new Date(Date.now() + 1 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    note: 'Flat $15 off on all footwear purchases.',
    vendorId: 'vendor-1',
    createdAt: new Date().toISOString(),
  },
];

// GET /api/vendor/offers - Fetch offers for logged-in vendor
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'VENDOR' || !sessionUser.vendorId) {
      return ApiResponse.unauthorized('Access denied. Merchant Partner authentication required.');
    }

    const offers = vendorOffersStore.filter(
      (o) => o.vendorId === sessionUser.vendorId || sessionUser.role === 'VENDOR'
    );

    return ApiResponse.success(offers);
  } catch (error) {
    console.error('Fetch vendor offers error:', error);
    return ApiResponse.serverError('Failed to fetch vendor offers.');
  }
}

// POST /api/vendor/offers - Create new promotional offer
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

    const newOffer: VendorOfferItem = {
      id: `offer-${Date.now()}`,
      title: title.trim(),
      discountType,
      discountValue,
      scope: scope || 'ALL_PRODUCTS',
      categoryId: categoryId || null,
      categoryName: categoryName || null,
      productIds: productIds || [],
      productTitles: productTitles || [],
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      note: note ? note.trim() : undefined,
      vendorId: sessionUser.vendorId,
      createdAt: new Date().toISOString(),
    };

    vendorOffersStore.unshift(newOffer);

    return ApiResponse.created(newOffer, 'Promotional offer created successfully!');
  } catch (error) {
    console.error('Create vendor offer error:', error);
    return ApiResponse.serverError('Failed to create promotional offer.');
  }
}

// DELETE /api/vendor/offers - Delete an existing offer
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

    vendorOffersStore = vendorOffersStore.filter((o) => o.id !== offerId);

    return ApiResponse.success({ id: offerId }, 'Offer deleted successfully!');
  } catch (error) {
    console.error('Delete vendor offer error:', error);
    return ApiResponse.serverError('Failed to delete offer.');
  }
}
