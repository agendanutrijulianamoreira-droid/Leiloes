'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, RotateCcw, Save } from 'lucide-react'
import { OSShell } from '@/components/os-shell'
import type { AuctionOpportunity, RiskLevel } from '@/lib/domain'
import { loadLocalOpportunities, updateLocalOpportunity } from '@/lib/local-opportunities'
import type { EditableDiligenceItem, DiligenceStatus } from '@/lib/local-diligence'
import { loadLocalDiligence, resetLocalDiligence, saveLocalDiligence, summarizeDiligence } from '@/lib/local-diligence'

const statusOptions: { value: DiligenceStatus; label: string }[] = [
  { value: 'pending', label: 'Pendente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'warning', label: 'Atenção' },
  { value: 'blocked', label: 'Bloqueio' },
]

const riskOptions: RiskLevel[] = ['Baixo', 'Médio', 'Alto', 'Crítico']

export default function DiligencePage() {
  const [opportunities, setOpportunities] = useState<AuctionOpportunity[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [items, setItems] = useState<EditableDiligenceItem[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    const loaded = loadLocalOpportunities()
    setOpportunities(loaded)
    setSelectedId(loaded[0]?.id ?? '')
  }, [])

  useEffect(() => {
    if (!selectedId) return
    setItems(loadLocalDiligence(selectedId))
    setMessage('')
  }, [selectedId])

  const selected = opportunities.find((item) => item.id === selectedId) ?? null
  const summary = useMemo(() => summarizeDiligence(items), [items])

  function updateItem(id: string, patch: Partial<EditableDiligenceItem>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item))
  }

  function save() {
    if (!selectedId || !selected) return
    const saved = saveLocalDiligence(selectedId, items)
    const nextSummary = summarizeDiligence(saved)
    updateLocalOpportunity(selectedId, {
      risk: nextSummary.highestRisk,
      confidence: Math.max(selected.confidence, Math.min(95, 25 + nextSummary.completionPct)),
      status: nextSummary.blocked ? 'rejected' : nextSummary.completionPct >= 75 ? 'valuation' : 'due_diligence',
      mainRisk: nextSummary.blocked ? 'Diligência possui bloqueio crítico pendente.' : selected.mainRisk,
      blockers: saved.filter((item) => item.status === 'blocked').map((item) => `${item.category}: ${item.item}`),
    })
    setOpportunities(loadLocalOpportunities())
    setMessage('Diligência salva. A ficha da oportunidade foi atualizada.')
  }

  function reset() {
    if (!selectedId) return
    setItems(resetLocalDiligence(selectedId))
    setMessage('Checklist restaurado para o modelo inicial.')
  }

  return (
    <OSShell title="Diligência" eyebrow="CHECKLIST LOCAL-FIRST">
      <section className="sectionIntro withAction">
        <div>
          <span className="eyebrow">DOCUMENTOS, RISCOS E BLOQUEIOS</span>
          <h2>Checklist de diligência por oportunidade</h2>
          <p>Use esta tela para registrar o que já foi confirmado, o que ainda é incerteza e o que bloqueia a entrada no leilão.</p>
        </div>
        <div className="preBidSelector">
          <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            {opportunities.map((opportunity) => <option key={opportunity.id} value={opportunity.id}>{opportunity.id}</option>)}
          </select>
          {selectedId && <Link className="outline" href={`/opportunities/${selectedId}`}>Abrir ficha</Link>}
        </div>
      </section>

      {!selected ? (
        <section className="panel"><p className="emptyState compact">Nenhuma oportunidade disponível. Cadastre uma oportunidade primeiro.</p></section>
      ) : (
        <>
          <div className="metrics diligenceMetrics">
            <div className="metric"><span>Conclusão</span><strong>{summary.completionPct}%</strong><small>{summary.confirmed}/{summary.total} itens confirmados</small></div>
            <div className="metric"><span>Pendentes</span><strong>{summary.pending}</strong><small>Itens ainda sem evidência</small></div>
            <div className="metric"><span>Atenção</span><strong>{summary.warnings}</strong><small>Itens com ressalvas</small></div>
            <div className="metric"><span>Bloqueios</span><strong>{summary.blocked}</strong><small>Impedem aprovação</small></div>
          </div>

          {message && <div className="formAlert success diligenceMessage"><span>{message}</span></div>}

          <section className="panel">
            <div className="panelHead withAction">
              <div><span className="eyebrow">{selected.id}</span><h3>{selected.title}</h3></div>
              <div className="modalActions compactActions">
                <button className="outline" type="button" onClick={reset}><RotateCcw size={15} /> Restaurar</button>
                <button className="primary" type="button" onClick={save}><Save size={15} /> Salvar diligência</button>
              </div>
            </div>

            <div className="diligenceEditor">
              {items.map((item) => (
                <article key={item.id} className={`diligenceEditCard ${item.status}`}>
                  <div className="diligenceEditTop">
                    <div>
                      <span className="eyebrow">{item.category}</span>
                      <h4>{item.item}</h4>
                    </div>
                    {item.status === 'blocked' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
                  </div>

                  <div className="formGrid twoColumns compactForm">
                    <label>Status
                      <select value={item.status} onChange={(event) => updateItem(item.id, { status: event.target.value as DiligenceStatus })}>
                        {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label>Risco
                      <select value={item.risk} onChange={(event) => updateItem(item.id, { risk: event.target.value as RiskLevel })}>
                        {riskOptions.map((risk) => <option key={risk} value={risk}>{risk}</option>)}
                      </select>
                    </label>
                  </div>

                  <label className="textAreaLabel">Evidência / fonte / conclusão
                    <textarea value={item.evidence} onChange={(event) => updateItem(item.id, { evidence: event.target.value })} />
                  </label>
                  <label className="textAreaLabel">Observações internas
                    <textarea value={item.notes ?? ''} onChange={(event) => updateItem(item.id, { notes: event.target.value })} placeholder="Ex.: perguntar ao advogado, solicitar matrícula atualizada, confirmar débito..." />
                  </label>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </OSShell>
  )
}
