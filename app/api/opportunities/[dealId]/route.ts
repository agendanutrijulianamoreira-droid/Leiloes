import { NextResponse } from 'next/server'
import { getOpportunity } from '@/lib/opportunity-repository'
import { getSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(_: Request, { params }: { params: { dealId: string } }) {
  const data = await getOpportunity(params.dealId)
  if (!data) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH(request: Request, { params }: { params: { dealId: string } }) {
  const body = await request.json().catch(() => null)
  const supabase = getSupabaseServerClient()

  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured. Fill .env.local first.' }, { status: 503 })
  }

  const allowed = ['status', 'current_bid', 'market_base', 'market_conservative', 'market_optimistic', 'max_bid_absolute', 'max_bid_recommended', 'comfort_bid', 'score', 'confidence', 'decision', 'decision_reason']
  const patch = Object.fromEntries(Object.entries(body ?? {}).filter(([key]) => allowed.includes(key)))

  const { data, error } = await supabase
    .from('auctions')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('deal_id', params.dealId)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ data })
}
