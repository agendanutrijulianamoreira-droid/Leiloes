'use client'

import { createLocalOpportunity } from './local-opportunities'

const STORAGE_KEY = 'leiloes-os:radar:v1'

export type RadarStatus = 'watching' | 'triage' | 'promoted' | 'discarded'
export type RadarSourceType = 'leiloeiro' | 'site' | 'email' | 'edital' | 'indicacao' | 'outro'

export interface RadarLead {
  id: string
  title: string
  sourceName: string
  sourceType: RadarSourceType
  url: string
  city: string
  state: string
  assetType: string
  estimatedMarketValue: number
  openingBid: number
  auctionDate: string
  status: RadarStatus
  priority: 'baixa' | 'media' | 'alta'
  notes: string
  createdAt: string
  promotedDealId?: string
}

export interface RadarLeadInput {
  title: string
  sourceName: string
  sourceType: RadarSourceType
  url?: string
  city?: string
  state?: string
  assetType?: string
  estimatedMarketValue?: number
  openingBid?: number
  auctionDate?: string
  priority?: RadarLead['priority']
  notes?: string
}

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function makeId() {
  return `RADAR-${Date.now().toString(36).toUpperCase()}`
}

function readAll(): RadarLead[] {
  if (!canUseStorage()) return demoRadarLeads
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return demoRadarLeads
    const parsed = JSON.parse(raw) as RadarLead[]
    return Array.isArray(parsed) ? parsed : demoRadarLeads
  } catch {
    return demoRadarLeads
  }
}

function writeAll(items: RadarLead[]) {
  if (!canUseStorage()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export const demoRadarLeads: RadarLead[] = [
  {
    id: 'RADAR-DEMO-001',
    title: 'Apartamento 2 quartos — Pampulha',
    sourceName: 'Leiloeira Modelo',
    sourceType: 'site',
    url: 'https://exemplo.com/leilao/apto-pampulha',
    city: 'Belo Horizonte',
    state: 'MG',
    assetType: 'Imóvel residencial',
    estimatedMarketValue: 410000,
    openingBid: 205000,
    auctionDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    status: 'triage',
    priority: 'alta',
    notes: 'Desconto aparente relevante. Precisa confirmar matrícula e ocupação.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'RADAR-DEMO-002',
    title: 'Sala comercial — Região metropolitana',
    sourceName: 'Central de Leilões',
    sourceType: 'email',
    url: '',
    city: 'Contagem',
    state: 'MG',
    assetType: 'Comercial',
    estimatedMarketValue: 290000,
    openingBid: 180000,
    auctionDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    status: 'watching',
    priority: 'media',
    notes: 'Liquidez comercial precisa ser validada antes de virar deal.',
    createdAt: new Date().toISOString(),
  },
]

export function loadRadarLeads() {
  return readAll()
}

export function saveRadarLeads(items: RadarLead[]) {
  writeAll(items)
  return items
}

export function createRadarLead(input: RadarLeadInput) {
  const title = input.title?.trim()
  const sourceName = input.sourceName?.trim()
  const errors: Record<string, string> = {}

  if (!title) errors.title = 'Informe o título da oportunidade.'
  if (!sourceName) errors.sourceName = 'Informe a fonte/leiloeiro.'

  if (Object.keys(errors).length) return { ok: false as const, errors }

  const lead: RadarLead = {
    id: makeId(),
    title,
    sourceName,
    sourceType: input.sourceType ?? 'site',
    url: input.url?.trim() ?? '',
    city: input.city?.trim() ?? '',
    state: input.state?.trim() || 'MG',
    assetType: input.assetType?.trim() || 'Ativo em leilão',
    estimatedMarketValue: Number(input.estimatedMarketValue ?? 0),
    openingBid: Number(input.openingBid ?? 0),
    auctionDate: input.auctionDate || '',
    status: 'watching',
    priority: input.priority ?? 'media',
    notes: input.notes?.trim() ?? '',
    createdAt: new Date().toISOString(),
  }

  const next = [lead, ...readAll()]
  writeAll(next)
  return { ok: true as const, lead, items: next }
}

export function updateRadarLead(id: string, patch: Partial<RadarLead>) {
  let updated: RadarLead | null = null
  const next = readAll().map((lead) => {
    if (lead.id !== id) return lead
    updated = { ...lead, ...patch }
    return updated
  })
  writeAll(next)
  return { ok: Boolean(updated), lead: updated, items: next }
}

export function promoteRadarLead(id: string) {
  const leads = readAll()
  const lead = leads.find((item) => item.id === id)
  if (!lead) return { ok: false as const, error: 'Lead não encontrado.' }

  const year = new Date().getFullYear()
  const dealId = `LEILAO-${year}-${String(Date.now()).slice(-4)}`
  const created = createLocalOpportunity({
    dealId,
    title: lead.title,
    assetType: lead.assetType,
    city: lead.city,
    state: lead.state,
    auctioneer: lead.sourceName,
    sourceUrl: lead.url,
    currentBid: lead.openingBid,
    marketBase: lead.estimatedMarketValue,
    firstDate: lead.auctionDate ? new Date(lead.auctionDate).toISOString() : undefined,
  })

  if (!created.ok) return { ok: false as const, error: Object.values(created.errors)[0] ?? 'Não foi possível promover.' }

  const next = leads.map((item) => item.id === id ? { ...item, status: 'promoted' as const, promotedDealId: dealId } : item)
  writeAll(next)
  return { ok: true as const, dealId, items: next }
}

export function summarizeRadar(items: RadarLead[]) {
  return {
    total: items.length,
    watching: items.filter((item) => item.status === 'watching').length,
    triage: items.filter((item) => item.status === 'triage').length,
    promoted: items.filter((item) => item.status === 'promoted').length,
    discarded: items.filter((item) => item.status === 'discarded').length,
    highPriority: items.filter((item) => item.priority === 'alta' && item.status !== 'discarded').length,
  }
}

export function resetRadarLeads() {
  writeAll(demoRadarLeads)
  return demoRadarLeads
}
