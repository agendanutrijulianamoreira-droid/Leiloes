'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { OSShell } from '@/components/os-shell'

type FormState = {
  dealId: string
  title: string
  assetType: string
  address: string
  city: string
  state: string
  auctioneer: string
  sourceUrl: string
  currentBid: string
  marketBase: string
  occupancyStatus: string
  auctionDate: string
}

const initialState: FormState = {
  dealId: 'LEILAO-2026-0020',
  title: '',
  assetType: 'Imóvel residencial',
  address: '',
  city: '',
  state: 'MG',
  auctioneer: '',
  sourceUrl: '',
  currentBid: '',
  marketBase: '',
  occupancyStatus: 'Não confirmado',
  auctionDate: '',
}

export default function NewOpportunityPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(initialState)
  const [errors, setErrors] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState('')

  const canSubmit = useMemo(() => form.dealId.trim() && form.title.trim(), [form.dealId, form.title])

  const update = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  async function submitOpportunity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors([])
    setSuccess('')
    setIsSubmitting(true)

    const response = await fetch('/api/opportunities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        currentBid: form.currentBid ? Number(form.currentBid) : null,
        marketBase: form.marketBase ? Number(form.marketBase) : null,
      }),
    })

    const payload = await response.json().catch(() => ({}))
    setIsSubmitting(false)

    if (!response.ok) {
      setErrors(payload.details ?? [payload.error ?? 'Não foi possível criar a oportunidade.'])
      return
    }

    setSuccess('Oportunidade criada com sucesso.')
    router.push(`/opportunities/${form.dealId.trim().toUpperCase()}`)
  }

  return (
    <OSShell title="Nova oportunidade" eyebrow="INTAKE">
      <section className="sectionIntro">
        <span className="eyebrow">CADASTRO INICIAL</span>
        <h2>Adicionar oportunidade ao Deal Flow</h2>
        <p>Cadastre o mínimo necessário para iniciar a triagem. A oportunidade nasce como monitoramento até receber documentos, diligência e valuation.</p>
      </section>

      <form className="panel" onSubmit={submitOpportunity}>
        <div className="formGrid twoColumns">
          <label>Deal ID<input value={form.dealId} onChange={update('dealId')} placeholder="LEILAO-2026-0020" /></label>
          <label>Título do ativo<input value={form.title} onChange={update('title')} placeholder="Apartamento — Belo Horizonte" /></label>
          <label>Tipo de ativo<input value={form.assetType} onChange={update('assetType')} placeholder="Imóvel residencial" /></label>
          <label>Leiloeiro<input value={form.auctioneer} onChange={update('auctioneer')} placeholder="Nome do leiloeiro" /></label>
          <label>Endereço<input value={form.address} onChange={update('address')} placeholder="Rua, número, bairro" /></label>
          <label>Cidade<input value={form.city} onChange={update('city')} placeholder="Belo Horizonte" /></label>
          <label>UF<input value={form.state} onChange={update('state')} placeholder="MG" maxLength={2} /></label>
          <label>URL do edital<input value={form.sourceUrl} onChange={update('sourceUrl')} placeholder="https://..." /></label>
          <label>Valor de mercado base<input value={form.marketBase} onChange={update('marketBase')} type="number" min="0" placeholder="420000" /></label>
          <label>Lance atual<input value={form.currentBid} onChange={update('currentBid')} type="number" min="0" placeholder="218000" /></label>
          <label>Situação de ocupação<input value={form.occupancyStatus} onChange={update('occupancyStatus')} placeholder="Desocupado / Ocupado / Não confirmado" /></label>
          <label>Data do leilão<input value={form.auctionDate} onChange={update('auctionDate')} type="datetime-local" /></label>
        </div>

        {errors.length > 0 && <div className="formAlert error">{errors.map((error) => <span key={error}>{error}</span>)}</div>}
        {success && <div className="formAlert success"><span>{success}</span></div>}

        <div className="modalActions">
          <button className="outline" type="button" onClick={() => setForm(initialState)}>Limpar</button>
          <button className="primary" disabled={!canSubmit || isSubmitting} type="submit">{isSubmitting ? 'Criando...' : 'Criar oportunidade'}</button>
        </div>
      </form>
    </OSShell>
  )
}
