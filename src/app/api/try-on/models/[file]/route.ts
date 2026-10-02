export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { readTryOnModel } from '@/lib/try-on/modelStorage';

interface RouteParams {
  params: Promise<{ file: string }>;
}

// GET /api/try-on/models/[file] - Serve an uploaded .glb model
export async function GET(_request: Request, { params }: RouteParams) {
  const { file } = await params;
  const data = await readTryOnModel(file);
  if (!data) {
    return NextResponse.json({ success: false, error: '3D model not found.' }, { status: 404 });
  }
  // Names are random and never reused, so the file can be cached forever.
  return new NextResponse(new Uint8Array(data), {
    headers: {
      'Content-Type': 'model/gltf-binary',
      'Content-Length': String(data.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
