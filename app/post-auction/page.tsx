'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, History, RotateCcw } from 'lucide-react'
import { OSShell } from '@/components/os-shell'
import type { AuctionOpportunity } from '@/lib/domain'
import { money, percent } from '@/lib/format'
import { loadLocalOpportunities } from '@/lib/local-opportunities'
import { calculatePostAuctionSummary, loadPostAuctionRecord, savePostAuctionRecord, type AuctionOutcome, type ExitStrategy, type PostAuctionRecord, type PostAuctionStage } from '@/lib/local-post-auction'

const outcomeLabel: Record<AuctionOutcome, string> = {
  pending: 'Resultado pendente',
  won: 'Arrematado',
  lost: 'Perdido',
  not_participated: 'Não participei',
}

const stageLabel: Record<PostAuctionStage, string> = {
  resultado: 'Resultado',
  pagamento: 'Pagamento',
  regularizacao: 'Regularização',
  posse: 'Posse',
  reforma: 'Reforma',
  venda_locacao: 'Venda/locação',
  encerrado: 'Encerrado',
}

const exitLabel: Record<ExitStrategy, string> = {
  revenda: 'Revenda',
  locacao: 'Locação',
  hold: 'Hold patrimonial',
  indefinida: 'Indefinida',
}

function numberValue(value: string) {
  return Number(value || 0)
}

