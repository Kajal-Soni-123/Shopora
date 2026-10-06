export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { resolveActingMember, isStaleIdentity, STALE_IDENTITY_ERROR } from '@/lib/groupMember';

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string; messageId: string } }
) {
  try {
    const { code, messageId } = params;
    const user = await getSessionUser();
    const body = await req.json();
    const { memberId, vote } = body;

    // BUY / MAYBE / PASS are the options the suggestion card offers; YES / NO kept for older clients
    if (!vote || !['BUY', 'MAYBE', 'PASS', 'YES', 'NO'].includes(vote)) {
      return NextResponse.json(
        { success: false, error: 'Vote must be BUY, MAYBE or PASS' },
        { status: 400 }
      );
    }

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

    const activeMember = resolveActingMember(message.session.members, user, memberId);

    if (isStaleIdentity(activeMember, user, memberId)) {
      return NextResponse.json(
        { success: false, staleIdentity: true, error: STALE_IDENTITY_ERROR },
        { status: 409 }
      );
    }

    if (!activeMember) {
      return NextResponse.json(
        { success: false, error: 'Member not found in session' },
        { status: 403 }
      );
    }

    // Toggle this member's vote atomically in the DB (same choice → remove, else set),
    // so concurrent votes from different members can't overwrite each other.
    await prisma.$executeRaw`
      UPDATE group_chat_messages
      SET votes = CASE
        WHEN COALESCE(votes::jsonb, '{}'::jsonb) ->> ${activeMember.id} = ${vote}
          THEN COALESCE(votes::jsonb, '{}'::jsonb) - ${activeMember.id}
        ELSE COALESCE(votes::jsonb, '{}'::jsonb) || jsonb_build_object(${activeMember.id}::text, ${vote}::text)
      END
      WHERE id = ${messageId}
    `;

    const updated = await prisma.groupChatMessage.findUnique({
      where: { id: messageId },
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
    console.error('Error recording vote:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to record vote' },
      { status: 500 }
    );
  }
}
