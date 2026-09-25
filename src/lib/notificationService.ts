import { prisma } from '@/lib/prisma';

export interface CreateNotificationParams {
  userId?: string | null;
  email?: string | null;
  title: string;
  message: string;
  type: 'CO_SHOP_INVITE' | 'CATEGORY_REQUEST' | 'PRODUCT_BACK_IN_STOCK' | 'ORDER_UPDATE' | 'SYSTEM' | string;
  link?: string | null;
  metadata?: any;
}

/**
 * Creates an in-app notification for a user or recipient email
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    let resolvedUserId = params.userId || null;
    let resolvedEmail = params.email ? params.email.trim().toLowerCase() : null;

    // If no userId provided but email is given, try finding user by email
    if (!resolvedUserId && resolvedEmail) {
      const user = await prisma.user.findUnique({
        where: { email: resolvedEmail },
        select: { id: true },
      });
      if (user) {
        resolvedUserId = user.id;
      }
    }

    const notification = await (prisma as any).notification.create({
      data: {
        userId: resolvedUserId,
        email: resolvedEmail,
        title: params.title,
        message: params.message,
        type: params.type,
        link: params.link || null,
        metadata: params.metadata || null,
      },
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

/**
 * Retrieves notifications for a given userId or recipient email
 */
export async function getNotifications(userId?: string | null, email?: string | null) {
  try {
    const OR_CONDITIONS: any[] = [];
    if (userId) OR_CONDITIONS.push({ userId });
    if (email) OR_CONDITIONS.push({ email: email.toLowerCase() });

    if (OR_CONDITIONS.length === 0) {
      return [];
    }

    const notifications = await (prisma as any).notification.findMany({
      where: {
        OR: OR_CONDITIONS,
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    return notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

/**
 * Marks specified notification IDs or all notifications as read
 */
export async function markNotificationsAsRead(
  notificationIds?: string[],
  userId?: string | null,
  email?: string | null
) {
  try {
    if (notificationIds && notificationIds.length > 0) {
      await (prisma as any).notification.updateMany({
        where: { id: { in: notificationIds } },
        data: { isRead: true },
      });
      return true;
    }

    const OR_CONDITIONS: any[] = [];
    if (userId) OR_CONDITIONS.push({ userId });
    if (email) OR_CONDITIONS.push({ email: email.toLowerCase() });

    if (OR_CONDITIONS.length > 0) {
      await (prisma as any).notification.updateMany({
        where: { OR: OR_CONDITIONS, isRead: false },
        data: { isRead: true },
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error marking notifications read:', error);
    return false;
  }
}

/**
 * Checks for users who have a product in their cart (or group cart) and triggers a back-in-stock notification when stock increases from 0 to > 0.
 */
export async function triggerBackInStockNotifications(productId: string, productTitle: string) {
  try {
    // 1. Find cart items containing this product
    const cartItems = await prisma.cartItem.findMany({
      where: { productId },
      include: { user: { select: { id: true, email: true } } },
    });

    // 2. Find group cart items containing this product
    const groupCartItems = await prisma.groupCartItem.findMany({
      where: { productId },
      include: {
        addedBy: {
          select: {
            userId: true,
            guestEmail: true,
            user: { select: { email: true } },
          },
        },
      },
    });

    const targetMap = new Map<string, { userId?: string; email?: string }>();

    for (const item of cartItems) {
      if (item.userId) {
        targetMap.set(item.userId, { userId: item.userId, email: item.user.email });
      }
    }

    for (const gItem of groupCartItems) {
      const uId = gItem.addedBy.userId;
      const em = gItem.addedBy.guestEmail || gItem.addedBy.user?.email;
      const key = uId || em;
      if (key && !targetMap.has(key)) {
        targetMap.set(key, { userId: uId || undefined, email: em || undefined });
      }
    }

    // Send notification to each interested user
    for (const target of Array.from(targetMap.values())) {
      await createNotification({
        userId: target.userId,
        email: target.email,
        title: 'Product Back in Stock! 🎉',
        message: `'${productTitle}' which is in your cart is back in stock! Order now before it runs out.`,
        type: 'PRODUCT_BACK_IN_STOCK',
        link: `/?query=${encodeURIComponent(productTitle)}`,
        metadata: { productId },
      });
    }
  } catch (error) {
    console.error('Error sending back-in-stock notifications:', error);
  }
}
