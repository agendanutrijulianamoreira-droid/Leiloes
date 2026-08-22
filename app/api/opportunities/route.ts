import { NextResponse } from 'next/server'
import { listOpportunities } from '@/lib/opportunity-repository'

export async function GET() {
  const data = await listOpportunities()
  return NextResponse.json({ data })
}

export async function POST() {
  return NextResponse.json(
    {
      error: 'A criação via API Supabase exige autenticação e workspace ativo. Por enquanto, use o fluxo local-first ou a próxima etapa de auth/workspace.',
    },
    { status: 501 },
  )
}
