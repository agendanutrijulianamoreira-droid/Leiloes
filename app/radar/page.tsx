'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Plus, RefreshCw, Send, Trash2 } from 'lucide-react'
import { MetricCard } from '@/components/metric-card'
import { OSShell } from '@/components/os-shell'
import { money } from '@/lib/format'
import type { RadarLead, RadarLeadInput, RadarSourceType } from '@/lib/local-radar'
import { createRadarLead, loadRadarLeads, promoteRadarLead, resetRadarLeads, summarizeRadar, updateRadarLead } from '@/lib/local-radar'

const emptyInput: RadarLeadInput = {
  title: '',
  sourceName: '',
  sourceType: 'site',
  url: '',
  city: '',
  state: 'MG',
  assetType: 'Imóvel residencial',
  estimatedMarketValue: 0,
  openingBid: 0,
  auctionDate: '',
  priority: 'media',
  notes: '',
}

const statusLabel: Record<RadarLead['status'], string> = {
  watching: 'Observando',
  triage: 'Triagem',
  promoted: 'Virou deal',
  discarded: 'Descartado',
}

function discountPct(lead: RadarLead) {
  if (!lead.estimatedMarketValue || !lead.openingBid) return 0
  return Math.round((1 - lead.openingBid / lead.estimatedMarketValue) * 100)
}

