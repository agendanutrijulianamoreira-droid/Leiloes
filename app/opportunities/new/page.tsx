'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { OSShell } from '@/components/os-shell'
import { createLocalOpportunity } from '@/lib/local-opportunities'

type FormState = {
  dealId: string
  title: string
  assetType: string
  address: string
  city: string
  state: string
  auctioneer: string
  currentBid: string
  marketBase: string
  occupancyStatus: string
  firstDate: string
}

const initialState: FormState = {
  dealId: 'LEILAO-2026-0020',
  title: '',
  assetType: 'Imóvel residencial',
  address: '',
  city: 'Belo Horizonte',
  state: 'MG',
  auctioneer: '',
  currentBid: '',
  marketBase: '',
  occupancyStatus: 'Não confirmado',
  firstDate: '',
}

export default function NewOpportunityPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(initialState)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const update = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  function submitOpportunity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors({})

    const result = createLocalOpportunity({
      dealId: form.dealId,
      title: form.title,
      assetType: form.assetType,
      address: form.address,
      city: form.city,
      state: form.state,
      auctioneer: form.auctioneer,
      currentBid: form.currentBid ? Number(form.currentBid) : undefined,
      marketBase: form.marketBase ? Number(form.marketBase) : undefined,
      occupancyStatus: form.occupancyStatus,
      firstDate: form.firstDate,
    })

    if (!result.ok) {
      setErrors(result.errors)
      return
    }

    router.push(`/opportunities/${result.opportunity.id}`)
  }

  return (
    <OSShell title="Nova oportunidade" eyebrow="INTAKE LOCAL-FIRST">
      <section className="sectionIntro">
        <span className="eyebrow">CADASTRO INICIAL</span>
        <h2>Adicionar oportunidade ao Deal Flow</h2>
        <p>Por enquanto, os dados ficam salvos no navegador via localStorage. Isso permite validar fluxo, telas e lógica antes de configurar Supabase, login e integrações externas.</p>
      </section>

      <form className="panel" onSubmit={submitOpportunity}>
        {Object.keys(errors).length > 0 ? <div className="formAlert error"><span>Revise os campos destacados antes de salvar.</span></div> : null}
        <div className="formGrid twoColumns">
          <label>Deal ID<input value={form.dealId} onChange={update('dealId')} placeholder="LEILAO-2026-0020" />{errors.dealId ? <small>{errors.dealId}</small> : null}</label>
          <label>Título do ativo<input value={form.title} onChange={update('title')} placeholder="Apartamento — Belo Horizonte" />{errors.title ? <small>{errors.title}</small> : null}</label>
          <label>Tipo de ativo<input value={form.assetType} onChange={update('assetType')} placeholder="Imóvel residencial" /></label>
          <label>Leiloeiro<input value={form.auctioneer} onChange={update('auctioneer')} placeholder="Nome do leiloeiro" /></label>
          <label>Endereço<input value={form.address} onChange={update('address')} placeholder="Rua, número, bairro" /></label>
          <label>Cidade<input value={form.city} onChange={update('city')} placeholder="Belo Horizonte" /></label>
          <label>UF<input value={form.state} onChange={update('state')} placeholder="MG" maxLength={2} /></label>
          <label>Situação de ocupação<input value={form.occupancyStatus} onChange={update('occupancyStatus')} placeholder="Desocupado / Ocupado / Não confirmado" /></label>
          <label>Valor de mercado base<input value={form.marketBase} onChange={update('marketBase')} type="number" min="0" placeholder="420000" />{errors.marketBase ? <small>{errors.marketBase}</small> : null}</label>
          <label>Lance atual<input value={form.currentBid} onChange={update('currentBid')} type="number" min="0" placeholder="218000" />{errors.currentBid ? <small>{errors.currentBid}</small> : null}</label>
          <label>Data do leilão<input value={form.firstDate} onChange={update('firstDate')} type="datetime-local" /></label>
        </div>

        <div className="modalActions">
          <button className="outline" type="button" onClick={() => setForm(initialState)}>Limpar</button>
          <button className="primary" type="submit">Criar oportunidade</button>
        </div>
      </form>
    </OSShell>
  )
}
