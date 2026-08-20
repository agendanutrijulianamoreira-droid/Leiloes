'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react'
import { OSShell } from '@/components/os-shell'
import type { AuctionOpportunity, Decision } from '@/lib/domain'
import { money } from '@/lib/format'
import { evaluateCommitteeBlockers, loadCommitteeMemo, saveCommitteeMemo } from '@/lib/local-committee'
import { loadLocalOpportunities } from '@/lib/local-opportunities'

const decisions: Decision[] = ['A — Aprovar', 'B — Participar até limite', 'C — Monitorar', 'D — Rejeitar', 'Bloqueado']

export default function CommitteePage() {
  const [opportunities, setOpportunities] = useState<AuctionOpportunity[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [decision, setDecision] = useState<Decision>('C — Monitorar')
  const [thesis, setThesis] = useState('')
  const [rationale, setRationale] = useState('')
  const [riskNotes, setRiskNotes] = useState('')
  const [approvedBy, setApprovedBy] = useState('Juliana')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const items = loadLocalOpportunities()
    setOpportunities(items)
    const first = items[0]?.id ?? ''
    setSelectedId(first)
  }, [])

  const selected = useMemo(() => opportunities.find((item) => item.id === selectedId) ?? null, [opportunities, selectedId])
  const evaluation = useMemo(() => selected ? evaluateCommitteeBlockers(selected) : null, [selected])

  useEffect(() => {
    if (!selected) return
    const memo = loadCommitteeMemo(selected.id)
    setDecision(memo?.decision ?? selected.decision ?? 'C — Monitorar')
    setThesis(memo?.thesis ?? selected.mainUpside ?? '')
    setRationale(memo?.rationale ?? '')
    setRiskNotes(memo?.riskNotes ?? selected.mainRisk ?? '')
    setApprovedBy(memo?.approvedBy ?? 'Juliana')
    setMessage('')
  }, [selected])

  function submit() {
    if (!selected) return
    const result = saveCommitteeMemo({ dealId: selected.id, decision, thesis, rationale, riskNotes, approvedBy })
    if (!result.ok) {
      setMessage(result.error)
      return
    }
    setOpportunities(loadLocalOpportunities())
    setMessage(result.memo.decision === 'Bloqueado' ? 'Decisão salva, mas o sistema bloqueou aprovação por trava de risco.' : 'Decisão do comitê salva com sucesso.')
  }

  return (
    <OSShell title="Investment Committee" eyebrow="DECISÃO FORMAL">
      <section className="sectionIntro actionIntro">
        <div>
          <span className="eyebrow">COMITÊ DE INVESTIMENTO</span>
          <h2>Aprovar, limitar, monitorar ou bloquear</h2>
          <p>Esta tela registra a decisão final antes do pré-lance. Se houver trava dura, o sistema impede aprovação mesmo que a decisão escolhida seja positiva.</p>
        </div>
        <div className="preBidSelector">
          <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            {opportunities.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.title}</option>)}
          </select>
        </div>
      </section>

      {!selected ? <section className="panel"><p className="emptyState">Nenhuma oportunidade disponível. Cadastre uma oportunidade primeiro.</p></section> : (
        <>
          <div className="detailGrid">
            <section className="panel">
              <div className="panelHead"><div><span className="eyebrow">RESUMO</span><h3>{selected.title}</h3></div><ShieldAlert size={18} /></div>
              <div className="facts">
                <div><span>Lance atual</span><strong>{money(selected.currentBid)}</strong></div>
                <div><span>Limite absoluto</span><strong>{money(selected.maxBidAbsolute)}</strong></div>
                <div><span>Lance recomendado</span><strong>{money(selected.maxBidRecommended)}</strong></div>
                <div><span>Risco</span><strong>{selected.risk}</strong></div>
                <div><span>Confiança</span><strong>{selected.confidence}%</strong></div>
                <div><span>Status atual</span><strong>{selected.status}</strong></div>
              </div>
            </section>

            <section className="panel">
              <div className="panelHead"><div><span className="eyebrow">TRAVAS</span><h3>Kill switches</h3></div><AlertTriangle size={18} /></div>
              {evaluation?.blockers.length ? (
                <div className="blockers committeeBlockers">
                  {evaluation.blockers.map((blocker) => <div key={blocker}><AlertTriangle size={15} /> {blocker}</div>)}
                </div>
              ) : (
                <div className="committeeClear"><CheckCircle2 size={17} /> Nenhuma trava dura detectada.</div>
              )}
              <div className="limitGrid vertical committeeSummary">
                <div><span>Diligência concluída</span><strong>{evaluation?.diligenceSummary.completionPct ?? 0}%</strong></div>
                <div><span>Pendências</span><strong>{evaluation?.diligenceSummary.pending ?? 0}</strong></div>
                <div><span>Bloqueios</span><strong>{evaluation?.diligenceSummary.blocked ?? 0}</strong></div>
              </div>
            </section>
          </div>

          <section className="panel">
            <div className="panelHead"><div><span className="eyebrow">DECISÃO</span><h3>Memo do comitê</h3></div></div>
            {message && <div className={message.includes('bloqueou') ? 'formAlert error' : 'formAlert success'}><span>{message}</span></div>}
            <div className="formGrid twoColumns committeeForm">
              <label>Decisão
                <select value={decision} onChange={(event) => setDecision(event.target.value as Decision)}>
                  {decisions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label>Responsável pela decisão<input value={approvedBy} onChange={(event) => setApprovedBy(event.target.value)} /></label>
              <label>Tese de investimento<textarea value={thesis} onChange={(event) => setThesis(event.target.value)} placeholder="Por que essa operação pode fazer sentido?" /></label>
              <label>Riscos e ressalvas<textarea value={riskNotes} onChange={(event) => setRiskNotes(event.target.value)} placeholder="O que ainda pode destruir a tese?" /></label>
              <label className="wideField">Racional da decisão<textarea value={rationale} onChange={(event) => setRationale(event.target.value)} placeholder="Explique por que aprovar, limitar, monitorar, rejeitar ou bloquear." /></label>
            </div>
            <div className="modalActions">
              <Link className="outline" href={`/opportunities/${selected.id}`}>Ver ficha</Link>
              <button className="primary" onClick={submit}>Salvar decisão</button>
            </div>
          </section>
        </>
      )}
    </OSShell>
  )
}
