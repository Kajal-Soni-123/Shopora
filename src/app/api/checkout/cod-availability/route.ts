import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { checkCodAvailability } from '@/lib/shipping/codService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pincode = searchParams.get('pincode') || '';
    const orderAmountStr = searchParams.get('orderAmount') || '0';
    const orderAmount = parseFloat(orderAmountStr) || 0;
    const vendorIdsParam = searchParams.get('vendorIds');
    const vendorIds = vendorIdsParam ? vendorIdsParam.split(',') : undefined;

    const result = await checkCodAvailability({
      pincode,
      orderAmount,
      vendorIds,
    });

    return NextResponse.json(ApiResponse.success(result, 'COD availability checked successfully'));
  } catch (err: any) {
    console.error('Error checking COD availability API:', err);
    return NextResponse.json(ApiResponse.error(err.message || 'Internal Server Error'), { status: 500 });
  }
}
