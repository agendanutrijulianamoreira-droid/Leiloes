import type { Metadata } from 'next'
import './globals.css'
import './components.css'

export const metadata: Metadata = { title: 'Leilões OS', description: 'Investment Operating System para leilões e crescimento patrimonial.' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>
}
