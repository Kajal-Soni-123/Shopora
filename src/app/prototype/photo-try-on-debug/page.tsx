import dynamic from 'next/dynamic';

const PhotoTryOnDebug = dynamic(() => import('./PhotoTryOnDebug'), { ssr: false });

export const metadata = { title: 'Photo Try-On Debug - Shopora' };

export default function PhotoTryOnDebugPage() {
  return <PhotoTryOnDebug />;
}
