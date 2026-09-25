export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ApiResponse } from '@/lib/api-response';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(ApiResponse.unauthorized('Authentication required'), { status: 401 });
    }

    let whereClause: any = {};

    if (sessionUser.role === 'VENDOR') {
      if (!sessionUser.vendorId) {
        return NextResponse.json(ApiResponse.forbidden('Vendor profile required'), { status: 403 });
      }
      whereClause.vendorId = sessionUser.vendorId;
    } else if (sessionUser.role === 'CUSTOMER') {
      whereClause.userId = sessionUser.userId;
    }

    const returns = await prisma.returnRequest.findMany({
      where: whereClause,
      include: {
        vendor: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
        order: true,
        subOrder: true,
        returnItems: {
          include: {
            orderItem: {
              include: { product: true },
            },
          },
        },
        refunds: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(ApiResponse.success(returns));
  } catch (err: any) {
    console.error('Fetch returns error:', err);
    return NextResponse.json(ApiResponse.error(err.message || 'Internal Server Error'), { status: 500 });
  }
}
