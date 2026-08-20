import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { AuctionOpportunity } from '@/lib/domain'
import { money, percent, statusLabel } from '@/lib/format'

export function DealCard({ opportunity }: { opportunity: AuctionOpportunity }) {
  const riskClass = opportunity.risk.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  return (
    <article className="deal">
      <div className="dealTop">
        <span className="dealType">{opportunity.assetType} · {statusLabel[opportunity.status]}</span>
        <span className={`risk ${riskClass}`}>{opportunity.risk}</span>
      </div>
      <h4>{opportunity.title}</h4>
      <small className="muted">{opportunity.id} · {opportunity.city}/{opportunity.state}</small>
      <div className="dealGrid">
        <div><span>Mercado base</span><b>{money(opportunity.marketBase)}</b></div>
        <div><span>Lance atual</span><b>{money(opportunity.currentBid)}</b></div>
        <div><span>Limite máximo</span><b>{money(opportunity.maxBidAbsolute)}</b></div>
        <div><span>ROI base</span><b>{percent(opportunity.baseRoiPct)}</b></div>
      </div>
      <div className="dealFooter">
        <div>
          <div className="progress"><i style={{ width: `${opportunity.score}%` }} /></div>
          <span>Score {opportunity.score}/100 · Confiança {opportunity.confidence}%</span>
        </div>
        <Link className="outline" href={`/opportunities/${opportunity.id}`}>Analisar <ChevronRight size={14} /></Link>
      </div>
    </article>
  )
}
