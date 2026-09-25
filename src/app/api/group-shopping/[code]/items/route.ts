export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

// POST: Add item to group cart
export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const user = await getSessionUser();
    const body = await req.json();
    const { productId, quantity = 1, memberId, attributes } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "Product ID is required" },
        { status: 400 }
      );
    }

    const session = await prisma.groupShoppingSession.findUnique({
      where: { code },
      include: { members: true },
    });

    if (!session || session.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: "Active group session not found" },
        { status: 404 }
      );
    }

    // Determine adding member
    let addedByMember = memberId
      ? session.members.find((m) => m.id === memberId)
      : user?.userId
      ? session.members.find((m) => m.userId === user.userId)
      : session.members[0];

    if (!addedByMember) {
      return NextResponse.json(
        { success: false, error: "Must join session before adding items." },
        { status: 403 }
      );
    }

    // Check if product already exists in group cart for this member
    const existingItem = await prisma.groupCartItem.findFirst({
      where: {
        sessionId: session.id,
        addedById: addedByMember.id,
        productId,
      },
    });

    let item;
    if (existingItem) {
      item = await prisma.groupCartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
        include: { product: true, addedBy: true },
      });
    } else {
      item = await prisma.groupCartItem.create({
        data: {
          sessionId: session.id,
          addedById: addedByMember.id,
          productId,
          quantity,
          attributes: attributes || null,
        },
        include: { product: true, addedBy: true },
      });
    }

    return NextResponse.json({
      success: true,
      data: item,
      message: `Added ${item.product.title} to group cart!`,
    });
  } catch (error: any) {
    console.error("Error adding item to group cart:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add item to group cart" },
      { status: 500 }
    );
  }
}

// PUT: Update item quantity in group cart
export async function PUT(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const body = await req.json();
    const { itemId, quantity } = body;

    if (!itemId || quantity === undefined) {
      return NextResponse.json(
        { success: false, error: "Item ID and valid quantity are required" },
        { status: 400 }
      );
    }

    if (quantity <= 0) {
      await prisma.groupCartItem.delete({ where: { id: itemId } });
      return NextResponse.json({ success: true, message: "Item removed from group cart" });
    }

    const updated = await prisma.groupCartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: { product: true, addedBy: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Error updating group cart item:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update item" },
      { status: 500 }
    );
  }
}

// DELETE: Remove item from group cart
export async function DELETE(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: "Item ID is required" },
        { status: 400 }
      );
    }

    await prisma.groupCartItem.delete({ where: { id: itemId } });

    return NextResponse.json({
      success: true,
      message: "Item removed from group cart",
    });
  } catch (error: any) {
    console.error("Error removing group cart item:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to remove item" },
      { status: 500 }
    );
  }
}
