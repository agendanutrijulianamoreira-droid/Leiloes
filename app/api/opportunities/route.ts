import { NextResponse } from 'next/server'
import { listOpportunities } from '@/lib/opportunity-repository'
import { normalizeOpportunityPayload } from '@/lib/opportunity-validation'
import { getSupabaseServerClient } from '@/lib/supabase-server'

export async function GET() {
  const data = await listOpportunities()
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  }

  const { data: payload, errors } = normalizeOpportunityPayload(body)
  if (errors.length) {
    return NextResponse.json({ error: 'Dados inválidos.', details: errors }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured. Fill .env.local first.' }, { status: 503 })
  }

  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .insert({
      title: payload.title,
      asset_type: payload.assetType,
      address: payload.address,
      city: payload.city,
      state: payload.state,
      occupancy_status: payload.occupancyStatus,
    })
    .select('*')
    .single()

  if (assetError) return NextResponse.json({ error: assetError.message }, { status: 400 })

  const { data: auction, error: auctionError } = await supabase
    .from('auctions')
    .insert({
      deal_id: payload.dealId,
      asset_id: asset.id,
      auctioneer: payload.auctioneer,
      source_url: payload.sourceUrl,
      current_bid: payload.currentBid,
      opening_bid: payload.currentBid,
      market_conservative: payload.marketConservative,
      market_base: payload.marketBase,
      market_optimistic: payload.marketOptimistic,
      first_date: payload.auctionDate,
      status: 'new',
      risk: 'medium',
      confidence: 25,
      score: 0,
      decision: 'C_MONITOR',
      decision_reason: 'Oportunidade recém-cadastrada. Aguardando triagem e documentação.',
    })
    .select('*')
    .single()

  if (auctionError) return NextResponse.json({ error: auctionError.message }, { status: 400 })

  return NextResponse.json({ data: auction }, { status: 201 })
}
