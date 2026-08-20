'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, CheckCircle2, Clock, RotateCcw, Save } from 'lucide-react'
import { OSShell } from '@/components/os-shell'
import type { AuctionOpportunity } from '@/lib/domain'
import type { LocalCalendarEvent } from '@/lib/local-calendar'
import { loadAllCalendarEvents, summarizeCalendar, updateCalendarEvent } from '@/lib/local-calendar'
import { loadLocalOpportunities } from '@/lib/local-opportunities'

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function toInputDateTime(value: string) {
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

export default function CalendarPage() {
  const [opportunities, setOpportunities] = useState<AuctionOpportunity[]>([])
  const [events, setEvents] = useState<LocalCalendarEvent[]>([])
  const [selectedDealId, setSelectedDealId] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const loaded = loadLocalOpportunities()
    setOpportunities(loaded)
    setSelectedDealId(loaded[0]?.id ?? '')
    setEvents(loadAllCalendarEvents(loaded))
  }, [])

  const selectedEvents = useMemo(() => events.filter((event) => !selectedDealId || event.dealId === selectedDealId), [events, selectedDealId])
  const summary = useMemo(() => summarizeCalendar(selectedEvents), [selectedEvents])

  function updateEvent(eventId: string, patch: Partial<Pick<LocalCalendarEvent, 'status' | 'dueAt' | 'description' | 'title'>>) {
    const event = events.find((item) => item.id === eventId)
    if (!event) return
    const updatedDealEvents = updateCalendarEvent(event.dealId, eventId, patch)
    setEvents((current) => current.map((item) => item.dealId === event.dealId ? (updatedDealEvents.find((updated) => updated.id === item.id) ?? item) : item))
    setMessage('Calendário atualizado.')
  }

  return (
    <OSShell title="Calendário" eyebrow="MARCOS E PRAZOS">
      <section className="sectionIntro actionIntro">
        <div>
          <span className="eyebrow">LOCAL-FIRST</span>
          <h2>Prazos críticos por oportunidade</h2>
          <p>Marcos automáticos: D-7 revisão documental, D-3 matrícula/processo, D-1 comitê, dia do leilão, D+1 resultado, D+2 pagamentos e D+7 regularização.</p>
        </div>
        <div className="preBidSelector">
          <select value={selectedDealId} onChange={(event) => setSelectedDealId(event.target.value)}>
            <option value="">Todas</option>
            {opportunities.map((opportunity) => <option key={opportunity.id} value={opportunity.id}>{opportunity.id}</option>)}
          </select>
        </div>
      </section>

      {message && <div className="formAlert success"><span>{message}</span></div>}

      <div className="metrics calendarMetrics">
        <div className="metric"><span>Total</span><strong>{summary.total}</strong><small>Marcos ativos</small></div>
        <div className="metric"><span>Pendentes</span><strong>{summary.pending}</strong><small>A fazer</small></div>
        <div className="metric"><span>Atrasados</span><strong>{summary.late}</strong><small>Exigem ação</small></div>
        <div className="metric"><span>Concluídos</span><strong>{summary.done}</strong><small>Registrados</small></div>
      </div>

      {summary.next && (
        <section className="panel nextCalendarEvent">
          <div><span className="eyebrow">PRÓXIMO MARCO</span><h3>{summary.next.title}</h3><p>{summary.next.dealId} · {formatDateTime(summary.next.dueAt)}</p></div>
          <Link className="outline" href={`/opportunities/${summary.next.dealId}`}>Abrir ficha</Link>
        </section>
      )}

      <section className="panel">
        <div className="panelHead"><div><span className="eyebrow">AGENDA</span><h3>Eventos operacionais</h3></div><CalendarDays size={18} /></div>
        <div className="calendarList">
          {selectedEvents.map((event) => (
            <article key={event.id} className={`calendarCard ${event.status}`}>
              <div className="calendarIcon">{event.status === 'done' ? <CheckCircle2 size={18} /> : <Clock size={18} />}</div>
              <div>
                <div className="calendarCardTop">
                  <div><strong>{event.title}</strong><span>{event.dealId} · {formatDateTime(event.dueAt)}</span></div>
                  <span className={`calendarStatus ${event.status}`}>{event.status === 'done' ? 'Concluído' : event.status === 'late' ? 'Atrasado' : 'Pendente'}</span>
                </div>
                <div className="formGrid calendarEditGrid">
                  <label>Data e hora<input type="datetime-local" value={toInputDateTime(event.dueAt)} onChange={(change) => updateEvent(event.id, { dueAt: new Date(change.target.value).toISOString() })} /></label>
                  <label>Status<select value={event.status === 'late' ? 'pending' : event.status} onChange={(change) => updateEvent(event.id, { status: change.target.value as LocalCalendarEvent['status'] })}><option value="pending">Pendente</option><option value="done">Concluído</option></select></label>
                </div>
                <label className="textAreaLabel">Descrição<textarea value={event.description} onChange={(change) => updateEvent(event.id, { description: change.target.value })} /></label>
                <div className="calendarActions">
                  <button className="outline" type="button" onClick={() => updateEvent(event.id, { status: 'done' })}><Save size={14} /> Marcar concluído</button>
                  <button className="outline" type="button" onClick={() => updateEvent(event.id, { status: 'pending' })}><RotateCcw size={14} /> Reabrir</button>
                </div>
              </div>
            </article>
          ))}
          {!selectedEvents.length && <div className="emptyState">Nenhum marco de calendário encontrado.</div>}
        </div>
      </section>
    </OSShell>
  )
}
