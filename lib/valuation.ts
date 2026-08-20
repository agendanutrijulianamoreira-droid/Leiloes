export type Scenario = 'pessimistic' | 'base' | 'optimistic'
export type BidStatus = 'comfort' | 'acceptable' | 'above_recommended' | 'blocked'

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

export interface ScenarioOutput {
  scenario: Scenario
  bid: number
  exitValue: number
  additionalCosts: number
  totalCost: number
  profit: number
  roiPct: number
  monthsToExit: number
  annualizedRoiPct: number
}

const pct = (value: number, percent: number) => value * (percent / 100)
const roundMoney = (value: number) => Math.round(value)

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

  return {
    fixedCosts: roundMoney(fixedCosts),
    contingency: roundMoney(contingency),
    totalCostsExcludingBid: roundMoney(costs),
    maxBidAbsolute: roundMoney(maxBidAbsolute),
    maxBidRecommended: roundMoney(maxBidRecommended),
    comfortBid: roundMoney(comfortBid),
  }
}

export function scenarioResult(scenario: Scenario, bid: number, exitValue: number, additionalCosts: number, monthsToExit: number): ScenarioOutput {
  const totalCost = bid + additionalCosts
  const profit = exitValue - totalCost
  const roiPct = totalCost > 0 ? (profit / totalCost) * 100 : 0
  const annualizedRoiPct = monthsToExit > 0 ? ((1 + roiPct / 100) ** (12 / monthsToExit) - 1) * 100 : 0
  return { scenario, bid, exitValue, additionalCosts, totalCost, profit, roiPct, monthsToExit, annualizedRoiPct }
}

export function buildScenarioSet(input: { bid: number; conservativeValue: number; baseValue: number; optimisticValue: number; baseAdditionalCosts: number }) {
  return [
    scenarioResult('pessimistic', input.bid, input.conservativeValue * 0.95, input.baseAdditionalCosts * 1.2, 14),
    scenarioResult('base', input.bid, input.baseValue, input.baseAdditionalCosts, 9),
    scenarioResult('optimistic', input.bid, input.optimisticValue, input.baseAdditionalCosts * 0.9, 6),
  ]
}

export function classifyBid(currentBid: number, limits: Pick<ValuationResult, 'comfortBid' | 'maxBidRecommended' | 'maxBidAbsolute'>): { status: BidStatus; label: string; message: string } {
  if (currentBid <= limits.comfortBid) return { status: 'comfort', label: 'Dentro da faixa de conforto', message: 'O lance atual ainda preserva margem ampla de segurança.' }
  if (currentBid <= limits.maxBidRecommended) return { status: 'acceptable', label: 'Ainda aceitável', message: 'O lance está acima do conforto, mas dentro do limite recomendado.' }
  if (currentBid <= limits.maxBidAbsolute) return { status: 'above_recommended', label: 'Acima do recomendado', message: 'Participar só com justificativa forte e validação das pendências.' }
  return { status: 'blocked', label: 'Bloqueado', message: 'Não participar: lance acima do preço máximo matemático.' }
}

export function hasHardBlockers(input: { risk: string; blockers: string[]; currentBid: number; maxBidAbsolute: number }) {
  return input.risk === 'Crítico' || input.blockers.length > 0 || input.currentBid > input.maxBidAbsolute
}
