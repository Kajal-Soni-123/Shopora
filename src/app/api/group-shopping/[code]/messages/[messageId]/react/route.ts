export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string; messageId: string } }
) {
  try {
    const { code, messageId } = params;
    const user = await getSessionUser();
    const body = await req.json();
    const { memberId, emoji } = body;

    const message = await prisma.groupChatMessage.findUnique({
      where: { id: messageId },
      include: {
        session: {
          include: { members: true },
        },
      },
    });

    if (!message || message.session.code !== code) {
      return NextResponse.json(
        { success: false, error: 'Message not found' },
        { status: 404 }
      );
    }

    let activeMember = memberId
      ? message.session.members.find((m) => m.id === memberId)
      : user?.userId
      ? message.session.members.find((m) => m.userId === user.userId)
      : message.session.members[0];

    if (!activeMember) {
      return NextResponse.json(
        { success: false, error: 'Member not found in session' },
        { status: 403 }
      );
    }

    const currentReactions: Record<string, string> = (message.reactions as Record<string, string>) || {};
    
    // Toggle reaction if same emoji selected, else set new emoji
    if (currentReactions[activeMember.id] === emoji) {
      delete currentReactions[activeMember.id];
    } else {
      currentReactions[activeMember.id] = emoji;
    }

    const updated = await prisma.groupChatMessage.update({
      where: { id: messageId },
      data: { reactions: currentReactions },
      include: {
        sender: {
          select: {
            id: true,
            guestName: true,
            role: true,
          },
        },
        product: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating reaction:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update reaction' },
      { status: 500 }
    );
  }
}
