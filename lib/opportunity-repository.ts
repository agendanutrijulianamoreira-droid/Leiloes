import type { AuctionOpportunity } from './domain'
import { opportunities } from './demo-data'
import { getSupabaseServerClient } from './supabase-server'

function mapAuctionRow(row: Record<string, any>): AuctionOpportunity {
  return {
    id: row.deal_id,
    title: row.assets?.title ?? row.title ?? row.deal_id,
    assetType: row.assets?.asset_type ?? 'Ativo',
    address: row.assets?.address ?? '',
    city: row.assets?.city ?? '',
    state: row.assets?.state ?? '',
    auctioneer: row.auctioneer ?? '',
    status: row.status ?? 'new',
    currentBid: Number(row.current_bid ?? row.opening_bid ?? 0),
    marketConservative: Number(row.market_conservative ?? 0),
    marketBase: Number(row.market_base ?? 0),
    marketOptimistic: Number(row.market_optimistic ?? 0),
    maxBidAbsolute: Number(row.max_bid_absolute ?? 0),
    maxBidRecommended: Number(row.max_bid_recommended ?? 0),
    comfortBid: Number(row.comfort_bid ?? 0),
    baseRoiPct: Number(row.base_roi_pct ?? 0),
    score: Number(row.score ?? 0),
    risk: row.risk === 'low' ? 'Baixo' : row.risk === 'high' ? 'Alto' : row.risk === 'critical' ? 'Crítico' : 'Médio',
    confidence: Number(row.confidence ?? 0),
    decision: row.decision === 'A_APPROVE' ? 'A — Aprovar' : row.decision === 'B_LIMITED' ? 'B — Participar até limite' : row.decision === 'D_REJECT' ? 'D — Rejeitar' : row.decision === 'BLOCKED' ? 'Bloqueado' : 'C — Monitorar',
    nextMilestone: 'Próxima revisão',
    nextMilestoneDate: row.first_date ?? new Date().toISOString(),
    registrationNumber: row.assets?.registration_number,
    processNumber: row.assets?.process_number,
    occupancyStatus: row.assets?.occupancy_status ?? 'Não confirmado',
    paymentTerms: row.payment_terms ?? 'Não informado',
    mainRisk: row.decision_reason ?? 'Risco ainda não consolidado.',
    mainUpside: 'Tese pendente de validação.',
    blockers: [],
  }
}

export async function listOpportunities(): Promise<AuctionOpportunity[]> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return opportunities

  const { data, error } = await supabase
    .from('auctions')
    .select('*, assets(*)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[LeiloesOS] Supabase listOpportunities failed', error)
    return opportunities
  }

  return (data ?? []).map(mapAuctionRow)
}

export async function getOpportunity(dealId: string): Promise<AuctionOpportunity | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return opportunities.find((item) => item.id === dealId) ?? null

  const { data, error } = await supabase
    .from('auctions')
    .select('*, assets(*)')
    .eq('deal_id', dealId)
    .maybeSingle()

  if (error) {
    console.error('[LeiloesOS] Supabase getOpportunity failed', error)
    return opportunities.find((item) => item.id === dealId) ?? null
  }

  return data ? mapAuctionRow(data) : null
}
