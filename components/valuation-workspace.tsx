'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { AuctionOpportunity } from '@/lib/domain'
import { loadLocalOpportunities, saveValuationToLocalOpportunity } from '@/lib/local-opportunities'
import { buildScenarioSet, calculateMaxBid, classifyBid } from '@/lib/valuation'
import { money, percent } from '@/lib/format'

type FormState = {
  dealId: string
  marketValue: number
  currentBid: number
  commissionPct: number
  itbi: number
  registry: number
  legal: number
  debts: number
  renovation: number
  possession: number
  financing: number
  contingencyPct: number
  targetRoiPct: number
}

const emptyForm: FormState = {
  dealId: '',
  marketValue: 0,
  currentBid: 0,
  commissionPct: 5,
  itbi: 0,
  registry: 4500,
  legal: 8000,
  debts: 0,
  renovation: 0,
  possession: 10000,
  financing: 0,
  contingencyPct: 12,
  targetRoiPct: 25,
}

function fromOpportunity(opportunity: AuctionOpportunity): FormState {
  return {
    ...emptyForm,
    dealId: opportunity.id,
    marketValue: opportunity.marketBase || opportunity.marketConservative || 0,
    currentBid: opportunity.currentBid,
    itbi: (opportunity.marketBase || 0) * 0.03,
  }
}

export function ValuationWorkspace() {
  const [opportunities, setOpportunities] = useState<AuctionOpportunity[]>([])
  const [form, setForm] = useState<FormState>(emptyForm)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const loaded = loadLocalOpportunities()
    setOpportunities(loaded)
    if (loaded[0]) setForm(fromOpportunity(loaded[0]))
  }, [])

  const selected = opportunities.find((item) => item.id === form.dealId) ?? null

  const result = useMemo(() => calculateMaxBid({
    marketValue: Number(form.marketValue) || 0,
    commissionPct: Number(form.commissionPct) || 0,
    itbi: Number(form.itbi) || 0,
    registry: Number(form.registry) || 0,
    legal: Number(form.legal) || 0,
    debts: Number(form.debts) || 0,
    renovation: Number(form.renovation) || 0,
    possession: Number(form.possession) || 0,
    financing: Number(form.financing) || 0,
    contingencyPct: Number(form.contingencyPct) || 0,
    targetRoiPct: Number(form.targetRoiPct) || 0,
  }), [form])

  const bidStatus = classifyBid(Number(form.currentBid) || 0, result)

  const scenarios = useMemo(() => buildScenarioSet({
    bid: Number(form.currentBid) || 0,
    conservativeValue: (Number(form.marketValue) || 0) * 0.92,
    baseValue: Number(form.marketValue) || 0,
    optimisticValue: (Number(form.marketValue) || 0) * 1.08,
    baseAdditionalCosts: result.totalCostsExcludingBid,
  }), [form.currentBid, form.marketValue, result.totalCostsExcludingBid])

  const baseScenario = scenarios.find((scenario) => scenario.scenario === 'base')

  const updateNumber = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [field]: Number(event.target.value) }))
    setMessage('')
  }

  const updateDeal = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = opportunities.find((item) => item.id === event.target.value)
    if (next) setForm(fromOpportunity(next))
    setMessage('')
  }

  function saveValuation() {
    if (!selected) return
    const saved = saveValuationToLocalOpportunity(form.dealId, {
      marketBase: form.marketValue,
      currentBid: form.currentBid,
      maxBidAbsolute: result.maxBidAbsolute,
      maxBidRecommended: result.maxBidRecommended,
      comfortBid: result.comfortBid,
      baseRoiPct: baseScenario?.roiPct ?? 0,
      marketConservative: form.marketValue * 0.92,
      marketOptimistic: form.marketValue * 1.08,
    })
    setOpportunities(saved.items)
    setMessage(saved.ok ? 'Valuation salvo na oportunidade.' : 'Não foi possível salvar o valuation.')
  }

  if (!opportunities.length) {
    return <p className="emptyState">Nenhuma oportunidade carregada. Cadastre uma oportunidade antes de calcular valuation.</p>
  }

  return (
    <>
      <section className="sectionIntro actionIntro">
        <div>
          <span className="eyebrow">MOTOR FINANCEIRO</span>
          <h2>Valuation local-first</h2>
          <p>Escolha uma oportunidade, ajuste custos e salve os novos limites. A ficha e o pré-lance passam a refletir esses números.</p>
        </div>
        {selected && <Link className="outline" href={`/opportunities/${selected.id}`}>Abrir ficha</Link>}
      </section>

      <div className="calculatorGrid">
        <section className="panel">
          <div className="panelHead"><div><span className="eyebrow">ENTRADAS</span><h3>Premissas financeiras</h3></div></div>
          <div className="formGrid twoColumns">
            <label>Oportunidade<select value={form.dealId} onChange={updateDeal}>{opportunities.map((item) => <option key={item.id} value={item.id}>{item.id} — {item.title}</option>)}</select></label>
            <label>Valor de mercado base<input type="number" value={form.marketValue} onChange={updateNumber('marketValue')} /></label>
            <label>Lance atual<input type="number" value={form.currentBid} onChange={updateNumber('currentBid')} /></label>
            <label>Comissão leiloeiro (%)<input type="number" value={form.commissionPct} onChange={updateNumber('commissionPct')} /></label>
            <label>ITBI<input type="number" value={form.itbi} onChange={updateNumber('itbi')} /></label>
            <label>Registro/cartório<input type="number" value={form.registry} onChange={updateNumber('registry')} /></label>
            <label>Advogado<input type="number" value={form.legal} onChange={updateNumber('legal')} /></label>
            <label>Débitos<input type="number" value={form.debts} onChange={updateNumber('debts')} /></label>
            <label>Reforma<input type="number" value={form.renovation} onChange={updateNumber('renovation')} /></label>
            <label>Posse/desocupação<input type="number" value={form.possession} onChange={updateNumber('possession')} /></label>
            <label>Custo financeiro<input type="number" value={form.financing} onChange={updateNumber('financing')} /></label>
            <label>Contingência (%)<input type="number" value={form.contingencyPct} onChange={updateNumber('contingencyPct')} /></label>
            <label>ROI alvo (%)<input type="number" value={form.targetRoiPct} onChange={updateNumber('targetRoiPct')} /></label>
          </div>
          <div className="modalActions">
            <button className="primary" type="button" onClick={saveValuation}>Salvar valuation</button>
          </div>
          {message && <div className="formAlert success"><span>{message}</span></div>}
        </section>

        <section className="panel">
          <div className="panelHead"><div><span className="eyebrow">SAÍDA</span><h3>Limites calculados</h3></div></div>
          <span className={`bidBadge ${bidStatus.status}`}>{bidStatus.label}</span>
          <p className="panelCopy valuationMessage">{bidStatus.message}</p>
          <div className="limitGrid vertical">
            <div><span>Custos fixos</span><strong>{money(result.fixedCosts)}</strong></div>
            <div><span>Contingência</span><strong>{money(result.contingency)}</strong></div>
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
    </>
  )
}
