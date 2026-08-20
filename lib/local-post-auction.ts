'use client'

import type { AuctionOpportunity } from './domain'
import { loadLocalOpportunities, saveLocalOpportunities } from './local-opportunities'

const STORAGE_KEY = 'leiloes-os:post-auction:v1'

export type AuctionOutcome = 'pending' | 'won' | 'lost' | 'not_participated'
export type ExitStrategy = 'revenda' | 'locacao' | 'hold' | 'indefinida'
export type PostAuctionStage = 'resultado' | 'pagamento' | 'regularizacao' | 'posse' | 'reforma' | 'venda_locacao' | 'encerrado'

export interface PostAuctionRecord {
  dealId: string
  outcome: AuctionOutcome
  stage: PostAuctionStage
  finalBid: number
  auctioneerFee: number
  itbi: number
  registry: number
  legal: number
  debts: number
  renovation: number
  possession: number
  financialCost: number
  otherCosts: number
  actualExitValue: number
  exitStrategy: ExitStrategy
  paidAt?: string
  regularizedAt?: string
  possessionAt?: string
  soldOrRentedAt?: string
  notes: string
  updatedAt: string
}

export interface PostAuctionSummary {
  actualTotalCost: number
  projectedTotalCost: number
  actualProfit: number
  actualRoiPct: number
  costVariance: number
  costVariancePct: number
  exitVariance: number
  exitVariancePct: number
  learning: string[]
}

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function keyFor(dealId: string) {
  return dealId.trim().toUpperCase()
}

function readAll(): Record<string, PostAuctionRecord> {
  if (!canUseStorage()) return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, PostAuctionRecord>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, PostAuctionRecord>) {
  if (!canUseStorage()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function createDefaultPostAuctionRecord(opportunity: AuctionOpportunity): PostAuctionRecord {
  return {
    dealId: opportunity.id,
    outcome: 'pending',
    stage: 'resultado',
    finalBid: opportunity.currentBid || 0,
    auctioneerFee: Math.round((opportunity.currentBid || 0) * 0.05),
    itbi: 0,
    registry: 0,
    legal: 0,
    debts: 0,
    renovation: 0,
    possession: 0,
    financialCost: 0,
    otherCosts: 0,
    actualExitValue: opportunity.marketBase || 0,
    exitStrategy: 'indefinida',
    notes: '',
    updatedAt: new Date().toISOString(),
  }
}

export function loadPostAuctionRecord(dealId: string, opportunity?: AuctionOpportunity | null) {
  const all = readAll()
  const existing = all[keyFor(dealId)]
  if (existing) return existing
  return opportunity ? createDefaultPostAuctionRecord(opportunity) : null
}

export function savePostAuctionRecord(record: PostAuctionRecord) {
  const normalized = keyFor(record.dealId)
  const all = readAll()
  const nextRecord = { ...record, dealId: normalized, updatedAt: new Date().toISOString() }
  all[normalized] = nextRecord
  writeAll(all)
  syncOpportunityFromPostAuction(nextRecord)
  return nextRecord
}

export function calculatePostAuctionSummary(opportunity: AuctionOpportunity, record: PostAuctionRecord): PostAuctionSummary {
  const actualTotalCost = record.finalBid + record.auctioneerFee + record.itbi + record.registry + record.legal + record.debts + record.renovation + record.possession + record.financialCost + record.otherCosts
  const projectedTotalCost = (opportunity.currentBid || 0) + Math.max(0, (opportunity.marketBase || 0) - (opportunity.maxBidAbsolute || 0))
  const actualProfit = record.actualExitValue - actualTotalCost
  const actualRoiPct = actualTotalCost > 0 ? (actualProfit / actualTotalCost) * 100 : 0
  const costVariance = actualTotalCost - projectedTotalCost
  const costVariancePct = projectedTotalCost > 0 ? (costVariance / projectedTotalCost) * 100 : 0
  const exitVariance = record.actualExitValue - (opportunity.marketBase || 0)
  const exitVariancePct = opportunity.marketBase > 0 ? (exitVariance / opportunity.marketBase) * 100 : 0
  const learning: string[] = []

  if (record.outcome === 'lost') learning.push('Operação não arrematada: registrar preço vencedor quando disponível para calibrar competitividade.')
  if (record.outcome === 'not_participated') learning.push('Não participação registrada: preservar motivo para evitar FOMO em leilões futuros.')
  if (costVariancePct > 15) learning.push('Custos reais ficaram mais de 15% acima do previsto. Aumentar contingência em operações similares.')
  if (costVariancePct < -10) learning.push('Custos reais ficaram abaixo do previsto. Premissas conservadoras podem estar adequadas.')
  if (exitVariancePct < -10) learning.push('Valor de saída ficou abaixo do valuation base. Revisar comparáveis e liquidez da região.')
  if (actualRoiPct < 15 && record.outcome === 'won') learning.push('ROI realizado baixo para risco de leilão. Reavaliar preço máximo em teses semelhantes.')
  if (!learning.length) learning.push('Sem desvio crítico identificado. Manter histórico para calibragem futura.')

  return { actualTotalCost, projectedTotalCost, actualProfit, actualRoiPct, costVariance, costVariancePct, exitVariance, exitVariancePct, learning }
}

function syncOpportunityFromPostAuction(record: PostAuctionRecord) {
  const opportunities = loadLocalOpportunities()
  const next = opportunities.map((opportunity) => {
    if (opportunity.id !== keyFor(record.dealId)) return opportunity

    const status = record.outcome === 'won'
      ? record.stage === 'encerrado' ? 'closed' : record.stage === 'reforma' ? 'renovation' : record.stage === 'venda_locacao' ? 'sale' : 'regularization'
      : record.outcome === 'lost' || record.outcome === 'not_participated'
        ? 'lost'
        : opportunity.status

    return {
      ...opportunity,
      status,
      currentBid: record.finalBid || opportunity.currentBid,
      nextMilestone: record.outcome === 'won' ? 'Acompanhar pós-arrematação' : record.outcome === 'lost' ? 'Registrar aprendizado' : opportunity.nextMilestone,
      mainRisk: record.outcome === 'won' ? 'Operação arrematada. Risco migra para pagamento, regularização, posse e saída.' : opportunity.mainRisk,
      mainUpside: record.outcome === 'won' ? 'Operação entrou no ciclo de realização patrimonial.' : opportunity.mainUpside,
    }
  })
  saveLocalOpportunities(next)
}
