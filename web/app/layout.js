import './globals.css'

export const metadata = {
  title: 'Court Booker - Availability Dashboard',
  description: 'Check and book court reservations',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
