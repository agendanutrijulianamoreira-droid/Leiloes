'use client'

import { useState } from 'react'
import { OSShell } from '@/components/os-shell'

export default function NewOpportunityPage() {
  const [dealId, setDealId] = useState('LEILAO-2026-0020')

  return (
    <OSShell title="Nova oportunidade" eyebrow="INTAKE">
      <section className="sectionIntro">
        <span className="eyebrow">CADASTRO INICIAL</span>
        <h2>Adicionar oportunidade ao Deal Flow</h2>
        <p>Este formulário ainda usa estado local. Na próxima etapa ele será conectado ao Supabase e ao intake do Gmail.</p>
      </section>
      <section className="panel">
        <div className="formGrid twoColumns">
          <label>Deal ID<input value={dealId} onChange={(e) => setDealId(e.target.value)} /></label>
          <label>Título do ativo<input placeholder="Apartamento — Belo Horizonte" /></label>
          <label>Leiloeiro<input placeholder="Nome do leiloeiro" /></label>
          <label>URL do edital<input placeholder="https://..." /></label>
          <label>Valor de mercado estimado<input type="number" placeholder="420000" /></label>
          <label>Lance atual<input type="number" placeholder="218000" /></label>
          <label>Situação de ocupação<input placeholder="Desocupado / Ocupado / Não confirmado" /></label>
          <label>Data do leilão<input type="datetime-local" /></label>
        </div>
        <div className="modalActions"><button className="outline">Salvar rascunho</button><button className="primary">Criar oportunidade</button></div>
      </section>
    </OSShell>
  )
}
