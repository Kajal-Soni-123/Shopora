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
    const body = await req.json().catch(() => ({}));
    const { guestName, guestEmail } = body;

    const session = await prisma.groupShoppingSession.findUnique({
      where: { code },
      include: { members: true },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Group shopping session not found" },
        { status: 404 }
      );
    }

    if (session.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: `Session is ${session.status.toLowerCase()} and no longer accepting new members.` },
        { status: 400 }
      );
    }

    const displayName = user?.name || guestName || "Guest Member";
    const email = (user?.email || guestEmail || "").trim();
    const emailLower = email.toLowerCase();

    // 1. If user is NOT logged in, check if guestEmail belongs to a registered user account
    if (!user && emailLower) {
      const registeredUser = await prisma.user.findFirst({
        where: { email: { equals: emailLower, mode: 'insensitive' } },
        select: { id: true, email: true, name: true },
      });
      if (registeredUser) {
        return NextResponse.json({
          success: false,
          requiresLogin: true,
          email: registeredUser.email,
          error: `Account found for ${registeredUser.email}. Please log in to join party as a registered member.`,
        });
      }
    }

    // 2. Find existing member record, preferring the strongest identity match:
    //    userId first, then email (case-insensitive), and only then display name.
    //    Name matching is restricted to rows with no linked account/email so a guest
    //    can't accidentally claim (or duplicate) a registered invitee's record.
    const sameEmail = (m: typeof session.members[number]) =>
      !!emailLower && !!m.guestEmail && m.guestEmail.trim().toLowerCase() === emailLower;
    let member =
      (user?.userId && session.members.find((m) => m.userId === user.userId)) ||
      session.members.find(sameEmail) ||
      (!user && !emailLower
        ? session.members.find(
            (m) =>
              !m.userId &&
              !m.guestEmail &&
              !!m.guestName &&
              m.guestName.trim().toLowerCase() === displayName.toLowerCase()
          )
        : undefined) ||
      undefined;

    if (member) {
      // Update existing member record to JOINED status and link userId/email/name
      member = await prisma.groupSessionMember.update({
        where: { id: member.id },
        data: {
          userId: user?.userId || member.userId,
          guestName: user?.name || displayName || member.guestName,
          guestEmail: email || member.guestEmail,
          status: 'JOINED',
        },
      });
    } else {
      // Create new member record only if no matching invited/existing member was found
      member = await prisma.groupSessionMember.create({
        data: {
          sessionId: session.id,
          userId: user?.userId || null,
          guestName: displayName,
          guestEmail: email || null,
          role: 'MEMBER',
          status: 'JOINED',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        session,
        member,
      },
      message: `Welcome to ${session.title}, ${displayName}!`,
    });
  } catch (error: any) {
    console.error("Error joining group shopping session:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to join session" },
      { status: 500 }
    );
  }
}
