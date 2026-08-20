import { OSShell } from '@/components/os-shell'
import { opportunities } from '@/lib/demo-data'
import { money, percent } from '@/lib/format'
import { classifyBid } from '@/lib/valuation'

export default function PreBidPage() {
  const opportunity = opportunities[0]
  const status = classifyBid(opportunity.currentBid, opportunity)

  return (
    <OSShell title="Pré-lance" eyebrow={opportunity.id}>
      <section className="preBidScreen">
        <span className={`bidBadge ${status.status}`}>{status.label}</span>
        <h2>{opportunity.title}</h2>
        <p>{status.message}</p>
        <div className="preBidLimits">
          <div><span>Lance de conforto</span><strong>{money(opportunity.comfortBid)}</strong></div>
          <div><span>Lance recomendado</span><strong>{money(opportunity.maxBidRecommended)}</strong></div>
          <div className="dangerLimit"><span>Limite absoluto</span><strong>{money(opportunity.maxBidAbsolute)}</strong></div>
        </div>
        <div className="preBidCurrent">
          <span>Lance atual</span>
          <strong>{money(opportunity.currentBid)}</strong>
          <small>ROI base estimado: {percent(opportunity.baseRoiPct)} · Risco: {opportunity.risk} · Confiança: {opportunity.confidence}%</small>
        </div>
        <div className="noGo">NÃO ULTRAPASSAR {money(opportunity.maxBidAbsolute)}</div>
      </section>
    </OSShell>
  )
}
