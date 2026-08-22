import type { AuctionOpportunity, AuctionStatus, Decision, RiskLevel } from './domain'

export type DbRiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type DbInvestmentDecision = 'A_APPROVE' | 'B_LIMITED' | 'C_MONITOR' | 'D_REJECT' | 'BLOCKED'

export interface OpportunityDbRow {
  id: string
  workspace_id: string
  deal_code: string
  title: string
  asset_type: string | null
  address: string | null
  city: string | null
  state: string | null
  registration_number: string | null
  process_number: string | null
  occupancy_status: string | null
  auctioneer: string | null
  source_url: string | null
  status: AuctionStatus
  first_date: string | null
  current_bid: number | string | null
  commission_pct: number | string | null
  payment_terms: string | null
  market_conservative: number | string | null
  market_base: number | string | null
  market_optimistic: number | string | null
  max_bid_absolute: number | string | null
  max_bid_recommended: number | string | null
  comfort_bid: number | string | null
  base_roi_pct: number | string | null
  opportunity_score: number | null
  risk: DbRiskLevel
  confidence_score: number | null
  decision: DbInvestmentDecision
  decision_reason: string | null
  next_milestone: string | null
  next_milestone_date: string | null
  main_risk: string | null
  main_upside: string | null
  blockers: string[] | null
}

function numeric(value: number | string | null | undefined) {
  return Number(value ?? 0)
}

export function mapDbRiskToApp(value: DbRiskLevel | null | undefined): RiskLevel {
  if (value === 'low') return 'Baixo'
  if (value === 'high') return 'Alto'
  if (value === 'critical') return 'Crítico'
  return 'Médio'
}

export function mapAppRiskToDb(value: RiskLevel): DbRiskLevel {
  if (value === 'Baixo') return 'low'
  if (value === 'Alto') return 'high'
  if (value === 'Crítico') return 'critical'
  return 'medium'
}

export function mapDbDecisionToApp(value: DbInvestmentDecision | null | undefined): Decision {
  if (value === 'A_APPROVE') return 'A — Aprovar'
  if (value === 'B_LIMITED') return 'B — Participar até limite'
  if (value === 'D_REJECT') return 'D — Rejeitar'
  if (value === 'BLOCKED') return 'Bloqueado'
  return 'C — Monitorar'
}

export function mapAppDecisionToDb(value: Decision): DbInvestmentDecision {
  if (value === 'A — Aprovar') return 'A_APPROVE'
  if (value === 'B — Participar até limite') return 'B_LIMITED'
  if (value === 'D — Rejeitar') return 'D_REJECT'
  if (value === 'Bloqueado') return 'BLOCKED'
  return 'C_MONITOR'
}

export function mapOpportunityRowToDomain(row: OpportunityDbRow): AuctionOpportunity {
  return {
    id: row.deal_code,
    title: row.title,
    assetType: row.asset_type || 'Ativo em leilão',
    address: row.address || 'Endereço não informado',
    city: row.city || 'Cidade não informada',
    state: row.state || 'UF',
    auctioneer: row.auctioneer || 'Leiloeiro não informado',
    status: row.status || 'new',
    currentBid: numeric(row.current_bid),
    marketConservative: numeric(row.market_conservative),
    marketBase: numeric(row.market_base),
    marketOptimistic: numeric(row.market_optimistic),
    maxBidAbsolute: numeric(row.max_bid_absolute),
    maxBidRecommended: numeric(row.max_bid_recommended),
    comfortBid: numeric(row.comfort_bid),
    baseRoiPct: numeric(row.base_roi_pct),
    score: Number(row.opportunity_score ?? 0),
    risk: mapDbRiskToApp(row.risk),
    confidence: Number(row.confidence_score ?? 0),
    decision: mapDbDecisionToApp(row.decision),
    nextMilestone: row.next_milestone || 'Próxima revisão',
    nextMilestoneDate: row.next_milestone_date || row.first_date || new Date().toISOString(),
    registrationNumber: row.registration_number || undefined,
    processNumber: row.process_number || undefined,
    occupancyStatus: row.occupancy_status || 'Não confirmado',
    paymentTerms: row.payment_terms || 'Não informado',
    mainRisk: row.main_risk || row.decision_reason || 'Risco ainda não consolidado.',
    mainUpside: row.main_upside || 'Tese pendente de validação.',
    blockers: Array.isArray(row.blockers) ? row.blockers : [],
  }
}
