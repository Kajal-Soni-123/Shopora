import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { GroupShoppingProvider } from '@/context/GroupShoppingContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { LoginRequiredModal } from '@/components/auth/LoginRequiredModal';
import { GroupChatDrawer } from '@/components/GroupChatDrawer';
import { WishlistDrawer } from '@/components/WishlistDrawer';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Shopora | Modern Multi-Vendor Marketplace',
  description: 'Full-stack Shopora e-commerce platform with Next.js App Router, Tailwind CSS, PostgreSQL, and multi-vendor sub-order fulfillment.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`light ${inter.variable}`}>
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased selection:bg-indigo-500 selection:text-white`}>
        <AuthProvider>
          <WishlistProvider>
            <GroupShoppingProvider>
              {children}
              <GroupChatDrawer />
              <WishlistDrawer />
              <AuthModal />
              <LoginRequiredModal />
            </GroupShoppingProvider>
          </WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
