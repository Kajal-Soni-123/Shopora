export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { sendGroupShoppingInviteEmail } from '@/lib/emailService';
import { createNotification } from '@/lib/notificationService';

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const user = await getSessionUser();
    const body = await req.json();
    const { recipientEmails = [] } = body;

    if (!recipientEmails || !Array.isArray(recipientEmails) || recipientEmails.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one recipient email is required" },
        { status: 400 }
      );
    }

    const session = await prisma.groupShoppingSession.findUnique({
      where: { code },
      include: { hostUser: true },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Group shopping session not found" },
        { status: 404 }
      );
    }

    const hostName = user?.name || session.hostUser?.name || "A friend";
    const origin = req.headers.get('origin') || 'http://localhost:3000';
    const joinUrl = `${origin}?groupCode=${code}`;

    const sentResults = [];
    for (const email of recipientEmails) {
      if (typeof email === 'string' && email.includes('@')) {
        const cleanEmail = email.trim();
        const result = await sendGroupShoppingInviteEmail({
          recipientEmail: cleanEmail,
          hostName,
          sessionTitle: session.title,
          groupCode: code,
          joinUrl,
        });
        sentResults.push(result);

        // Create in-app notification for recipient user / guest email
        await createNotification({
          email: cleanEmail,
          title: "You're Invited to Co-Shop! 🛍️",
          message: `${hostName} invited you to join their Group Shopping Party "${session.title}".`,
          type: 'CO_SHOP_INVITE',
          link: `/?groupCode=${code}`,
          metadata: { groupCode: code, sessionTitle: session.title, hostName },
        });

        // Record invited member status if not already member
        try {
          const registeredUser = await prisma.user.findUnique({
            where: { email: cleanEmail.toLowerCase() },
            select: { id: true, name: true, email: true },
          });

          const existingMember = await prisma.groupSessionMember.findFirst({
            where: {
              sessionId: session.id,
              OR: [
                { guestEmail: cleanEmail },
                ...(registeredUser ? [{ userId: registeredUser.id }] : []),
              ],
            },
          });

          if (!existingMember) {
            await prisma.groupSessionMember.create({
              data: {
                sessionId: session.id,
                userId: registeredUser ? registeredUser.id : undefined,
                guestName: registeredUser ? registeredUser.name : cleanEmail.split('@')[0],
                guestEmail: cleanEmail,
                role: "MEMBER",
                status: "INVITED",
              },
            });
          }
        } catch (memberErr) {
          console.error("Error creating invited member record:", memberErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${sentResults.length} invitation email(s)!`,
      data: sentResults,
    });
  } catch (error: any) {
    console.error("Error sending group shopping invites:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to send invitations" },
      { status: 500 }
    );
  }
}
