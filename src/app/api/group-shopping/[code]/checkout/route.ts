export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const user = await getSessionUser();
    const body = await req.json();
    const { checkoutMode = "HOST_PAY" } = body;

    const session = await prisma.groupShoppingSession.findUnique({
      where: { code },
      include: {
        members: true,
        items: {
          include: {
            product: true,
            addedBy: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Group shopping session not found" },
        { status: 404 }
      );
    }

    if (session.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Group shopping cart is empty" },
        { status: 400 }
      );
    }

    // Update checkoutMode and session status
    const updatedSession = await prisma.groupShoppingSession.update({
      where: { id: session.id },
      data: {
        checkoutMode,
        status: checkoutMode === 'SPLIT_PAY' ? 'WAITING_FOR_PAYMENTS' : 'CHECKED_OUT',
      },
      include: {
        members: true,
        items: {
          include: { product: true, addedBy: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedSession,
      message: checkoutMode === 'SPLIT_PAY'
        ? "Group cart locked! Members can now proceed to pay their share."
        : "Group cart ready for Host Checkout!",
    });
  } catch (error: any) {
    console.error("Error updating group checkout status:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process group checkout" },
      { status: 500 }
    );
  }
}