export default function PostAuctionPage() {
  const [opportunities, setOpportunities] = useState<AuctionOpportunity[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [record, setRecord] = useState<PostAuctionRecord | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const data = loadLocalOpportunities()
    setOpportunities(data)
    setSelectedId(data[0]?.id ?? '')
  }, [])

  const opportunity = useMemo(() => opportunities.find((item) => item.id === selectedId) ?? null, [opportunities, selectedId])

  useEffect(() => {
    if (!selectedId || !opportunity) return
    setRecord(loadPostAuctionRecord(selectedId, opportunity))
    setMessage('')
  }, [selectedId, opportunity])

  const summary = useMemo(() => opportunity && record ? calculatePostAuctionSummary(opportunity, record) : null, [opportunity, record])

  function update<K extends keyof PostAuctionRecord>(field: K, value: PostAuctionRecord[K]) {
    setRecord((current) => current ? { ...current, [field]: value } : current)
  }

  function save() {
    if (!record) return
    const saved = savePostAuctionRecord(record)
    setRecord(saved)
    setOpportunities(loadLocalOpportunities())
    setMessage('Pós-leilão salvo e ficha da oportunidade atualizada.')
  }

  function resetFromOpportunity() {
    if (!opportunity) return
    const fresh = loadPostAuctionRecord(opportunity.id, opportunity)
    setRecord(fresh)
    setMessage('Registro recarregado a partir da oportunidade.')
  }

  return (
    <OSShell title="Pós-leilão" eyebrow="EXECUÇÃO E APRENDIZADO">
      <section className="sectionIntro actionIntro">
        <div>
          <span className="eyebrow">PÓS-ARREMATAÇÃO</span>
          <h2>Resultado, custos reais e aprendizado</h2>
          <p>Registre o que aconteceu no leilão e acompanhe se a operação ficou melhor ou pior do que o planejado.</p>
        </div>
        <div className="preBidSelector">
          <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            {opportunities.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.title}</option>)}
          </select>
        </div>
      </section>

      {!opportunity || !record || !summary ? (
        <section className="panel"><p className="emptyState">Cadastre uma oportunidade antes de registrar o pós-leilão.</p></section>
      ) : (
        <>
          <section className="panel postAuctionHero">
            <div>
              <span className="eyebrow">{opportunity.id}</span>
              <h3>{opportunity.title}</h3>
              <p>{opportunity.city}/{opportunity.state} · decisão atual: {opportunity.decision}</p>
            </div>
            <div className={`postOutcome ${record.outcome}`}>
              <span>{outcomeLabel[record.outcome]}</span>
              <strong>{stageLabel[record.stage]}</strong>
            </div>
          </section>

          {message && <div className="formAlert success postMessage"><span>{message}</span></div>}

          <div className="calculatorGrid">
            <section className="panel">
              <div className="panelHead"><div><span className="eyebrow">RESULTADO</span><h3>Registro do leilão</h3></div></div>
              <div className="formGrid twoColumns">
                <label>Resultado
                  <select value={record.outcome} onChange={(event) => update('outcome', event.target.value as AuctionOutcome)}>
                    {Object.entries(outcomeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label>Etapa pós-leilão
                  <select value={record.stage} onChange={(event) => update('stage', event.target.value as PostAuctionStage)}>
                    {Object.entries(stageLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label>Valor final / arrematação<input type="number" value={record.finalBid} onChange={(event) => update('finalBid', numberValue(event.target.value))} /></label>
                <label>Estratégia de saída
                  <select value={record.exitStrategy} onChange={(event) => update('exitStrategy', event.target.value as ExitStrategy)}>
                    {Object.entries(exitLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label>Pago em<input type="date" value={record.paidAt ?? ''} onChange={(event) => update('paidAt', event.target.value)} /></label>
                <label>Regularizado em<input type="date" value={record.regularizedAt ?? ''} onChange={(event) => update('regularizedAt', event.target.value)} /></label>
                <label>Posse em<input type="date" value={record.possessionAt ?? ''} onChange={(event) => update('possessionAt', event.target.value)} /></label>
                <label>Venda/locação em<input type="date" value={record.soldOrRentedAt ?? ''} onChange={(event) => update('soldOrRentedAt', event.target.value)} /></label>
              </div>
            </section>

            <section className="panel">
              <div className="panelHead"><div><span className="eyebrow">REALIZADO</span><h3>Custos e saída</h3></div></div>
              <div className="formGrid twoColumns">
                <label>Comissão<input type="number" value={record.auctioneerFee} onChange={(event) => update('auctioneerFee', numberValue(event.target.value))} /></label>
                <label>ITBI<input type="number" value={record.itbi} onChange={(event) => update('itbi', numberValue(event.target.value))} /></label>
                <label>Registro/cartório<input type="number" value={record.registry} onChange={(event) => update('registry', numberValue(event.target.value))} /></label>
                <label>Advogado<input type="number" value={record.legal} onChange={(event) => update('legal', numberValue(event.target.value))} /></label>
                <label>Débitos<input type="number" value={record.debts} onChange={(event) => update('debts', numberValue(event.target.value))} /></label>
                <label>Reforma<input type="number" value={record.renovation} onChange={(event) => update('renovation', numberValue(event.target.value))} /></label>
                <label>Posse/desocupação<input type="number" value={record.possession} onChange={(event) => update('possession', numberValue(event.target.value))} /></label>
                <label>Custo financeiro<input type="number" value={record.financialCost} onChange={(event) => update('financialCost', numberValue(event.target.value))} /></label>
                <label>Outros custos<input type="number" value={record.otherCosts} onChange={(event) => update('otherCosts', numberValue(event.target.value))} /></label>
                <label>Valor de saída real<input type="number" value={record.actualExitValue} onChange={(event) => update('actualExitValue', numberValue(event.target.value))} /></label>
              </div>
            </section>
          </div>

          <section className="panel">
            <div className="panelHead"><div><span className="eyebrow">PREVISTO VS. REAL</span><h3>Resultado da operação</h3></div></div>
            <div className="postMetrics">
              <div><span>Custo real total</span><strong>{money(summary.actualTotalCost)}</strong></div>
              <div><span>Lucro real</span><strong>{money(summary.actualProfit)}</strong></div>
              <div><span>ROI real</span><strong>{percent(summary.actualRoiPct)}</strong></div>
              <div><span>Variação de custo</span><strong>{percent(summary.costVariancePct)}</strong></div>
              <div><span>Variação do valor de saída</span><strong>{percent(summary.exitVariancePct)}</strong></div>
            </div>
            <div className="learningList">
              {summary.learning.map((item) => <div key={item}><History size={15} /> {item}</div>)}
            </div>
            <label className="textAreaLabel">Notas da operação<textarea value={record.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Ex.: por que perdeu, custo inesperado, problema de posse, aprendizado da região..." /></label>
            <div className="modalActions">
              <button className="outline" type="button" onClick={resetFromOpportunity}><RotateCcw size={15} /> Recarregar</button>
              <button className="primary" type="button" onClick={save}><CheckCircle2 size={15} /> Salvar pós-leilão</button>
              <Link className="outline" href={`/opportunities/${opportunity.id}`}>Ver ficha <ArrowRight size={15} /></Link>
            </div>
          </section>
        </>
      )}
    </OSShell>
  )
}