export default function RadarPage() {
  const [leads, setLeads] = useState<RadarLead[]>(() => loadRadarLeads())
  const [form, setForm] = useState<RadarLeadInput>(emptyInput)
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const summary = useMemo(() => summarizeRadar(leads), [leads])

  function update(field: keyof RadarLeadInput, value: string) {
    setForm((current) => ({
      ...current,
      [field]: ['estimatedMarketValue', 'openingBid'].includes(field) ? Number(value) : value,
    }))
  }

  function submitLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setErrors({})
    const result = createRadarLead(form)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setLeads(result.items)
    setForm(emptyInput)
    setMessage('Oportunidade adicionada ao Radar.')
  }

  function changeStatus(lead: RadarLead, status: RadarLead['status']) {
    const result = updateRadarLead(lead.id, { status })
    if (result.ok) setLeads(result.items)
  }

  function promote(lead: RadarLead) {
    const result = promoteRadarLead(lead.id)
    if (!result.ok) {
      setMessage(result.error)
      return
    }
    setLeads(result.items)
    setMessage(`Lead promovido para ${result.dealId}.`)
  }

  function reset() {
    setLeads(resetRadarLeads())
    setMessage('Radar restaurado com dados demo.')
  }

  return (
    <OSShell title="Radar" eyebrow="CAPTURA DE OPORTUNIDADES">
      <section className="sectionIntro actionIntro">
        <div>
          <span className="eyebrow">RADAR LOCAL-FIRST</span>
          <h2>Fontes e oportunidades em observação</h2>
          <p>Use esta tela para registrar oportunidades brutas antes de transformá-las em Deal oficial. Nada aqui exige Supabase ou conectores externos.</p>
        </div>
        <button className="outline" type="button" onClick={reset}><RefreshCw size={15} /> Restaurar demo</button>
      </section>

      <div className="metrics radarMetrics">
        <MetricCard label="Itens no radar" value={String(summary.total)} note="Fontes e leads" />
        <MetricCard label="Em triagem" value={String(summary.triage)} note="Requer análise rápida" />
        <MetricCard label="Alta prioridade" value={String(summary.highPriority)} note="Não descartados" />
        <MetricCard label="Viraram deal" value={String(summary.promoted)} note="Convertidos para pipeline" />
      </div>

      <section className="panel radarFormPanel">
        <div className="panelHead"><div><span className="eyebrow">NOVA ENTRADA</span><h3>Cadastrar item no Radar</h3></div><Plus size={18} /></div>
        <form onSubmit={submitLead}>
          <div className="formGrid twoColumns">
            <label>Título<input value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="Apartamento 2 quartos — Pampulha" />{errors.title && <small>{errors.title}</small>}</label>
            <label>Fonte/leiloeiro<input value={form.sourceName} onChange={(e) => update('sourceName', e.target.value)} placeholder="Nome do leiloeiro ou site" />{errors.sourceName && <small>{errors.sourceName}</small>}</label>
            <label>Tipo de fonte<select value={form.sourceType} onChange={(e) => update('sourceType', e.target.value as RadarSourceType)}><option value="site">Site</option><option value="email">E-mail</option><option value="leiloeiro">Leiloeiro</option><option value="edital">Edital público</option><option value="indicacao">Indicação</option><option value="outro">Outro</option></select></label>
            <label>Prioridade<select value={form.priority} onChange={(e) => update('priority', e.target.value)}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></label>
            <label>URL<input value={form.url} onChange={(e) => update('url', e.target.value)} placeholder="https://..." /></label>
            <label>Tipo do ativo<input value={form.assetType} onChange={(e) => update('assetType', e.target.value)} /></label>
            <label>Cidade<input value={form.city} onChange={(e) => update('city', e.target.value)} placeholder="Belo Horizonte" /></label>
            <label>UF<input value={form.state} onChange={(e) => update('state', e.target.value)} maxLength={2} /></label>
            <label>Valor de mercado estimado<input type="number" value={form.estimatedMarketValue || ''} onChange={(e) => update('estimatedMarketValue', e.target.value)} placeholder="420000" /></label>
            <label>Lance inicial/atual<input type="number" value={form.openingBid || ''} onChange={(e) => update('openingBid', e.target.value)} placeholder="210000" /></label>
            <label>Data do leilão<input type="datetime-local" value={form.auctionDate} onChange={(e) => update('auctionDate', e.target.value)} /></label>
            <label>Observações<input value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="Pontos de atenção para triagem" /></label>
          </div>
          {message && <div className="formAlert success"><span>{message}</span></div>}
          <div className="modalActions"><button className="primary" type="submit">Adicionar ao Radar</button></div>
        </form>
      </section>

      <section className="panel">
        <div className="panelHead"><div><span className="eyebrow">FUNIL</span><h3>Triagem rápida</h3></div></div>
        <div className="radarList">
          {leads.map((lead) => {
            const discount = discountPct(lead)
            return (
              <article className={`radarLead ${lead.status} priority-${lead.priority}`} key={lead.id}>
                <div className="radarLeadTop">
                  <div>
                    <span className="eyebrow">{lead.sourceName} · {lead.sourceType}</span>
                    <h4>{lead.title}</h4>
                    <p>{lead.city || 'Cidade não informada'}/{lead.state || 'UF'} · {lead.assetType}</p>
                  </div>
                  <div className="radarStatus"><span>{statusLabel[lead.status]}</span><strong>{lead.priority}</strong></div>
                </div>
                <div className="radarLeadMetrics">
                  <div><span>Mercado</span><strong>{money(lead.estimatedMarketValue)}</strong></div>
                  <div><span>Lance</span><strong>{money(lead.openingBid)}</strong></div>
                  <div><span>Desconto aparente</span><strong>{discount}%</strong></div>
                  <div><span>Leilão</span><strong>{lead.auctionDate ? new Date(lead.auctionDate).toLocaleDateString('pt-BR') : 'Sem data'}</strong></div>
                </div>
                {lead.notes && <p className="radarNotes">{lead.notes}</p>}
                <div className="radarActions">
                  <select value={lead.status} onChange={(e) => changeStatus(lead, e.target.value as RadarLead['status'])}>
                    <option value="watching">Observando</option>
                    <option value="triage">Triagem</option>
                    <option value="discarded">Descartado</option>
                    <option value="promoted">Virou deal</option>
                  </select>
                  {lead.url && <a className="outline" href={lead.url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Abrir fonte</a>}
                  {lead.status !== 'promoted' ? <button className="primary" type="button" onClick={() => promote(lead)}><Send size={14} /> Virar deal</button> : <Link className="primary" href={`/opportunities/${lead.promotedDealId}`}>Abrir deal</Link>}
                  <button className="outline" type="button" onClick={() => changeStatus(lead, 'discarded')}><Trash2 size={14} /> Descartar</button>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </OSShell>
  )
}
