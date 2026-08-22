'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, ChevronRight, Database, ShieldAlert } from 'lucide-react'
import { DealCard } from '@/components/deal-card'
import { MetricCard } from '@/components/metric-card'
import type { AuctionOpportunity, AuctionStatus } from '@/lib/domain'
import type { LocalCalendarEvent } from '@/lib/local-calendar'
import { money, percent, statusLabel } from '@/lib/format'
import { loadLocalOpportunities } from '@/lib/local-opportunities'
import { buildPortfolioSnapshot } from '@/lib/local-portfolio'
import { loadRadarLeads, summarizeRadar } from '@/lib/local-radar'
import { loadCalendarEvents } from '@/lib/local-calendar'

const importantStatuses: AuctionStatus[] = ['pre_bid', 'committee', 'valuation', 'due_diligence', 'new']
const activePostAuctionStatuses: AuctionStatus[] = ['won', 'regularization', 'renovation', 'sale', 'rental']

function formatEventDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'SEM DATA'
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()
}

function priorityScore(opportunity: AuctionOpportunity) {
  const statusWeight = importantStatuses.indexOf(opportunity.status)
  const normalizedStatusWeight = statusWeight >= 0 ? (importantStatuses.length - statusWeight) * 10 : 0
  return normalizedStatusWeight + opportunity.score + opportunity.confidence - (opportunity.risk === 'Crítico' ? 60 : opportunity.risk === 'Alto' ? 25 : 0)
}

export function OverviewDashboard() {
  const [opportunities, setOpportunities] = useState<AuctionOpportunity[]>([])
  const [events, setEvents] = useState<LocalCalendarEvent[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const loadedOpportunities = loadLocalOpportunities()
    const loadedEvents = loadedOpportunities.flatMap((opportunity) => loadCalendarEvents(opportunity.id, opportunity))
    setOpportunities(loadedOpportunities)
    setEvents(loadedEvents)
    setLoaded(true)
  }, [])

  const snapshot = useMemo(() => loaded ? buildPortfolioSnapshot() : null, [loaded])
  const radarSummary = useMemo(() => loaded ? summarizeRadar(loadRadarLeads()) : summarizeRadar([]), [loaded])
  const activeOpportunities = opportunities.filter((item) => !['lost', 'closed', 'rejected'].includes(item.status))
  const priorityOpportunities = [...activeOpportunities].sort((a, b) => priorityScore(b) - priorityScore(a)).slice(0, 3)
  const pendingEvents = events
    .filter((event) => event.status !== 'done')
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, 4)

  const pipeline = [
    { label: 'Radar', count: radarSummary.total, href: '/radar' },
    { label: 'Diligência', count: opportunities.filter((item) => item.status === 'due_diligence').length, href: '/diligence' },
    { label: 'Valuation', count: opportunities.filter((item) => item.status === 'valuation').length, href: '/valuation' },
    { label: 'Pré-lance', count: opportunities.filter((item) => item.status === 'pre_bid').length, href: '/pre-lance' },
    { label: 'Pós-leilão', count: opportunities.filter((item) => activePostAuctionStatuses.includes(item.status)).length, href: '/post-auction' },
  ]

  if (!loaded || !snapshot) {
    return <section className="panel"><p className="panelCopy">Carregando visão geral local...</p></section>
  }

  return (
    <>
      <div className="hero">
        <div>
          <span className="pill green">● MVP local-first</span>
          <h2>Decisões melhores.<br /><em>Patrimônio maior.</em></h2>
          <p>Centro de comando para encontrar, analisar e executar oportunidades em leilões com disciplina de risco, valuation e aprovação humana obrigatória.</p>
        </div>
        <div className="heroMetric">
          <span>ROI médio monitorado</span>
          <strong>{percent(snapshot.averageRoiPct)}</strong>
          <small>{activeOpportunities.length} oportunidades ativas</small>
        </div>
      </div>

      <div className="metrics">
        <MetricCard label="Patrimônio projetado" value={money(snapshot.projectedNetWorth)} note="Inicial + resultado estimado" />
        <MetricCard label="Capital disponível" value={money(snapshot.availableToDeploy)} note="Após reserva e compromissos" />
        <MetricCard label="Capital em risco" value={money(snapshot.capitalAtRisk)} note="Operações ativas" />
        <MetricCard label="Itens no radar" value={String(radarSummary.total)} note={`${radarSummary.highPriority} em alta prioridade`} />
      </div>

      {snapshot.concentrationWarning && (
        <div className="formAlert error overviewAlert"><ShieldAlert size={15} /> <span>{snapshot.concentrationWarning}</span></div>
      )}

      <section className="sectionHead">
        <div><span className="eyebrow">DEAL FLOW</span><h3>Oportunidades prioritárias</h3></div>
        <Link className="textButton" href="/opportunities">Ver todas <ChevronRight size={15} /></Link>
      </section>
      <div className="cards">
        {priorityOpportunities.length ? priorityOpportunities.map((opportunity) => <DealCard key={opportunity.id} opportunity={opportunity} />) : (
          <div className="emptyState"><Database size={15} /> Nenhuma oportunidade ativa. Comece pelo Radar ou cadastre uma oportunidade manual.</div>
        )}
      </div>

      <div className="lower">
        <section className="panel">
          <div className="panelHead"><div><span className="eyebrow">PIPELINE</span><h3>Fluxo operacional</h3></div></div>
          <div className="pipeline">
            {pipeline.map((stage) => <Link key={stage.label} href={stage.href}><strong>{stage.count}</strong><span>{stage.label}</span></Link>)}
          </div>
        </section>
        <section className="panel">
          <div className="panelHead"><div><span className="eyebrow">AGENDA</span><h3>Próximos marcos</h3></div><CalendarDays size={18} /></div>
          <div className="events">
            {pendingEvents.length ? pendingEvents.map((event) => (
              <div key={event.id}><b>{formatEventDate(event.dueAt)}</b><span><strong>{event.title}</strong>{event.dealId} · {event.kind}</span></div>
            )) : <div className="emptyState">Nenhum marco pendente no calendário local.</div>}
          </div>
        </section>
      </div>

      <section className="panel overviewStatus">
        <div className="panelHead"><div><span className="eyebrow">STATUS DO OS</span><h3>Leitura automática</h3></div></div>
        <div className="facts">
          <div><span>Operações ativas</span><strong>{activeOpportunities.length}</strong></div>
          <div><span>Arrematadas</span><strong>{snapshot.wonDeals}</strong></div>
          <div><span>Encerradas</span><strong>{snapshot.closedDeals}</strong></div>
          <div><span>Próximo status dominante</span><strong>{activeOpportunities[0] ? statusLabel[activeOpportunities[0].status] : 'Sem operação ativa'}</strong></div>
        </div>
      </section>
    </>
  )
}
