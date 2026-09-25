import { NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

// Helper: compare JSON attributes for exact match
function areAttributesEqual(attr1: any, attr2: any): boolean {
  if (!attr1 && !attr2) return true;
  if (!attr1 || !attr2) return false;
  return JSON.stringify(attr1) === JSON.stringify(attr2);
}

// GET /api/cart - Retrieve user's cart from DB
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) {
      return ApiResponse.success([]);
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: sessionUser.userId },
      include: {
        product: {
          include: {
            vendor: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const formattedCart = cartItems.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      product: {
        ...item.product,
        attributes: (item.attributes as any) || item.product.attributes,
      },
    }));

    return ApiResponse.success(formattedCart);
  } catch (error) {
    console.error('Fetch cart error:', error);
    return ApiResponse.serverError('Failed to fetch cart items', error);
  }
}

// POST /api/cart - Add or update cart item in DB
export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) {
      return ApiResponse.badRequest('Please sign in to add items to your account cart');
    }

    const body = await request.json();
    const { productId, quantity = 1, attributes } = body as {
      productId: string;
      quantity?: number;
      attributes?: Record<string, any>;
    };

    if (!productId) {
      return ApiResponse.badRequest('productId is required');
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return ApiResponse.notFound('Product not found');
    }

    // Find existing cart item for same product & attributes
    const userCart = await prisma.cartItem.findMany({
      where: { userId: sessionUser.userId, productId },
    });

    const existingItem = userCart.find((ci) =>
      areAttributesEqual(ci.attributes, attributes)
    );

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          userId: sessionUser.userId,
          productId,
          quantity,
          attributes: attributes || null,
        },
      });
    }

    // Fetch updated cart
    const updatedCart = await prisma.cartItem.findMany({
      where: { userId: sessionUser.userId },
      include: { product: true },
      orderBy: { createdAt: 'asc' },
    });

    const formattedCart = updatedCart.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      product: {
        ...item.product,
        attributes: (item.attributes as any) || item.product.attributes,
      },
    }));

    return ApiResponse.success(formattedCart, 'Item added to cart');
  } catch (error) {
    console.error('Add cart item error:', error);
    return ApiResponse.serverError('Failed to add item to cart', error);
  }
}

// PUT /api/cart - Update item quantity in DB
export async function PUT(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) {
      return ApiResponse.badRequest('Unauthorized');
    }

    const body = await request.json();
    const { cartItemId, productId, quantity } = body as {
      cartItemId?: string;
      productId?: string;
      quantity: number;
    };

    if (cartItemId) {
      if (quantity <= 0) {
        await prisma.cartItem.delete({ where: { id: cartItemId } });
      } else {
        await prisma.cartItem.update({
          where: { id: cartItemId },
          data: { quantity },
        });
      }
    } else if (productId) {
      if (quantity <= 0) {
        await prisma.cartItem.deleteMany({
          where: { userId: sessionUser.userId, productId },
        });
      } else {
        await prisma.cartItem.updateMany({
          where: { userId: sessionUser.userId, productId },
          data: { quantity },
        });
      }
    } else {
      return ApiResponse.badRequest('cartItemId or productId is required');
    }

    // Fetch updated cart
    const updatedCart = await prisma.cartItem.findMany({
      where: { userId: sessionUser.userId },
      include: { product: true },
      orderBy: { createdAt: 'asc' },
    });

    const formattedCart = updatedCart.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      product: {
        ...item.product,
        attributes: (item.attributes as any) || item.product.attributes,
      },
    }));

    return ApiResponse.success(formattedCart, 'Cart updated');
  } catch (error) {
    console.error('Update cart error:', error);
    return ApiResponse.serverError('Failed to update cart', error);
  }
}

// DELETE /api/cart - Remove item or clear cart in DB
export async function DELETE(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser?.userId) {
      return ApiResponse.success([]);
    }

    const { searchParams } = new URL(request.url);
    const cartItemId = searchParams.get('cartItemId');
    const productId = searchParams.get('productId');
    const clearAll = searchParams.get('clearAll') === 'true';

    if (clearAll) {
      await prisma.cartItem.deleteMany({
        where: { userId: sessionUser.userId },
      });
    } else if (cartItemId) {
      await prisma.cartItem.delete({
        where: { id: cartItemId },
      });
    } else if (productId) {
      await prisma.cartItem.deleteMany({
        where: { userId: sessionUser.userId, productId },
      });
    }

    const updatedCart = await prisma.cartItem.findMany({
      where: { userId: sessionUser.userId },
      include: { product: true },
      orderBy: { createdAt: 'asc' },
    });

    const formattedCart = updatedCart.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      product: {
        ...item.product,
        attributes: (item.attributes as any) || item.product.attributes,
      },
    }));

    return ApiResponse.success(formattedCart, 'Cart cleared');
  } catch (error) {
    console.error('Delete cart error:', error);
    return ApiResponse.serverError('Failed to delete cart items', error);
  }
}
