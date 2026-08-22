'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Archive, Bell, CalendarDays, CircleDollarSign, FileSearch, Gavel, History, LayoutDashboard, Plus, Radar, ShieldAlert, Target, UserRound, Wallet } from 'lucide-react'

const nav = [
  { label: 'Visão geral', href: '/', icon: LayoutDashboard },
  { label: 'Radar', href: '/radar', icon: Radar },
  { label: 'Oportunidades', href: '/opportunities', icon: Target },
  { label: 'Diligência', href: '/diligence', icon: FileSearch },
  { label: 'Valuation', href: '/valuation', icon: CircleDollarSign },
  { label: 'Comitê', href: '/committee', icon: Gavel },
  { label: 'Pré-lance', href: '/pre-lance', icon: ShieldAlert },
  { label: 'Pós-leilão', href: '/post-auction', icon: History },
  { label: 'Calendário', href: '/calendar', icon: CalendarDays },
  { label: 'Patrimônio', href: '/portfolio', icon: Wallet },
  { label: 'Backup', href: '/backup', icon: Archive },
  { label: 'Conta', href: '/account', icon: UserRound },
]

export function OSShell({ title, eyebrow, children, action }: { title: string; eyebrow?: string; children: React.ReactNode; action?: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <main className="shell">
      <aside className="sidebar">
        <Link className="brand" href="/">
          <div className="brandMark">L</div>
          <div>
            <strong>LEILÕES OS</strong>
            <span>Investment Operating System</span>
          </div>
        </Link>
        <nav>
          {nav.map(({ label, href, icon: Icon }) => {
            const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link key={href} className={active ? 'nav active' : 'nav'} href={href}>
                <Icon size={17} />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="sidebarBottom"><div className="statusDot" /> Sistema operacional <span>v0.8</span></div>
      </aside>
      <section className="content">
        <header className="topbar">
          <div>
            <div className="eyebrow">{eyebrow ?? 'LEILÕES OS'}</div>
            <h1>{title}</h1>
          </div>
          <div className="topActions">
            <button className="iconButton" aria-label="Alertas"><Bell size={18} /></button>
            {action ?? <Link className="primary" href="/opportunities/new"><Plus size={17} /> Nova oportunidade</Link>}
          </div>
        </header>
        {children}
      </section>
    </main>
  )
}
