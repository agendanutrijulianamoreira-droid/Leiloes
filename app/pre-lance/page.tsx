'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { OSShell } from '@/components/os-shell'
import type { AuctionOpportunity } from '@/lib/domain'
import { loadLocalOpportunities } from '@/lib/local-opportunities'
import { money, percent } from '@/lib/format'
import { classifyBid } from '@/lib/valuation'

export default function PreBidPage() {
  const [opportunities, setOpportunities] = useState<AuctionOpportunity[]>([])
  const [selectedId, setSelectedId] = useState('')

  useEffect(() => {
    const loaded = loadLocalOpportunities()
    setOpportunities(loaded)
    setSelectedId(loaded[0]?.id ?? '')
  }, [])

  const opportunity = useMemo(() => opportunities.find((item) => item.id === selectedId) ?? opportunities[0], [opportunities, selectedId])

  if (!opportunity) {
    return (
      <OSShell title="Pré-lance" eyebrow="MODO LEILÃO">
        <p className="emptyState">Nenhuma oportunidade disponível. Cadastre uma oportunidade antes de usar o pré-lance.</p>
      </OSShell>
    )
  }

  const status = classifyBid(opportunity.currentBid, opportunity)
  const hasAbsoluteLimit = opportunity.maxBidAbsolute > 0

  return (
    <OSShell title="Pré-lance" eyebrow={opportunity.id}>
      <section className="sectionIntro actionIntro">
        <div>
          <span className="eyebrow">MODO LEILÃO</span>
          <h2>Controle de limite antes do lance</h2>
          <p>Escolha uma oportunidade e use esta tela como painel de disciplina. O limite absoluto não deve ser ultrapassado sem novo valuation.</p>
        </div>
        <div className="preBidSelector">
          <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            {opportunities.map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}
          </select>
          <Link className="outline" href={`/opportunities/${opportunity.id}`}>Abrir ficha</Link>
        </div>
      </section>

      <section className="preBidScreen">
        <span className={`bidBadge ${hasAbsoluteLimit ? status.status : 'above_recommended'}`}>{hasAbsoluteLimit ? status.label : 'Valuation pendente'}</span>
        <h2>{opportunity.title}</h2>
        <p>{hasAbsoluteLimit ? status.message : 'Calcule e salve o valuation antes de decidir qualquer lance.'}</p>
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
        <div className="noGo">{hasAbsoluteLimit ? `NÃO ULTRAPASSAR ${money(opportunity.maxBidAbsolute)}` : 'NÃO DAR LANCE SEM VALUATION'}</div>
      </section>
    </OSShell>
  )
}
