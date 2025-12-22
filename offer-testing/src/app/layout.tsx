import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Offer Testing System',
  description: 'AI-powered system to test business offers through outbound outreach',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

