import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Navbar } from '@/components/navbar'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })

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
      <body className={`${inter.variable} ${mono.variable} font-sans min-h-screen bg-background text-foreground`}>
        <Navbar />
        {children}
      </body>
    </html>
  )
}
