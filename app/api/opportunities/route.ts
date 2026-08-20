import { NextResponse } from 'next/server'
import { listOpportunities } from '@/lib/opportunity-repository'
import { getSupabaseServerClient } from '@/lib/supabase-server'

export async function GET() {
  const data = await listOpportunities()
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body?.dealId || !body?.title) {
    return NextResponse.json({ error: 'dealId and title are required' }, { status: 400 })
  }

  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured. Fill .env.local first.' }, { status: 503 })
  }

  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .insert({
      title: body.title,
      asset_type: body.assetType ?? 'Ativo',
      address: body.address ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      occupancy_status: body.occupancyStatus ?? null,
    })
    .select('*')
    .single()

  if (assetError) return NextResponse.json({ error: assetError.message }, { status: 400 })

  const { data: auction, error: auctionError } = await supabase
    .from('auctions')
    .insert({
      deal_id: body.dealId,
      asset_id: asset.id,
      auctioneer: body.auctioneer ?? null,
      source_url: body.sourceUrl ?? null,
      current_bid: body.currentBid ?? null,
      opening_bid: body.openingBid ?? body.currentBid ?? null,
      market_base: body.marketBase ?? null,
      status: 'new',
    })
    .select('*')
    .single()

  if (auctionError) return NextResponse.json({ error: auctionError.message }, { status: 400 })

  return NextResponse.json({ data: auction }, { status: 201 })
}
