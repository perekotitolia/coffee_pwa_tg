import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Coffee PWA',
  description: 'Bonus system demo for coffee shop',
  manifest: '/manifest.webmanifest',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body>
        <div className="container">
          {children}
        </div>
      </body>
    </html>
  )
}