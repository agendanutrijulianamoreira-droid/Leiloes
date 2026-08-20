import { notFound } from 'next/navigation'
import { AlertTriangle, CalendarDays, CheckCircle2, FileText, ShieldAlert } from 'lucide-react'
import { OSShell } from '@/components/os-shell'
import { ValuationSummary } from '@/components/valuation-summary'
import { dueDiligenceItems } from '@/lib/demo-data'
import { money, statusLabel } from '@/lib/format'
import { getOpportunity } from '@/lib/opportunity-repository'

export default async function OpportunityDetailPage({ params }: { params: { dealId: string } }) {
  const opportunity = await getOpportunity(params.dealId)
  if (!opportunity) notFound()

  const diligence = dueDiligenceItems[opportunity.id] ?? []

  return (
    <OSShell title={opportunity.title} eyebrow={opportunity.id}>
      <section className="detailHero">
        <div>
          <span className="pill green">{statusLabel[opportunity.status]}</span>
          <h2>{opportunity.decision}</h2>
          <p>{opportunity.address || 'Endereço não informado'} · {opportunity.city || 'Cidade não informada'}/{opportunity.state || '--'}</p>
        </div>
        <div className="decisionBox">
          <span>Limite absoluto</span>
          <strong>{opportunity.maxBidAbsolute ? money(opportunity.maxBidAbsolute) : 'Pendente'}</strong>
          <small>Não ultrapassar sem nova aprovação</small>
        </div>
      </section>

      <div className="detailGrid">
        <section className="panel">
          <div className="panelHead"><div><span className="eyebrow">DADOS DO ATIVO</span><h3>Ficha-mãe</h3></div><FileText size={18} /></div>
          <div className="facts">
            <div><span>Leiloeiro</span><strong>{opportunity.auctioneer || 'Não informado'}</strong></div>
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
            {opportunity.blockers.length ? opportunity.blockers.map((blocker) => <div key={blocker}><AlertTriangle size={15} /> {blocker}</div>) : <p className="emptyState compact">Nenhum bloqueio crítico registrado. Isso não significa liberação para lance.</p>}
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
          )) : <p className="emptyState">Checklist ainda não iniciado. A oportunidade deve permanecer em monitoramento até análise documental.</p>}
        </div>
      </section>
    </OSShell>
  )
}
