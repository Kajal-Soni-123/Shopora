import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getSessionUser();

    if (!currentUser?.userId || !currentUser?.email) {
      return NextResponse.json({
        success: false,
        session: null,
        message: 'No authenticated user session found.',
      });
    }

    // Look up any active non-expired session where user is host or member
    const session = await prisma.groupShoppingSession.findFirst({
      where: {
        status: 'ACTIVE',
        expiresAt: { gt: new Date() },
        OR: [
          { hostUserId: currentUser.userId },
          {
            members: {
              some: {
                OR: [
                  { userId: currentUser.userId },
                  { guestEmail: { equals: currentUser.email, mode: 'insensitive' } },
                ],
              },
            },
          },
        ],
      },
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
      orderBy: { updatedAt: 'desc' },
    });

    if (!session) {
      return NextResponse.json({
        success: true,
        session: null,
      });
    }

    // Find or update the member record for this user
    let member = session.members.find(
      (m) =>
        m.userId === currentUser.userId ||
        (m.guestEmail && m.guestEmail.toLowerCase() === currentUser.email.toLowerCase())
    );

    if (member && (member.status === 'INVITED' || !member.userId)) {
      // Auto-claim member status for logged-in user
      const updatedMember = await prisma.groupSessionMember.update({
        where: { id: member.id },
        data: {
          userId: currentUser.userId,
          guestName: currentUser.name || member.guestName,
          status: member.status === 'INVITED' ? 'JOINED' : member.status,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      });

      member = updatedMember;
    }

    return NextResponse.json({
      success: true,
      session,
      member: member || null,
    });
  } catch (error: any) {
    console.error('Error checking user active group session:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check active session' },
      { status: 500 }
    );
  }
}
