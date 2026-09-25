import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DELETE /api/group-shopping/[code]/messages/[messageId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { code: string; messageId: string } }
) {
  try {
    const { code, messageId } = params;
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'memberId is required' },
        { status: 400 }
      );
    }

    const message = await prisma.groupChatMessage.findUnique({
      where: { id: messageId },
      include: {
        session: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!message || message.session.code !== code) {
      return NextResponse.json(
        { success: false, error: 'Message not found in this session' },
        { status: 404 }
      );
    }

    // Check if requester is message sender or session host
    const requester = message.session.members.find((m) => m.id === memberId);
    if (!requester) {
      return NextResponse.json(
        { success: false, error: 'Member not found in session' },
        { status: 403 }
      );
    }

    const isSender = message.senderId === memberId;
    const isHost = requester.role === 'HOST';

    if (!isSender && !isHost) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to delete this message' },
        { status: 403 }
      );
    }

    await prisma.groupChatMessage.delete({
      where: { id: messageId },
    });

    return NextResponse.json({
      success: true,
      messageId,
    });
  } catch (error: any) {
    console.error('Error deleting chat message:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete message' },
      { status: 500 }
    );
  }
}
