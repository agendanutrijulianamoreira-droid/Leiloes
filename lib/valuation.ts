export type Scenario = 'pessimistic' | 'base' | 'optimistic'

export interface ValuationInput {
  marketValue: number
  commissionPct?: number
  itbi?: number
  registry?: number
  legal?: number
  debts?: number
  renovation?: number
  possession?: number
  financing?: number
  contingencyPct?: number
  targetRoiPct?: number
  monthsToExit?: number
}

export interface ValuationResult {
  fixedCosts: number
  contingency: number
  totalCostsExcludingBid: number
  maxBidAbsolute: number
  maxBidRecommended: number
  comfortBid: number
}

const pct = (value: number, percent: number) => value * (percent / 100)

/** Deterministic financial engine. Never uses an LLM for arithmetic. */
export function calculateMaxBid(input: ValuationInput): ValuationResult {
  const commission = pct(input.marketValue, input.commissionPct ?? 5)
  const fixedCosts = commission + (input.itbi ?? 0) + (input.registry ?? 0) + (input.legal ?? 0) + (input.debts ?? 0) + (input.renovation ?? 0) + (input.possession ?? 0) + (input.financing ?? 0)
  const contingency = pct(fixedCosts, input.contingencyPct ?? 10)
  const costs = fixedCosts + contingency
  const targetRoi = 1 + ((input.targetRoiPct ?? 25) / 100)
  const maxBidAbsolute = Math.max(0, (input.marketValue / targetRoi) - costs)
  const maxBidRecommended = maxBidAbsolute * 0.92
  const comfortBid = maxBidAbsolute * 0.84
  return { fixedCosts, contingency, totalCostsExcludingBid: costs, maxBidAbsolute, maxBidRecommended, comfortBid }
}

export function scenarioResult(bid: number, exitValue: number, additionalCosts: number, monthsToExit: number) {
  const totalCost = bid + additionalCosts
  const profit = exitValue - totalCost
  const roiPct = totalCost > 0 ? (profit / totalCost) * 100 : 0
  const annualizedRoiPct = monthsToExit > 0 ? ((1 + roiPct / 100) ** (12 / monthsToExit) - 1) * 100 : 0
  return { totalCost, profit, roiPct, annualizedRoiPct }
}
