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
    const { memberId, vote } = body;

    if (!vote || !['YES', 'NO'].includes(vote)) {
      return NextResponse.json(
        { success: false, error: 'Vote must be YES or NO' },
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

    const currentVotes: Record<string, string> = (message.votes as Record<string, string>) || {};

    // Toggle vote if same choice selected, else set new vote
    if (currentVotes[activeMember.id] === vote) {
      delete currentVotes[activeMember.id];
    } else {
      currentVotes[activeMember.id] = vote;
    }

    const updated = await prisma.groupChatMessage.update({
      where: { id: messageId },
      data: { votes: currentVotes },
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
