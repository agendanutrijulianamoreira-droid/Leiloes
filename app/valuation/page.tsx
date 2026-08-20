'use client'

import { useMemo, useState } from 'react'
import { OSShell } from '@/components/os-shell'
import { calculateMaxBid, buildScenarioSet } from '@/lib/valuation'
import { money, percent } from '@/lib/format'

export default function ValuationPage() {
  const [marketValue, setMarketValue] = useState(420000)
  const [bid, setBid] = useState(218000)
  const [renovation, setRenovation] = useState(35000)
  const [debts, setDebts] = useState(12000)
  const [targetRoiPct, setTargetRoiPct] = useState(25)

  const result = useMemo(() => calculateMaxBid({
    marketValue,
    commissionPct: 5,
    itbi: marketValue * 0.03,
    registry: 4500,
    legal: 8000,
    debts,
    renovation,
    possession: 10000,
    contingencyPct: 12,
    targetRoiPct,
  }), [marketValue, renovation, debts, targetRoiPct])

  const scenarios = useMemo(() => buildScenarioSet({
    bid,
    conservativeValue: marketValue * 0.92,
    baseValue: marketValue,
    optimisticValue: marketValue * 1.08,
    baseAdditionalCosts: result.totalCostsExcludingBid,
  }), [bid, marketValue, result.totalCostsExcludingBid])

  return (
    <OSShell title="Valuation" eyebrow="MOTOR DETERMINÍSTICO">
      <div className="calculatorGrid">
        <section className="panel">
          <div className="panelHead"><div><span className="eyebrow">ENTRADAS</span><h3>Premissas financeiras</h3></div></div>
          <div className="formGrid">
            <label>Valor de mercado<input type="number" value={marketValue} onChange={(e) => setMarketValue(Number(e.target.value))} /></label>
            <label>Lance atual<input type="number" value={bid} onChange={(e) => setBid(Number(e.target.value))} /></label>
            <label>Reforma<input type="number" value={renovation} onChange={(e) => setRenovation(Number(e.target.value))} /></label>
            <label>Débitos<input type="number" value={debts} onChange={(e) => setDebts(Number(e.target.value))} /></label>
            <label>ROI alvo (%)<input type="number" value={targetRoiPct} onChange={(e) => setTargetRoiPct(Number(e.target.value))} /></label>
          </div>
        </section>

        <section className="panel">
          <div className="panelHead"><div><span className="eyebrow">SAÍDA</span><h3>Limites calculados</h3></div></div>
          <div className="limitGrid vertical">
            <div><span>Custos sem lance</span><strong>{money(result.totalCostsExcludingBid)}</strong></div>
            <div><span>Lance de conforto</span><strong>{money(result.comfortBid)}</strong></div>
            <div><span>Lance recomendado</span><strong>{money(result.maxBidRecommended)}</strong></div>
            <div><span>Limite absoluto</span><strong>{money(result.maxBidAbsolute)}</strong></div>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panelHead"><div><span className="eyebrow">CENÁRIOS</span><h3>Retorno estimado</h3></div></div>
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
    </OSShell>
  )
}
