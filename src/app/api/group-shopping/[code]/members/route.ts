export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const currentUser = await getSessionUser();
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get('memberId');

    const session = await prisma.groupShoppingSession.findUnique({
      where: { code },
      include: { members: true },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Group shopping session not found' },
        { status: 404 }
      );
    }

    let targetMember = null;

    if (memberId) {
      targetMember = session.members.find((m) => m.id === memberId);
    } else if (currentUser) {
      targetMember = session.members.find(
        (m) =>
          (currentUser.userId && m.userId === currentUser.userId) ||
          (currentUser.email && m.guestEmail?.toLowerCase() === currentUser.email.toLowerCase())
      );
    }

    if (!targetMember) {
      return NextResponse.json(
        { success: false, error: 'Member not found in this group session' },
        { status: 404 }
      );
    }

    // Host check: cannot delete the HOST member
    if (targetMember.role === 'HOST') {
      return NextResponse.json(
        { success: false, error: 'The session Host cannot be removed from the party.' },
        { status: 400 }
      );
    }

    // Perform deletion
    await prisma.groupSessionMember.delete({
      where: { id: targetMember.id },
    });

    return NextResponse.json({
      success: true,
      message: `Member ${targetMember.guestName} removed successfully from the party.`,
    });
  } catch (error: any) {
    console.error('Error removing group session member:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to remove member' },
      { status: 500 }
    );
  }
}
