'use client'

import type { AuctionOpportunity } from './domain'
import { loadLocalOpportunities } from './local-opportunities'
import { calculatePostAuctionSummary, loadPostAuctionRecord, type PostAuctionRecord } from './local-post-auction'

const STORAGE_KEY = 'leiloes-os:portfolio:v1'

export interface PortfolioSettings {
  startingNetWorth: number
  liquidCapital: number
  reserveCapital: number
  maxAllocationPerDealPct: number
  notes: string
  updatedAt: string
}

export interface PortfolioAssetRow {
  dealId: string
  title: string
  status: AuctionOpportunity['status']
  decision: AuctionOpportunity['decision']
  risk: AuctionOpportunity['risk']
  confidence: number
  capitalAtRisk: number
  estimatedValue: number
  unrealizedProfit: number
  realizedProfit: number
  roiPct: number
  outcome?: PostAuctionRecord['outcome']
  stage?: PostAuctionRecord['stage']
}

export interface PortfolioSnapshot {
  settings: PortfolioSettings
  opportunities: AuctionOpportunity[]
  assets: PortfolioAssetRow[]
  monitoredValue: number
  committedCapital: number
  capitalAtRisk: number
  realizedProfit: number
  unrealizedProfit: number
  projectedNetWorth: number
  availableToDeploy: number
  activeDeals: number
  wonDeals: number
  closedDeals: number
  averageRoiPct: number
  concentrationWarning: string | null
}

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function defaultSettings(): PortfolioSettings {
  return {
    startingNetWorth: 500000,
    liquidCapital: 150000,
    reserveCapital: 50000,
    maxAllocationPerDealPct: 20,
    notes: 'Configuração local inicial. Ajuste para refletir seu caixa real antes de usar como controle financeiro.',
    updatedAt: new Date().toISOString(),
  }
}

export function loadPortfolioSettings(): PortfolioSettings {
  if (!canUseStorage()) return defaultSettings()

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultSettings()
    const parsed = JSON.parse(raw) as PortfolioSettings
    return { ...defaultSettings(), ...parsed }
  } catch {
    return defaultSettings()
  }
}

export function savePortfolioSettings(input: Omit<PortfolioSettings, 'updatedAt'>) {
  const next: PortfolioSettings = { ...input, updatedAt: new Date().toISOString() }
  if (canUseStorage()) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

function isCapitalCommitted(status: AuctionOpportunity['status']) {
  return ['pre_bid', 'auction', 'won', 'regularization', 'renovation', 'sale', 'rental', 'closed'].includes(status)
}

function isAssetActive(status: AuctionOpportunity['status']) {
  return ['won', 'regularization', 'renovation', 'sale', 'rental'].includes(status)
}

export function buildPortfolioSnapshot(settings = loadPortfolioSettings()): PortfolioSnapshot {
  const opportunities = loadLocalOpportunities()

  const assets = opportunities.map((opportunity): PortfolioAssetRow => {
    const post = loadPostAuctionRecord(opportunity.id, opportunity)
    const summary = post ? calculatePostAuctionSummary(opportunity, post) : null
    const won = post?.outcome === 'won'
    const closed = won && post.stage === 'encerrado'
    const capitalAtRisk = won && summary ? summary.actualTotalCost : isCapitalCommitted(opportunity.status) ? Math.max(opportunity.currentBid, opportunity.comfortBid || 0) : 0
    const estimatedValue = won ? post.actualExitValue || opportunity.marketBase : opportunity.marketBase
    const unrealizedProfit = won && !closed && summary ? summary.actualProfit : isAssetActive(opportunity.status) ? Math.max(0, opportunity.marketBase - capitalAtRisk) : 0
    const realizedProfit = closed && summary ? summary.actualProfit : 0
    const roiPct = summary ? summary.actualRoiPct : opportunity.baseRoiPct

    return {
      dealId: opportunity.id,
      title: opportunity.title,
      status: opportunity.status,
      decision: opportunity.decision,
      risk: opportunity.risk,
      confidence: opportunity.confidence,
      capitalAtRisk,
      estimatedValue,
      unrealizedProfit,
      realizedProfit,
      roiPct,
      outcome: post?.outcome,
      stage: post?.stage,
    }
  })

  const monitoredValue = assets.reduce((sum, item) => sum + item.estimatedValue, 0)
  const committedCapital = assets.reduce((sum, item) => sum + (item.capitalAtRisk > 0 ? item.capitalAtRisk : 0), 0)
  const capitalAtRisk = assets.filter((item) => item.status !== 'closed' && item.status !== 'lost').reduce((sum, item) => sum + item.capitalAtRisk, 0)
  const realizedProfit = assets.reduce((sum, item) => sum + item.realizedProfit, 0)
  const unrealizedProfit = assets.reduce((sum, item) => sum + item.unrealizedProfit, 0)
  const projectedNetWorth = settings.startingNetWorth + realizedProfit + unrealizedProfit
  const availableToDeploy = Math.max(0, settings.liquidCapital - settings.reserveCapital - committedCapital)
  const activeDeals = opportunities.filter((item) => !['lost', 'closed', 'rejected'].includes(item.status)).length
  const wonDeals = assets.filter((item) => item.outcome === 'won').length
  const closedDeals = assets.filter((item) => item.stage === 'encerrado').length
  const roiItems = assets.filter((item) => Number.isFinite(item.roiPct) && item.roiPct !== 0)
  const averageRoiPct = roiItems.length ? roiItems.reduce((sum, item) => sum + item.roiPct, 0) / roiItems.length : 0
  const maxDealAllocation = settings.liquidCapital * (settings.maxAllocationPerDealPct / 100)
  const oversized = assets.find((item) => item.capitalAtRisk > maxDealAllocation)
  const concentrationWarning = oversized ? `${oversized.dealId} excede o limite de ${settings.maxAllocationPerDealPct}% do capital líquido.` : null

  return {
    settings,
    opportunities,
    assets,
    monitoredValue,
    committedCapital,
    capitalAtRisk,
    realizedProfit,
    unrealizedProfit,
    projectedNetWorth,
    availableToDeploy,
    activeDeals,
    wonDeals,
    closedDeals,
    averageRoiPct,
    concentrationWarning,
  }
}
