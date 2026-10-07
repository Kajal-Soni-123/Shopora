import { prisma } from '@/lib/prisma';

export interface PendingGroupInvite {
  code: string;
  title: string;
  hostName: string;
  invitedAt: string;
}

/** Invitations this user hasn't accepted or declined yet (only for parties still open). */
export async function findPendingInvites(user: { userId: string; email: string }): Promise<PendingGroupInvite[]> {
  const rows = await prisma.groupSessionMember.findMany({
    where: {
      status: 'INVITED',
      OR: [{ userId: user.userId }, { guestEmail: { equals: user.email, mode: 'insensitive' } }],
      session: { status: 'ACTIVE', expiresAt: { gt: new Date() } },
    },
    include: {
      session: { select: { code: true, title: true, hostUser: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    code: r.session.code,
    title: r.session.title,
    hostName: r.session.hostUser?.name || 'A friend',
    invitedAt: r.createdAt.toISOString(),
  }));
}
