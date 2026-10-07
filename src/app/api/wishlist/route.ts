export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

/**
 * The signed-in user's wishlist. The user always comes from the auth cookie — a userId sent by
 * the browser is ignored, so nobody can read or change someone else's wishlist.
 */
async function requireUser() {
  const user = await getSessionUser();
  if (!user?.userId) {
    return {
      error: NextResponse.json({ success: false, error: 'Please sign in to use your wishlist.' }, { status: 401 }),
    };
  }
  return { userId: user.userId };
}

// GET /api/wishlist
export async function GET() {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const wishlistItems = await prisma.wishlistItem.findMany({
      where: { userId: auth.userId },
      include: {
        product: {
          include: {
            vendor: { select: { id: true, name: true } },
            category: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: wishlistItems.map((item) => item.product) });
  } catch (error: any) {
    console.error('Error fetching wishlist:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch wishlist items.' },
      { status: 500 }
    );
  }
}

// POST /api/wishlist - Add one product ({ productId }) or several ({ productIds }) to the wishlist
export async function POST(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const body = await request.json().catch(() => ({}));
    const requested: unknown[] = Array.isArray(body.productIds) ? body.productIds : [body.productId];
    const ids = Array.from(new Set(requested.filter((id): id is string => typeof id === 'string' && !!id))).slice(0, 100);
    if (!ids.length) {
      return NextResponse.json({ success: false, error: 'productId is required.' }, { status: 400 });
    }

    // Only real products; duplicates are ignored (unique on userId + productId)
    const existing = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true } });
    const result = await prisma.wishlistItem.createMany({
      data: existing.map((p) => ({ userId: auth.userId, productId: p.id })),
      skipDuplicates: true,
    });

    return NextResponse.json({
      success: true,
      added: result.count,
      message: result.count ? 'Added to wishlist.' : 'Already in wishlist.',
    });
  } catch (error: any) {
    console.error('Error adding to wishlist:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to add product to wishlist.' },
      { status: 500 }
    );
  }
}

// DELETE /api/wishlist?productId=...  - Remove a product from the wishlist
// DELETE /api/wishlist?all=true         - Clear the whole wishlist
export async function DELETE(request: Request) {
  try {
    const auth = await requireUser();
    if (auth.error) return auth.error;

    const params = new URL(request.url).searchParams;
    if (params.get('all') === 'true') {
      await prisma.wishlistItem.deleteMany({ where: { userId: auth.userId } });
      return NextResponse.json({ success: true, message: 'Wishlist cleared.' });
    }

    const productId = params.get('productId');
    if (!productId) {
      return NextResponse.json({ success: false, error: 'productId is required.' }, { status: 400 });
    }

    await prisma.wishlistItem.deleteMany({ where: { userId: auth.userId, productId } });
    return NextResponse.json({ success: true, message: 'Product removed from wishlist.' });
  } catch (error: any) {
    console.error('Error removing from wishlist:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to remove product from wishlist.' },
      { status: 500 }
    );
  }
}
