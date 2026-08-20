'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CalendarDays, CheckCircle2, Clock, FileText, Gavel, History, ShieldAlert } from 'lucide-react'
import { OSShell } from '@/components/os-shell'
import { ValuationSummary } from '@/components/valuation-summary'
import type { AuctionOpportunity } from '@/lib/domain'
import type { EditableDiligenceItem } from '@/lib/local-diligence'
import type { CommitteeMemo } from '@/lib/local-committee'
import type { LocalCalendarEvent } from '@/lib/local-calendar'
import type { PostAuctionRecord } from '@/lib/local-post-auction'
import { money, percent, statusLabel } from '@/lib/format'
import { getLocalOpportunity } from '@/lib/local-opportunities'
import { loadLocalDiligence, summarizeDiligence } from '@/lib/local-diligence'
import { loadCommitteeMemo } from '@/lib/local-committee'
import { loadCalendarEvents, summarizeCalendar } from '@/lib/local-calendar'
import { calculatePostAuctionSummary, loadPostAuctionRecord } from '@/lib/local-post-auction'

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function OpportunityDetailPage({ params }: { params: { dealId: string } }) {
  const [opportunity, setOpportunity] = useState<AuctionOpportunity | null>(null)
  const [diligence, setDiligence] = useState<EditableDiligenceItem[]>([])
  const [memo, setMemo] = useState<CommitteeMemo | null>(null)
  const [events, setEvents] = useState<LocalCalendarEvent[]>([])
  const [postAuction, setPostAuction] = useState<PostAuctionRecord | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const loadedOpportunity = getLocalOpportunity(params.dealId)
    setOpportunity(loadedOpportunity)
    setDiligence(loadLocalDiligence(params.dealId))
    setMemo(loadCommitteeMemo(params.dealId))
    setEvents(loadCalendarEvents(params.dealId, loadedOpportunity))
    setPostAuction(loadPostAuctionRecord(params.dealId, loadedOpportunity))
    setLoaded(true)
  }, [params.dealId])

  const postSummary = useMemo(() => opportunity && postAuction ? calculatePostAuctionSummary(opportunity, postAuction) : null, [opportunity, postAuction])

  if (!loaded) {
    return <OSShell title="Carregando" eyebrow={params.dealId}><section className="panel"><p className="panelCopy">Carregando oportunidade...</p></section></OSShell>
  }

  if (!opportunity) {
    return (
      <OSShell title="Oportunidade não encontrada" eyebrow={params.dealId}>
        <section className="sectionIntro">
          <span className="eyebrow">LOCAL-FIRST</span>
          <h2>Esta oportunidade não existe neste navegador</h2>
          <p>Como estamos sem Supabase por enquanto, os dados ficam salvos apenas no navegador em que foram criados.</p>
          <div className="modalActions"><Link className="primary" href="/opportunities/new">Criar oportunidade</Link><Link className="outline" href="/opportunities">Voltar ao pipeline</Link></div>
        </section>
      </OSShell>
    )
  }

  const diligenceSummary = summarizeDiligence(diligence)
  const calendarSummary = summarizeCalendar(events)

  return (
    <OSShell title={opportunity.title} eyebrow={opportunity.id}>
      <section className="detailHero">
        <div>
          <span className="pill green">{statusLabel[opportunity.status]}</span>
          <h2>{opportunity.decision}</h2>
          <p>{opportunity.address} · {opportunity.city}/{opportunity.state}</p>
        </div>
        <div className="decisionBox">
          <span>Limite absoluto</span>
          <strong>{money(opportunity.maxBidAbsolute)}</strong>
          <small>Não ultrapassar sem nova aprovação</small>
        </div>
      </section>

      <div className="detailGrid">
        <section className="panel">
          <div className="panelHead"><div><span className="eyebrow">DADOS DO ATIVO</span><h3>Ficha-mãe</h3></div><FileText size={18} /></div>
          <div className="facts">
            <div><span>Leiloeiro</span><strong>{opportunity.auctioneer}</strong></div>
            <div><span>Tipo</span><strong>{opportunity.assetType}</strong></div>
            <div><span>Matrícula</span><strong>{opportunity.registrationNumber ?? 'Não informada'}</strong></div>
            <div><span>Processo</span><strong>{opportunity.processNumber ?? 'Não informado'}</strong></div>
            <div><span>Ocupação</span><strong>{opportunity.occupancyStatus}</strong></div>
            <div><span>Pagamento</span><strong>{opportunity.paymentTerms}</strong></div>
          </div>
        </section>

        <section className="panel">
          <div className="panelHead"><div><span className="eyebrow">RISCO</span><h3>Tese e bloqueios</h3></div><ShieldAlert size={18} /></div>
          <div className="riskThesis">
            <div><span>Principal risco</span><p>{opportunity.mainRisk}</p></div>
            <div><span>Principal vantagem</span><p>{opportunity.mainUpside}</p></div>
          </div>
          <div className="blockers">
            {opportunity.blockers.length ? opportunity.blockers.map((blocker) => <div key={blocker}><AlertTriangle size={15} /> {blocker}</div>) : <div><AlertTriangle size={15} /> Nenhum bloqueio registrado.</div>}
          </div>
        </section>
      </div>

      <ValuationSummary opportunity={opportunity} />

      <section className="panel">
        <div className="panelHead withAction">
          <div><span className="eyebrow">PÓS-LEILÃO</span><h3>Resultado e aprendizado</h3></div>
          <Link className="outline" href="/post-auction">Registrar pós-leilão</Link>
        </div>
        {postAuction && postSummary ? (
          <div className="postMiniGrid">
            <div><span>Resultado</span><strong>{postAuction.outcome === 'won' ? 'Arrematado' : postAuction.outcome === 'lost' ? 'Perdido' : postAuction.outcome === 'not_participated' ? 'Não participou' : 'Pendente'}</strong></div>
            <div><span>Etapa</span><strong>{postAuction.stage}</strong></div>
            <div><span>Custo real total</span><strong>{money(postSummary.actualTotalCost)}</strong></div>
            <div><span>ROI real</span><strong>{percent(postSummary.actualRoiPct)}</strong></div>
          </div>
        ) : <div className="emptyState"><History size={15} /> Ainda não há registro de pós-leilão.</div>}
      </section>

      <section className="panel">
        <div className="panelHead withAction">
          <div><span className="eyebrow">CALENDÁRIO</span><h3>Próximos marcos · {calendarSummary.late} atrasados</h3></div>
          <Link className="outline" href="/calendar">Abrir calendário</Link>
        </div>
        <div className="calendarMiniList">
          {events.filter((event) => event.status !== 'done').slice(0, 3).map((event) => (
            <div key={event.id} className={`calendarMini ${event.status}`}>
              <Clock size={15} />
              <div><strong>{event.title}</strong><span>{formatDateTime(event.dueAt)}</span></div>
            </div>
          ))}
          {!events.length && <div className="emptyState">Sem marcos de calendário para esta oportunidade.</div>}
        </div>
      </section>

      <section className="panel">
        <div className="panelHead withAction">
          <div><span className="eyebrow">COMITÊ</span><h3>Investment Committee</h3></div>
          <Link className="outline" href="/committee">Editar decisão</Link>
        </div>
        {memo ? (
          <div className="committeeMemo">
            <div><span>Decisão</span><strong>{memo.decision}</strong></div>
            <div><span>Responsável</span><strong>{memo.approvedBy}</strong></div>
            <div><span>Tese</span><p>{memo.thesis || 'Não informada.'}</p></div>
            <div><span>Racional</span><p>{memo.rationale || 'Não informado.'}</p></div>
            {memo.hardBlockers.length > 0 && <div className="blockers committeeBlockers">{memo.hardBlockers.map((blocker) => <div key={blocker}><AlertTriangle size={15} /> {blocker}</div>)}</div>}
          </div>
        ) : <div className="emptyState"><Gavel size={15} /> Ainda não há decisão formal do comitê para esta oportunidade.</div>}
      </section>

      <section className="panel">
        <div className="panelHead withAction">
          <div><span className="eyebrow">DUE DILIGENCE</span><h3>Checklist de diligência · {diligenceSummary.completionPct}% concluído</h3></div>
          <Link className="outline" href="/diligence">Editar diligência</Link>
        </div>
        <div className="diligenceList">
          {diligence.length ? diligence.map((item) => (
            <div key={item.id} className={`diligenceItem ${item.status}`}>
              <CheckCircle2 size={16} />
              <div><strong>{item.category} · {item.item}</strong><span>{item.evidence}</span></div>
              <b>{item.risk}</b>
            </div>
          )) : <div className="emptyState">Ainda não há diligência para esta oportunidade. Próximo passo: checklist documental e jurídico.</div>}
        </div>
      </section>
    </OSShell>
  )
}
