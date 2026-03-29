import type { Metadata } from 'next'
import { Inter, Playfair_Display, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { UserProvider } from '@/components/user-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
})

const playfair = Playfair_Display({ 
  subsets: ["latin"],
  variable: '--font-playfair',
})

const jetbrains = JetBrains_Mono({ 
  subsets: ["latin"],
  variable: '--font-jetbrains',
})

export const metadata: Metadata = {
  title: 'HireWire - Know Before You Apply',
  description: 'A premium job application engine that scores opportunities, generates tailored materials, and tracks your pipeline.',
  generator: 'v0.app',
  icons: {
    icon: '/hirewire-icon.png',
    apple: '/hirewire-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${playfair.variable} ${jetbrains.variable}`}>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <UserProvider>
            {children}
          </UserProvider>
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
