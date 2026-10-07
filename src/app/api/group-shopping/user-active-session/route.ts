export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { findPendingInvites } from '@/lib/groupInvites';

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
        status: { in: ['ACTIVE', 'WAITING_FOR_PAYMENTS'] },
        expiresAt: { gt: new Date() },
        OR: [
          { hostUserId: currentUser.userId },
          {
            members: {
              some: {
                status: { not: 'INVITED' }, // an invitation isn't membership until accepted
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

    const invites = await findPendingInvites(currentUser);

    if (!session) {
      return NextResponse.json({
        success: true,
        session: null,
        invites,
      });
    }

    // The user's own (joined) member record — pending invitations are never auto-accepted
    let member = session.members.find(
      (m) =>
        m.status !== 'INVITED' &&
        (m.userId === currentUser.userId ||
          (m.guestEmail && m.guestEmail.toLowerCase() === currentUser.email.toLowerCase()))
    );

    if (member && !member.userId) {
      // Link a guest record joined with this email to the logged-in account
      member = await prisma.groupSessionMember.update({
        where: { id: member.id },
        data: { userId: currentUser.userId, guestName: currentUser.name || member.guestName },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      session,
      member: member || null,
      invites,
    });
  } catch (error: any) {
    console.error('Error checking user active group session:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check active session' },
      { status: 500 }
    );
  }
}
