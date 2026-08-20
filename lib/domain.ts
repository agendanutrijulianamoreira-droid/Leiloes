export type AuctionStatus =
  | 'new'
  | 'screening'
  | 'due_diligence'
  | 'valuation'
  | 'committee'
  | 'pre_bid'
  | 'auction'
  | 'won'
  | 'lost'
  | 'regularization'
  | 'renovation'
  | 'sale'
  | 'rental'
  | 'closed'
  | 'rejected'

export type RiskLevel = 'Baixo' | 'Médio' | 'Alto' | 'Crítico'
export type Decision = 'A — Aprovar' | 'B — Participar até limite' | 'C — Monitorar' | 'D — Rejeitar' | 'Bloqueado'

export interface AuctionOpportunity {
  id: string
  title: string
  assetType: string
  address: string
  city: string
  state: string
  auctioneer: string
  status: AuctionStatus
  currentBid: number
  marketConservative: number
  marketBase: number
  marketOptimistic: number
  maxBidAbsolute: number
  maxBidRecommended: number
  comfortBid: number
  baseRoiPct: number
  score: number
  risk: RiskLevel
  confidence: number
  decision: Decision
  nextMilestone: string
  nextMilestoneDate: string
  registrationNumber?: string
  processNumber?: string
  occupancyStatus: string
  paymentTerms: string
  mainRisk: string
  mainUpside: string
  blockers: string[]
}

export interface DueDiligenceItem {
  category: string
  item: string
  status: 'pending' | 'confirmed' | 'warning' | 'blocked'
  evidence: string
  risk: RiskLevel
}
