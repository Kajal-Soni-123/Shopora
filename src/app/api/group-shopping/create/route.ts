export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

// Helper to generate unique short join codes like GRP-849201
function generateGroupCode(): string {
  const randomDigits = Math.floor(100000 + Math.random() * 900000);
  return `GRP-${randomDigits}`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = await req.json().catch(() => ({}));
    const { title = "Group Shopping Party", checkoutMode = "HOST_PAY", guestHostName } = body;

    let hostUserId = user?.userId;
    let hostName = user?.name || guestHostName || "Host";
    let hostEmail = user?.email || null;

    // If unauthenticated and no guestHostName provided
    if (!hostUserId && !guestHostName) {
      return NextResponse.json(
        { success: false, error: "Please sign in or enter a Host Display Name to start group shopping." },
        { status: 400 }
      );
    }

    // Fallback host user if not signed in (find or use system guest host)
    if (!hostUserId) {
      const demoHostUser = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
      if (demoHostUser) {
        hostUserId = demoHostUser.id;
      } else {
        return NextResponse.json(
          { success: false, error: "Unable to assign host user." },
          { status: 400 }
        );
      }
    }

    let code = generateGroupCode();
    let existing = await prisma.groupShoppingSession.findUnique({ where: { code } });
    while (existing) {
      code = generateGroupCode();
      existing = await prisma.groupShoppingSession.findUnique({ where: { code } });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const session = await prisma.groupShoppingSession.create({
      data: {
        code,
        title,
        hostUserId,
        checkoutMode,
        expiresAt,
        members: {
          create: {
            userId: user?.userId || null,
            guestName: hostName,
            guestEmail: hostEmail,
            role: "HOST",
            status: "JOINED",
          },
        },
      },
      include: {
        members: true,
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: session,
      message: `Group Shopping session created! Invite code: ${code}`,
    });
  } catch (error: any) {
    console.error("Error creating group shopping session:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create group shopping session" },
      { status: 500 }
    );
  }
}
