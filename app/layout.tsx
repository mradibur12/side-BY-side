import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Side by Side',
  description: 'A shared home organiser for two',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              fontSize: '0.875rem',
              background: '#1E1E26',
              color: '#F0EEF8',
              borderRadius: '12px',
              border: '1px solid #2E2E3A',
              padding: '11px 16px',
            },
            success: { iconTheme: { primary: '#5DBB6B', secondary: '#0F2014' } },
            error:   { iconTheme: { primary: '#E05050', secondary: '#280F0F' } },
          }}
        />
      </body>
    </html>
  )
}
