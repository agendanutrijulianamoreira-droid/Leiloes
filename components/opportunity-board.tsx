'use client'

import { useEffect, useState } from 'react'
import { DealCard } from './deal-card'
import type { AuctionOpportunity, AuctionStatus } from '@/lib/domain'
import { statusLabel } from '@/lib/format'
import { loadLocalOpportunities, resetLocalOpportunities } from '@/lib/local-opportunities'

const columns: AuctionStatus[] = ['new', 'due_diligence', 'valuation', 'pre_bid']

export function OpportunityBoard() {
  const [items, setItems] = useState<AuctionOpportunity[]>([])

  useEffect(() => {
    setItems(loadLocalOpportunities())
  }, [])

  function reset() {
    setItems(resetLocalOpportunities())
  }

  return (
    <>
      <section className="sectionIntro withAction">
        <div>
          <span className="eyebrow">CRM DE INVESTIMENTOS</span>
          <h2>Pipeline de leilões</h2>
          <p>Cada oportunidade passa por triagem, diligência, valuation, comitê e pré-lance antes de qualquer decisão de compra.</p>
        </div>
        <button className="outline" type="button" onClick={reset}>Restaurar demo</button>
      </section>
      <div className="kanban">
        {columns.map((status) => (
          <section className="kanbanColumn" key={status}>
            <h3>{status === 'new' ? 'Novas / triagem' : statusLabel[status]}</h3>
            {items.filter((item) => item.status === status || (status === 'new' && item.status === 'screening')).map((opportunity) => (
              <DealCard key={opportunity.id} opportunity={opportunity} />
            ))}
            {items.filter((item) => item.status === status || (status === 'new' && item.status === 'screening')).length === 0 ? (
              <div className="emptyState small">Nenhuma oportunidade nesta etapa.</div>
            ) : null}
          </section>
        ))}
      </div>
    </>
  )
}
