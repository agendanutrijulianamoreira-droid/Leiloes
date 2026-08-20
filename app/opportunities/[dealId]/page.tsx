'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CalendarDays, CheckCircle2, FileText, ShieldAlert } from 'lucide-react'
import { OSShell } from '@/components/os-shell'
import { ValuationSummary } from '@/components/valuation-summary'
import type { AuctionOpportunity } from '@/lib/domain'
import { dueDiligenceItems } from '@/lib/demo-data'
import { money, statusLabel } from '@/lib/format'
import { getLocalOpportunity } from '@/lib/local-opportunities'

export default function OpportunityDetailPage({ params }: { params: { dealId: string } }) {
  const [opportunity, setOpportunity] = useState<AuctionOpportunity | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setOpportunity(getLocalOpportunity(params.dealId))
    setLoaded(true)
  }, [params.dealId])

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

  const diligence = dueDiligenceItems[opportunity.id] ?? []

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
        <div className="panelHead"><div><span className="eyebrow">DUE DILIGENCE</span><h3>Checklist de diligência</h3></div><CalendarDays size={18} /></div>
        <div className="diligenceList">
          {diligence.length ? diligence.map((item) => (
            <div key={`${item.category}-${item.item}`} className={`diligenceItem ${item.status}`}>
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
