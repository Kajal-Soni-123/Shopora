export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { findPendingInvites } from '@/lib/groupInvites';

// GET /api/group-shopping/invites — group party invitations waiting for the logged-in user's answer
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user?.userId || !user.email) return NextResponse.json({ success: true, data: [] });
    return NextResponse.json({ success: true, data: await findPendingInvites(user) });
  } catch (error: any) {
    console.error('Error fetching group invites:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch invitations' }, { status: 500 });
  }
}
