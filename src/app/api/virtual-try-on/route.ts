import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { VirtualTryOnService } from '@/lib/virtual-try-on/VirtualTryOnService';
import { detectJewelleryType } from '@/lib/virtual-try-on/categoryUtils';
import { JewelleryType, VirtualTryOnResponse } from '@/lib/virtual-try-on/types';
import { isTryOnEnabled } from '@/lib/try-on/tryOnModel';

export const maxDuration = 60; // Allow 60s max execution for AI generation

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest): Promise<NextResponse<VirtualTryOnResponse>> {
  try {
    const body = await req.json().catch(() => ({}));
    const userImage = body.userImage || body.personImage;
    const { productId, jewelleryType: requestedType } = body;

    // 1. Basic Parameter Validation
    if (!productId || typeof productId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    if (!userImage || typeof userImage !== 'string') {
      return NextResponse.json(
        { success: false, error: 'We couldn\'t use this image. Please upload a clear JPG or PNG photo.' },
        { status: 400 }
      );
    }

    // 2. Validate Image MIME Type & Size
    let isMimeValid = false;
    if (userImage.startsWith('data:')) {
      const mimeMatch = userImage.match(/^data:(image\/[a-zA-Z+]+);base64,/);
      if (mimeMatch) {
        const mimeType = mimeMatch[1].toLowerCase();
        if (ALLOWED_MIME_TYPES.includes(mimeType)) {
          isMimeValid = true;
        }
      }
    } else if (userImage.startsWith('http://') || userImage.startsWith('https://')) {
      isMimeValid = true;
    }

    if (!isMimeValid) {
      return NextResponse.json(
        { success: false, error: 'We couldn\'t use this image. Please upload a clear JPG or PNG photo.' },
        { status: 400 }
      );
    }

    // Check approximate base64 payload size
    if (userImage.startsWith('data:') && userImage.length > MAX_FILE_SIZE_BYTES * 1.37) {
      return NextResponse.json(
        { success: false, error: 'Image size exceeds maximum 10MB limit. Please upload a smaller photo.' },
        { status: 400 }
      );
    }

    // 3. Database Validation of Product
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true }
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found.' },
        { status: 444 }
      );
    }

    const prod = product as any;

    if (!isTryOnEnabled(prod)) {
      return NextResponse.json(
        { success: false, error: 'Try-on is not available for this product yet.' },
        { status: 400 }
      );
    }

    // 4. Identify Jewellery Type
    const jewelleryType: JewelleryType | null =
      (requestedType as JewelleryType) || detectJewelleryType(prod);

    if (!jewelleryType) {
      return NextResponse.json(
        { success: false, error: 'This product is not eligible for jewellery virtual try-on.' },
        { status: 400 }
      );
    }

    // 5. Retrieve Product Try-On Image
    const productImage = (
      (prod.tryOnImage || '').trim() ||
      (prod.image || '').trim() ||
      (Array.isArray(prod.images) && prod.images[0] ? prod.images[0].trim() : '')
    );

    if (!productImage) {
      return NextResponse.json(
        { success: false, error: 'Try-on is not available for this product yet.' },
        { status: 400 }
      );
    }

    // 6. Execute Virtual Try-On Service
    const vtonService = VirtualTryOnService.getInstance();
    const result = await vtonService.generateTryOn({
      userImage,
      productImage,
      jewelleryType,
      productId: product.id,
      productTitle: product.title
    });

    return NextResponse.json({
      success: true,
      resultImageUrl: result.imageUrl,
      jewelleryType,
      providerName: result.providerName || vtonService.getProviderName(jewelleryType),
      llmAnalysis: result.llmAnalysis
    });
  } catch (error: any) {
    console.error('Error in POST /api/virtual-try-on:', error);

    const userFriendlyMessage = error.message?.includes('PERFECT_CORP_API_KEY')
      ? 'Perfect Corp API key is not configured on the server. Please check environment variables.'
      : error.message?.includes('taking longer than expected')
      ? 'The try-on is taking longer than expected. Please try again.'
      : error.message || 'We couldn\'t create your try-on right now. Please try again.';

    return NextResponse.json(
      {
        success: false,
        error: userFriendlyMessage
      },
      { status: 500 }
    );
  }
}
