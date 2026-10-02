export const dynamic = 'force-dynamic';
import { getSessionUser } from '@/lib/auth';
import { ApiResponse } from '@/lib/api-response';
import { saveTryOnModel } from '@/lib/try-on/modelStorage';
import { isGlbHeader, MAX_TRY_ON_MODEL_BYTES } from '@/lib/try-on/tryOnModel';

// POST /api/try-on/models - Upload a product's .glb model for Try On Yourself (vendors only)
export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== 'VENDOR' || !sessionUser.vendorId) {
      return ApiResponse.unauthorized('Access denied. Merchant Partner authentication required.');
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return ApiResponse.badRequest('Attach the .glb file in the "file" field.');
    }
    if (!file.name.toLowerCase().endsWith('.glb')) {
      return ApiResponse.badRequest('Only .glb (binary glTF) files are supported.');
    }
    if (file.size > MAX_TRY_ON_MODEL_BYTES) {
      return ApiResponse.badRequest(`The 3D model must be ${MAX_TRY_ON_MODEL_BYTES / (1024 * 1024)} MB or smaller.`);
    }

    const data = Buffer.from(await file.arrayBuffer());
    if (!isGlbHeader(data, data.length)) {
      return ApiResponse.badRequest('This file is not a valid glTF 2.0 binary (.glb) model.');
    }

    const url = await saveTryOnModel(data);
    return ApiResponse.created({ url, size: data.length }, '3D model uploaded.');
  } catch (error) {
    console.error('Try-on model upload error:', error);
    return ApiResponse.serverError('Failed to upload the 3D model.');
  }
}
