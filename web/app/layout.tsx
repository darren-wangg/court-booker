import './globals.css'
import { Metadata } from 'next'
import { ReactNode } from 'react'
import QueryProvider from './providers/QueryProvider'

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
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
