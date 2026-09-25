import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;
    const currentUser = await getSessionUser();
    
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q')?.trim() || '';

    // Verify session exists
    const session = await prisma.groupShoppingSession.findUnique({
      where: { code },
      include: {
        members: {
          select: {
            userId: true,
            guestEmail: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Group shopping session not found' },
        { status: 404 }
      );
    }

    // Collect all existing user IDs and emails in the session (members + invitees + host)
    const existingUserIds = new Set<string>();
    const existingEmails = new Set<string>();

    if (session.hostUserId) {
      existingUserIds.add(session.hostUserId);
    }

    if (currentUser?.userId) {
      existingUserIds.add(currentUser.userId);
    }
    if (currentUser?.email) {
      existingEmails.add(currentUser.email.toLowerCase());
    }

    session.members.forEach((m) => {
      if (m.userId) existingUserIds.add(m.userId);
      if (m.guestEmail) existingEmails.add(m.guestEmail.toLowerCase());
    });

    // Determine current user / host reference location address
    let refUserAddress = '';
    const refUserId = currentUser?.userId || session.hostUserId;
    
    if (refUserId) {
      const refUser = await prisma.user.findUnique({
        where: { id: refUserId },
        select: {
          homeAddress: true,
          workAddress: true,
          primaryAddressType: true,
          orders: {
            select: { shippingAddress: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (refUser) {
        refUserAddress =
          (refUser.primaryAddressType === 'WORK' ? refUser.workAddress : refUser.homeAddress) ||
          refUser.homeAddress ||
          refUser.workAddress ||
          refUser.orders[0]?.shippingAddress ||
          '';
      }
    }

    // Clean and tokenize reference address keywords (filter out short stop words)
    const stopWords = new Set(['street', 'road', 'apt', 'suite', 'floor', 'flat', 'near', 'opposite', 'behind', 'and', 'the', 'india']);
    const refTokens = refUserAddress
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 2 && !stopWords.has(token));

    // Build filter criteria for User lookup
    const whereCondition: any = {
      role: 'CUSTOMER', // Suggest regular customer accounts
      id: { notIn: Array.from(existingUserIds) },
    };

    if (query) {
      whereCondition.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { homeAddress: { contains: query, mode: 'insensitive' } },
        { workAddress: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Fetch candidate registered users with their address info
    const candidateUsers = await prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        homeAddress: true,
        workAddress: true,
        primaryAddressType: true,
        orders: {
          select: { shippingAddress: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      take: 30, // Fetch top candidates to calculate proximity scores
    });

    // Process proximity score for each user
    const suggestionsWithProximity = candidateUsers
      .filter((u) => !existingEmails.has(u.email.toLowerCase()))
      .map((user) => {
        const userAddr =
          (user.primaryAddressType === 'WORK' ? user.workAddress : user.homeAddress) ||
          user.homeAddress ||
          user.workAddress ||
          user.orders[0]?.shippingAddress ||
          '';

        const candTokens = userAddr
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter((token) => token.length > 2 && !stopWords.has(token));

        // Count overlapping address tokens between host/currentUser and candidate
        const matchingTokens = candTokens.filter((token) => refTokens.includes(token));
        const matchCount = matchingTokens.length;

        let proximityScore = 0;
        let isNearby = false;
        let locationLabel: string | null = null;

        if (matchCount > 0 && refTokens.length > 0) {
          isNearby = true;
          proximityScore = 50 + matchCount * 25;
          
          // Capitalize match label for display
          const displayMatch = matchingTokens[0].charAt(0).toUpperCase() + matchingTokens[0].slice(1);
          locationLabel = `📍 Nearby (${displayMatch})`;
        } else if (userAddr.trim()) {
          // Extract general city/locality if available
          const parts = userAddr.split(',').map((p) => p.trim()).filter(Boolean);
          const cityOrLocality = parts.length > 1 ? parts[parts.length - 2] || parts[0] : parts[0];
          locationLabel = `📍 ${cityOrLocality.slice(0, 20)}`;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          locationLabel,
          isNearby,
          proximityScore,
        };
      });

    // Sort by proximity score descending (Nearby friends first!), then by name
    suggestionsWithProximity.sort((a, b) => {
      if (b.proximityScore !== a.proximityScore) {
        return b.proximityScore - a.proximityScore;
      }
      return a.name.localeCompare(b.name);
    });

    // Return top 15 prioritized user suggestions
    return NextResponse.json({
      success: true,
      suggestions: suggestionsWithProximity.slice(0, 15),
    });
  } catch (error: any) {
    console.error('Error fetching suggested users for group invite:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch user suggestions' },
      { status: 500 }
    );
  }
}
