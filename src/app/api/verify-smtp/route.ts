export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { verifySmtpConnection } from '@/lib/emailService';

export async function GET() {
  try {
    const result = await verifySmtpConnection();
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        ...result,
      },
      { status: result.success ? 200 : 500 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || String(error),
      },
      { status: 500 }
    );
  }
}
