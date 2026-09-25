export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;

    const session = await prisma.groupShoppingSession.findUnique({
      where: { code },
      include: {
        hostUser: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                title: true,
                price: true,
                image: true,
                stock: true,
                vendorId: true,
              },
            },
            addedBy: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Group shopping session not found" },
        { status: 404 }
      );
    }

    // Check expiration
    if (new Date() > new Date(session.expiresAt) && session.status === 'ACTIVE') {
      await prisma.groupShoppingSession.update({
        where: { id: session.id },
        data: { status: 'EXPIRED' },
      });
      session.status = 'EXPIRED';
    }

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error: any) {
    console.error("Error fetching group shopping session:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch session" },
      { status: 500 }
    );
  }
}
