import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

// GET: Fetch messages & product suggestions for a group shopping session
export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const { searchParams } = new URL(req.url);
    const since = searchParams.get('since');

    const session = await prisma.groupShoppingSession.findUnique({
      where: { code },
      select: { id: true },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    const whereClause: any = { sessionId: session.id };
    if (since) {
      whereClause.createdAt = { gt: new Date(since) };
    }

    const messages = await prisma.groupChatMessage.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            guestName: true,
            guestEmail: true,
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            image: true,
            stock: true,
            rating: true,
            vendorId: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: messages,
    });
  } catch (error: any) {
    console.error('Error fetching group messages:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST: Post a new message, product suggestion, or system event
export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const user = await getSessionUser();
    const body = await req.json();
    const { senderId, type = 'TEXT', content, productId } = body;

    const session = await prisma.groupShoppingSession.findUnique({
      where: { code },
      include: { members: true },
    });

    if (!session || session.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Active group session not found' },
        { status: 404 }
      );
    }

    // Determine sender member
    let senderMember = senderId
      ? session.members.find((m) => m.id === senderId)
      : user?.userId
      ? session.members.find((m) => m.userId === user.userId)
      : session.members[0];

    if (!senderMember) {
      return NextResponse.json(
        { success: false, error: 'You must join the session to send messages.' },
        { status: 403 }
      );
    }

    if (type === 'PRODUCT_SUGGESTION' && !productId) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required for product suggestions.' },
        { status: 400 }
      );
    }

    if (type === 'TEXT' && (!content || !content.trim())) {
      return NextResponse.json(
        { success: false, error: 'Message content cannot be empty.' },
        { status: 400 }
      );
    }

    const message = await prisma.groupChatMessage.create({
      data: {
        sessionId: session.id,
        senderId: senderMember.id,
        type,
        content: content?.trim() || null,
        productId: productId || null,
        reactions: {},
        votes: {},
      },
      include: {
        sender: {
          select: {
            id: true,
            guestName: true,
            guestEmail: true,
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            image: true,
            stock: true,
            rating: true,
            vendorId: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: message,
      message: type === 'PRODUCT_SUGGESTION' ? 'Product suggested to group!' : 'Message sent!',
    });
  } catch (error: any) {
    console.error('Error creating group message:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}
