'use client'

import type { AuctionOpportunity } from './domain'

const STORAGE_KEY = 'leiloes-os:calendar-events:v1'

export type CalendarEventStatus = 'pending' | 'done' | 'late'
export type CalendarEventKind = 'review' | 'document' | 'decision' | 'auction' | 'post_auction' | 'payment' | 'regularization'

export interface LocalCalendarEvent {
  id: string
  dealId: string
  title: string
  kind: CalendarEventKind
  dueAt: string
  status: CalendarEventStatus
  description: string
  createdAt: string
  updatedAt: string
}

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function safeDate(value?: string) {
  const parsed = value ? new Date(value) : null
  if (parsed && !Number.isNaN(parsed.getTime())) return parsed
  const fallback = new Date()
  fallback.setDate(fallback.getDate() + 14)
  fallback.setHours(10, 0, 0, 0)
  return fallback
}

function eventId(dealId: string, kind: CalendarEventKind) {
  return `${dealId}:${kind}`
}

function readAll(): Record<string, LocalCalendarEvent[]> {
  if (!canUseStorage()) return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, LocalCalendarEvent[]>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, LocalCalendarEvent[]>) {
  if (!canUseStorage()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function buildDefaultEvents(opportunity: AuctionOpportunity): LocalCalendarEvent[] {
  const auctionDate = safeDate(opportunity.nextMilestoneDate)
  const now = new Date().toISOString()

  const make = (kind: CalendarEventKind, title: string, dueAt: Date, description: string): LocalCalendarEvent => ({
    id: eventId(opportunity.id, kind),
    dealId: opportunity.id,
    title,
    kind,
    dueAt: dueAt.toISOString(),
    status: 'pending',
    description,
    createdAt: now,
    updatedAt: now,
  })

  return [
    make('review', 'D-7 · Revisão documental', addDays(auctionDate, -7), 'Revisar edital, documentos principais, valuation e pendências abertas.'),
    make('document', 'D-3 · Atualizar matrícula/processo', addDays(auctionDate, -3), 'Confirmar matrícula atualizada, processo, débitos, ocupação e eventuais mudanças do leilão.'),
    make('decision', 'D-1 · Decisão final do comitê', addDays(auctionDate, -1), 'Emitir decisão final: aprovar, participar até limite, monitorar, rejeitar ou bloquear.'),
    make('auction', 'Dia do leilão · Janela de lance', auctionDate, 'Usar apenas os limites aprovados. Não ultrapassar o limite absoluto.'),
    make('post_auction', 'D+1 · Conferir resultado', addDays(auctionDate, 1), 'Registrar se houve arrematação, valor final, próximos pagamentos e documentos.'),
    make('payment', 'D+2 · Pagamento/comprovantes', addDays(auctionDate, 2), 'Conferir prazo de pagamento, comissão do leiloeiro e comprovantes.'),
    make('regularization', 'D+7 · Plano de regularização', addDays(auctionDate, 7), 'Definir próximos passos de registro, posse, reforma, venda ou locação.'),
  ]
}

export function loadCalendarEvents(dealId: string, opportunity?: AuctionOpportunity | null) {
  const key = dealId.trim().toUpperCase()
  const all = readAll()
  if (all[key]?.length) return decorateEventStatus(all[key])
  if (!opportunity) return []
  const defaults = buildDefaultEvents(opportunity)
  all[key] = defaults
  writeAll(all)
  return decorateEventStatus(defaults)
}

export function loadAllCalendarEvents(opportunities: AuctionOpportunity[]) {
  const all = readAll()
  const byId = new Map(opportunities.map((item) => [item.id, item]))

  for (const opportunity of opportunities) {
    if (!all[opportunity.id]?.length) all[opportunity.id] = buildDefaultEvents(opportunity)
  }

  writeAll(all)
  return Object.values(all)
    .flat()
    .filter((event) => byId.has(event.dealId))
    .map((event) => ({ ...event, status: computeStatus(event) }))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
}

export function saveCalendarEvents(dealId: string, events: LocalCalendarEvent[]) {
  const key = dealId.trim().toUpperCase()
  const all = readAll()
  all[key] = events.map((event) => ({ ...event, updatedAt: new Date().toISOString() }))
  writeAll(all)
  return decorateEventStatus(all[key])
}

export function updateCalendarEvent(dealId: string, eventIdValue: string, patch: Partial<Pick<LocalCalendarEvent, 'status' | 'dueAt' | 'description' | 'title'>>) {
  const opportunityEvents = loadCalendarEvents(dealId)
  const next = opportunityEvents.map((event) => event.id === eventIdValue ? { ...event, ...patch, updatedAt: new Date().toISOString() } : event)
  return saveCalendarEvents(dealId, next)
}

export function resetCalendarEvents(dealId: string, opportunity: AuctionOpportunity) {
  const all = readAll()
  all[dealId.trim().toUpperCase()] = buildDefaultEvents(opportunity)
  writeAll(all)
  return decorateEventStatus(all[dealId.trim().toUpperCase()])
}

function computeStatus(event: LocalCalendarEvent): CalendarEventStatus {
  if (event.status === 'done') return 'done'
  return new Date(event.dueAt).getTime() < Date.now() ? 'late' : 'pending'
}

function decorateEventStatus(events: LocalCalendarEvent[]) {
  return events.map((event) => ({ ...event, status: computeStatus(event) }))
}

export function summarizeCalendar(events: LocalCalendarEvent[]) {
  const pending = events.filter((event) => event.status === 'pending').length
  const late = events.filter((event) => event.status === 'late').length
  const done = events.filter((event) => event.status === 'done').length
  const next = events.filter((event) => event.status !== 'done').sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())[0]
  return { total: events.length, pending, late, done, next }
}
