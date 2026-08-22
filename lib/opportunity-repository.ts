import type { AuctionOpportunity } from './domain'
import { opportunities } from './demo-data'
import { getSupabaseServerClient } from './supabase-server'
import { mapOpportunityRowToDomain, type OpportunityDbRow } from './supabase-mappers'

export async function listOpportunities(): Promise<AuctionOpportunity[]> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return opportunities

  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[LeiloesOS] Supabase listOpportunities failed', error)
    return opportunities
  }

  return (data ?? []).map((row) => mapOpportunityRowToDomain(row as OpportunityDbRow))
}

export async function getOpportunity(dealId: string): Promise<AuctionOpportunity | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return opportunities.find((item) => item.id === dealId) ?? null

  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('deal_code', dealId.trim().toUpperCase())
    .maybeSingle()

  if (error) {
    console.error('[LeiloesOS] Supabase getOpportunity failed', error)
    return opportunities.find((item) => item.id === dealId) ?? null
  }

  return data ? mapOpportunityRowToDomain(data as OpportunityDbRow) : null
}
