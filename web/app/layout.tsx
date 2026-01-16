import './globals.css'
import { Metadata } from 'next'
import { ReactNode } from 'react'
import QueryProvider from './providers/QueryProvider'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'Court Booker - Find & Book Available Court Times',
  description: 'Automatically check court availability and book your favorite time slots. Real-time updates for basketball court reservations.',
  keywords: ['court booking', 'basketball', 'court reservation', 'availability checker'],
  authors: [{ name: 'Court Booker' }],
  icons: {
    icon: '/favicon.jpg',
    apple: '/favicon.jpg',
  },
  openGraph: {
    title: 'Court Booker - Find & Book Available Court Times',
    description: 'Automatically check court availability and book your favorite time slots. Real-time updates for basketball court reservations.',
    url: 'https://court-booker.vercel.app',
    siteName: 'Court Booker',
    images: [
      {
        url: '/og-image.jpg',
        width: 500,
        height: 500,
        alt: 'Court Booker - Basketball Court Reservations',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Court Booker - Find & Book Available Court Times',
    description: 'Automatically check court availability and book your favorite time slots.',
    images: ['/og-image.jpg'],
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  themeColor: '#3B82F6',
}

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <Toaster position="top-center" richColors />
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
