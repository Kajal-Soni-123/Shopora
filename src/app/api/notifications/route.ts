export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getNotifications, markNotificationsAsRead } from '@/lib/notificationService';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    const { searchParams } = new URL(req.url);
    const emailParam = searchParams.get('email');

    const userId = user?.userId || null;
    const email = emailParam || user?.email || null;

    if (!userId && !email) {
      return NextResponse.json({ success: true, notifications: [], unreadCount: 0 });
    }

    const notifications = await getNotifications(userId, email);
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error: any) {
    console.error('Error in GET /api/notifications:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser();
    const body = await req.json().catch(() => ({}));
    const { notificationIds, markAll, email: emailParam } = body;

    const userId = user?.userId || null;
    const email = emailParam || user?.email || null;

    if (markAll) {
      await markNotificationsAsRead(undefined, userId, email);
    } else if (Array.isArray(notificationIds) && notificationIds.length > 0) {
      await markNotificationsAsRead(notificationIds, userId, email);
    } else {
      return NextResponse.json(
        { success: false, error: 'Provide notificationIds array or markAll: true' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notifications marked as read.',
    });
  } catch (error: any) {
    console.error('Error in PATCH /api/notifications:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to mark notifications read' },
      { status: 500 }
    );
  }
}
