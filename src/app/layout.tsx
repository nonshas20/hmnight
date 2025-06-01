import type { Metadata } from 'next'
import { Poppins, Montserrat } from 'next/font/google'
import '../styles/globals.css'
import { Toaster } from 'react-hot-toast'
import Navigation from '@/components/Navigation'
import { AuthProvider } from '@/contexts/AuthContext'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-montserrat',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'HM Night Event Ticket System',
  description: 'Registration and check-in system for HM Night events',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} ${montserrat.variable} font-sans`}>
        <AuthProvider>
          <Toaster position="top-center" />
          <Navigation />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
