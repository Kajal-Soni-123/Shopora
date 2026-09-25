import { NextRequest } from 'next/server';
import { ApiResponse } from '@/lib/api-response';
import { getDeliveryProvider } from '@/lib/shipping/ProviderFactory';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deliveryPincode = searchParams.get('pincode') || searchParams.get('deliveryPincode');
    const pickupPincode = searchParams.get('pickupPincode') || '110001';
    const weight = parseFloat(searchParams.get('weight') || '0.5');
    const codParam = searchParams.get('cod');
    const cod = codParam === 'true' || codParam === '1';

    if (!deliveryPincode) {
      return ApiResponse.badRequest('Delivery pincode parameter (pincode) is required');
    }

    const provider = getDeliveryProvider();
    const result = await provider.checkServiceability({
      deliveryPincode,
      pickupPincode,
      weight,
      cod,
    });

    return ApiResponse.success(result, 'Serviceability checked successfully');
  } catch (err: any) {
    console.error('Error in serviceability API:', err);
    return ApiResponse.serverError('Failed to check shipping serviceability', err.message);
  }
}
