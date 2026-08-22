import { NextResponse } from 'next/server'
import { getOpportunity } from '@/lib/opportunity-repository'

export async function GET(_: Request, { params }: { params: { dealId: string } }) {
  const data = await getOpportunity(params.dealId)
  if (!data) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PATCH() {
  return NextResponse.json(
    {
      error: 'A edição via API Supabase exige autenticação, workspace ativo e políticas de autorização. Por enquanto, use o fluxo local-first ou a próxima etapa de auth/workspace.',
    },
    { status: 501 },
  )
}
