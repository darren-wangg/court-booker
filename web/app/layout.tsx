import './globals.css'
import { Metadata } from 'next'
import { ReactNode } from 'react'
import QueryProvider from './providers/QueryProvider'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'Court Booker',
  description: 'Check and book court reservations',
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
