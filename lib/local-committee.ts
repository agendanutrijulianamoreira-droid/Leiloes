'use client'

import type { AuctionOpportunity, AuctionStatus, Decision } from './domain'
import { loadLocalDiligence, summarizeDiligence } from './local-diligence'
import { getLocalOpportunity, loadLocalOpportunities, saveLocalOpportunities } from './local-opportunities'

const STORAGE_KEY = 'leiloes-os:committee:v1'

export type CommitteeDecision = Decision

export interface CommitteeMemo {
  dealId: string
  decision: CommitteeDecision
  thesis: string
  rationale: string
  riskNotes: string
  approvedBy: string
  decidedAt: string
  hardBlockers: string[]
}

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function keyFor(dealId: string) {
  return dealId.trim().toUpperCase()
}

function readAll(): Record<string, CommitteeMemo> {
  if (!canUseStorage()) return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, CommitteeMemo>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, CommitteeMemo>) {
  if (!canUseStorage()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function loadCommitteeMemo(dealId: string) {
  return readAll()[keyFor(dealId)] ?? null
}

export function evaluateCommitteeBlockers(opportunity: AuctionOpportunity) {
  const diligence = loadLocalDiligence(opportunity.id)
  const summary = summarizeDiligence(diligence)
  const blockers: string[] = []

  if (summary.blocked > 0) blockers.push('Existe item de diligência marcado como bloqueio.')
  if (summary.highestRisk === 'Crítico') blockers.push('Risco crítico identificado na diligência.')
  if (summary.completionPct < 60) blockers.push('Diligência abaixo de 60% de conclusão.')
  if (!opportunity.maxBidAbsolute || opportunity.maxBidAbsolute <= 0) blockers.push('Valuation ainda não gerou limite absoluto válido.')
  if (opportunity.currentBid > opportunity.maxBidAbsolute && opportunity.maxBidAbsolute > 0) blockers.push('Lance atual acima do limite absoluto matemático.')
  if (opportunity.confidence < 50) blockers.push('Confiança abaixo de 50%.')

  return { blockers, diligenceSummary: summary }
}

function resolveCommitteeStatus(decision: CommitteeDecision): AuctionStatus {
  if (decision === 'A — Aprovar' || decision === 'B — Participar até limite') return 'pre_bid'
  if (decision === 'D — Rejeitar' || decision === 'Bloqueado') return 'rejected'
  return 'committee'
}

export function saveCommitteeMemo(input: Omit<CommitteeMemo, 'decidedAt' | 'hardBlockers'>) {
  const opportunity = getLocalOpportunity(input.dealId)
  if (!opportunity) return { ok: false as const, error: 'Oportunidade não encontrada.' }

  const { blockers } = evaluateCommitteeBlockers(opportunity)
  const forcedDecision: CommitteeDecision = blockers.length > 0 && (input.decision === 'A — Aprovar' || input.decision === 'B — Participar até limite') ? 'Bloqueado' : input.decision
  const memo: CommitteeMemo = {
    ...input,
    decision: forcedDecision,
    hardBlockers: blockers,
    decidedAt: new Date().toISOString(),
  }

  const allMemos = readAll()
  allMemos[keyFor(input.dealId)] = memo
  writeAll(allMemos)

  const existing = loadLocalOpportunities()
  const next: AuctionOpportunity[] = existing.map((item): AuctionOpportunity => {
    if (item.id !== keyFor(input.dealId)) return item
    const approved = forcedDecision === 'A — Aprovar' || forcedDecision === 'B — Participar até limite'
    return {
      ...item,
      decision: forcedDecision,
      status: resolveCommitteeStatus(forcedDecision),
      mainRisk: input.riskNotes || item.mainRisk,
      mainUpside: input.thesis || item.mainUpside,
      blockers: forcedDecision === 'Bloqueado' ? [...new Set([...item.blockers, ...blockers])] : item.blockers,
      confidence: Math.max(item.confidence, approved ? 70 : 55),
    }
  })
  saveLocalOpportunities(next)

  return { ok: true as const, memo }
}

export function clearCommitteeMemo(dealId: string) {
  const all = readAll()
  delete all[keyFor(dealId)]
  writeAll(all)
}
