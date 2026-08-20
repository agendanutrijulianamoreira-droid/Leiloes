'use client'

import type { AuctionOpportunity } from './domain'
import { opportunities as demoOpportunities } from './demo-data'
import { calculateMaxBid } from './valuation'

const STORAGE_KEY = 'leiloes-os:opportunities:v1'

export interface LocalOpportunityInput {
  dealId: string
  title: string
  assetType?: string
  address?: string
  city?: string
  state?: string
  auctioneer?: string
  sourceUrl?: string
  currentBid?: number
  marketBase?: number
  occupancyStatus?: string
  firstDate?: string
}

export interface LocalValuationUpdate {
  marketBase: number
  marketConservative: number
  marketOptimistic: number
  currentBid: number
  maxBidAbsolute: number
  maxBidRecommended: number
  comfortBid: number
  baseRoiPct: number
}

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function normalizeDealId(value: string) {
  return value.trim().toUpperCase()
}

export function validateLocalOpportunity(input: LocalOpportunityInput) {
  const errors: Record<string, string> = {}
  const dealId = normalizeDealId(input.dealId ?? '')

  if (!dealId) errors.dealId = 'Informe o Deal ID.'
  if (dealId && !/^LEILAO-\d{4}-\d{4}$/.test(dealId)) errors.dealId = 'Use o padrão LEILAO-2026-0001.'
  if (!input.title?.trim()) errors.title = 'Informe o título do ativo.'
  if (input.currentBid !== undefined && input.currentBid < 0) errors.currentBid = 'O lance não pode ser negativo.'
  if (input.marketBase !== undefined && input.marketBase < 0) errors.marketBase = 'O valor de mercado não pode ser negativo.'

  return { valid: Object.keys(errors).length === 0, errors, dealId }
}

export function loadLocalOpportunities(): AuctionOpportunity[] {
  if (!canUseStorage()) return demoOpportunities

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return demoOpportunities
    const parsed = JSON.parse(raw) as AuctionOpportunity[]
    if (!Array.isArray(parsed)) return demoOpportunities
    return parsed
  } catch {
    return demoOpportunities
  }
}

export function saveLocalOpportunities(items: AuctionOpportunity[]) {
  if (!canUseStorage()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function getLocalOpportunity(dealId: string) {
  const normalized = normalizeDealId(dealId)
  return loadLocalOpportunities().find((item) => item.id === normalized) ?? null
}

export function updateLocalOpportunity(dealId: string, patch: Partial<AuctionOpportunity>) {
  const normalized = normalizeDealId(dealId)
  const existing = loadLocalOpportunities()
  let updated: AuctionOpportunity | null = null

  const next = existing.map((item) => {
    if (item.id !== normalized) return item
    updated = { ...item, ...patch, id: item.id }
    return updated
  })

  if (!updated) return { ok: false as const, items: existing, opportunity: null }
  saveLocalOpportunities(next)
  return { ok: true as const, items: next, opportunity: updated }
}

export function createLocalOpportunity(input: LocalOpportunityInput) {
  const validation = validateLocalOpportunity(input)
  if (!validation.valid) {
    return { ok: false as const, errors: validation.errors }
  }

  const existing = loadLocalOpportunities()
  if (existing.some((item) => item.id === validation.dealId)) {
    return { ok: false as const, errors: { dealId: 'Já existe uma oportunidade com esse Deal ID.' } }
  }

  const marketBase = Number(input.marketBase ?? 0)
  const currentBid = Number(input.currentBid ?? 0)
  const valuation = marketBase > 0 ? calculateMaxBid({ marketValue: marketBase }) : null

  const opportunity: AuctionOpportunity = {
    id: validation.dealId,
    title: input.title.trim(),
    assetType: input.assetType?.trim() || 'Ativo em leilão',
    address: input.address?.trim() || 'Endereço não informado',
    city: input.city?.trim() || 'Cidade não informada',
    state: input.state?.trim() || 'UF',
    auctioneer: input.auctioneer?.trim() || 'Leiloeiro não informado',
    status: 'new',
    currentBid,
    marketConservative: marketBase ? marketBase * 0.92 : 0,
    marketBase,
    marketOptimistic: marketBase ? marketBase * 1.08 : 0,
    maxBidAbsolute: valuation?.maxBidAbsolute ?? 0,
    maxBidRecommended: valuation?.maxBidRecommended ?? 0,
    comfortBid: valuation?.comfortBid ?? 0,
    baseRoiPct: 0,
    score: 0,
    risk: 'Médio',
    confidence: 25,
    decision: 'C — Monitorar',
    nextMilestone: 'Triagem inicial',
    nextMilestoneDate: input.firstDate || new Date().toISOString(),
    occupancyStatus: input.occupancyStatus?.trim() || 'Não confirmado',
    paymentTerms: 'Não informado',
    mainRisk: 'Oportunidade recém-cadastrada. Diligência ainda não realizada.',
    mainUpside: marketBase > 0 ? 'Valor de mercado informado permite primeira análise financeira.' : 'Tese ainda depende de valuation.',
    blockers: ['Completar documentação', 'Validar matrícula/processo', 'Confirmar ocupação e débitos'],
  }

  const next = [opportunity, ...existing]
  saveLocalOpportunities(next)
  return { ok: true as const, opportunity }
}

export function saveValuationToLocalOpportunity(dealId: string, valuation: LocalValuationUpdate) {
  const normalized = normalizeDealId(dealId)
  const existing = loadLocalOpportunities()
  let updated: AuctionOpportunity | null = null

  const next = existing.map((item) => {
    if (item.id !== normalized) return item

    const hasValuation = valuation.marketBase > 0 && valuation.maxBidAbsolute > 0
    updated = {
      ...item,
      status: item.status === 'new' || item.status === 'screening' ? 'valuation' : item.status,
      currentBid: valuation.currentBid,
      marketBase: Math.round(valuation.marketBase),
      marketConservative: Math.round(valuation.marketConservative),
      marketOptimistic: Math.round(valuation.marketOptimistic),
      maxBidAbsolute: Math.round(valuation.maxBidAbsolute),
      maxBidRecommended: Math.round(valuation.maxBidRecommended),
      comfortBid: Math.round(valuation.comfortBid),
      baseRoiPct: valuation.baseRoiPct,
      confidence: Math.max(item.confidence, hasValuation ? 45 : item.confidence),
      mainUpside: hasValuation ? 'Valuation financeiro inicial calculado e salvo no OS.' : item.mainUpside,
      blockers: item.blockers.filter((blocker) => blocker !== 'Tese ainda depende de valuation.'),
    }
    return updated
  })

  if (!updated) return { ok: false as const, items: existing, opportunity: null }
  saveLocalOpportunities(next)
  return { ok: true as const, items: next, opportunity: updated }
}

export function resetLocalOpportunities() {
  saveLocalOpportunities(demoOpportunities)
  return demoOpportunities
}
