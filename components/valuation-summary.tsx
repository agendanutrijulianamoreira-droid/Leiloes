import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react'
import { money, percent } from '@/lib/format'
import { buildScenarioSet, classifyBid } from '@/lib/valuation'
import type { AuctionOpportunity } from '@/lib/domain'

export function ValuationSummary({ opportunity }: { opportunity: AuctionOpportunity }) {
  const bidStatus = classifyBid(opportunity.currentBid, opportunity)
  const scenarios = buildScenarioSet({
    bid: opportunity.currentBid,
    conservativeValue: opportunity.marketConservative,
    baseValue: opportunity.marketBase,
    optimisticValue: opportunity.marketOptimistic,
    baseAdditionalCosts: Math.max(0, opportunity.marketBase * 0.12),
  })
  const Icon = bidStatus.status === 'blocked' ? ShieldAlert : bidStatus.status === 'comfort' ? CheckCircle2 : AlertTriangle

  return (
    <section className="panel valuationPanel">
      <div className="panelHead">
        <div>
          <span className="eyebrow">MOTOR FINANCEIRO</span>
          <h3>Valuation e limite de lance</h3>
        </div>
        <span className={`bidBadge ${bidStatus.status}`}><Icon size={15} /> {bidStatus.label}</span>
      </div>
      <p className="panelCopy">{bidStatus.message}</p>
      <div className="limitGrid">
        <div><span>Lance de conforto</span><strong>{money(opportunity.comfortBid)}</strong></div>
        <div><span>Lance recomendado</span><strong>{money(opportunity.maxBidRecommended)}</strong></div>
        <div><span>Limite absoluto</span><strong>{money(opportunity.maxBidAbsolute)}</strong></div>
      </div>
      <div className="scenarioTable">
        <div className="scenarioHead"><span>Cenário</span><span>Venda</span><span>Custo total</span><span>Lucro</span><span>ROI</span></div>
        {scenarios.map((scenario) => (
          <div key={scenario.scenario}>
            <span>{scenario.scenario === 'pessimistic' ? 'Pessimista' : scenario.scenario === 'base' ? 'Base' : 'Otimista'}</span>
            <span>{money(scenario.exitValue)}</span>
            <span>{money(scenario.totalCost)}</span>
            <span>{money(scenario.profit)}</span>
            <span>{percent(scenario.roiPct)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
