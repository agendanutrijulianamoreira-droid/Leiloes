export interface OpportunityPayload {
  dealId?: string
  title?: string
  assetType?: string
  address?: string
  city?: string
  state?: string
  auctioneer?: string
  sourceUrl?: string
  currentBid?: number | string | null
  marketBase?: number | string | null
  marketConservative?: number | string | null
  marketOptimistic?: number | string | null
  occupancyStatus?: string
  auctionDate?: string
}

export interface NormalizedOpportunityPayload {
  dealId: string
  title: string
  assetType: string
  address: string | null
  city: string | null
  state: string | null
  auctioneer: string | null
  sourceUrl: string | null
  currentBid: number | null
  marketBase: number | null
  marketConservative: number | null
  marketOptimistic: number | null
  occupancyStatus: string | null
  auctionDate: string | null
}

const toText = (value: unknown) => typeof value === 'string' ? value.trim() : ''

const toNumberOrNull = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : null
}

export function normalizeOpportunityPayload(payload: OpportunityPayload) {
  const errors: string[] = []
  const dealId = toText(payload.dealId).toUpperCase()
  const title = toText(payload.title)

  if (!dealId) errors.push('Deal ID é obrigatório.')
  if (dealId && !/^LEILAO-\d{4}-\d{4,}$/.test(dealId)) errors.push('Deal ID deve seguir o padrão LEILAO-2026-0001.')
  if (!title) errors.push('Título do ativo é obrigatório.')

  const currentBid = toNumberOrNull(payload.currentBid)
  const marketBase = toNumberOrNull(payload.marketBase)
  const marketConservative = toNumberOrNull(payload.marketConservative)
  const marketOptimistic = toNumberOrNull(payload.marketOptimistic)

  if (payload.currentBid !== undefined && payload.currentBid !== '' && currentBid === null) errors.push('Lance atual deve ser um número positivo.')
  if (payload.marketBase !== undefined && payload.marketBase !== '' && marketBase === null) errors.push('Valor de mercado base deve ser um número positivo.')

  const data: NormalizedOpportunityPayload = {
    dealId,
    title,
    assetType: toText(payload.assetType) || 'Ativo',
    address: toText(payload.address) || null,
    city: toText(payload.city) || null,
    state: toText(payload.state) || null,
    auctioneer: toText(payload.auctioneer) || null,
    sourceUrl: toText(payload.sourceUrl) || null,
    currentBid,
    marketBase,
    marketConservative,
    marketOptimistic,
    occupancyStatus: toText(payload.occupancyStatus) || null,
    auctionDate: toText(payload.auctionDate) || null,
  }

  return { data, errors }
}
