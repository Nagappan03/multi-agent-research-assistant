import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'Research Assistant — Multi-Agent AI',
  description: 'AI-powered research assistant using LangGraph multi-agent orchestration',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}