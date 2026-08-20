import Link from 'next/link'
import { DealCard } from '@/components/deal-card'
import { OSShell } from '@/components/os-shell'
import { listOpportunities } from '@/lib/opportunity-repository'
import { statusLabel } from '@/lib/format'

export default async function OpportunitiesPage() {
  const opportunities = await listOpportunities()
  const columns = ['screening', 'due_diligence', 'valuation', 'pre_bid'] as const

  return (
    <OSShell title="Oportunidades" eyebrow="DEAL FLOW">
      <section className="sectionIntro actionIntro">
        <div>
          <span className="eyebrow">CRM DE INVESTIMENTOS</span>
          <h2>Pipeline de leilões</h2>
          <p>Cada oportunidade precisa passar por triagem, diligência, valuation, comitê e pré-lance antes de qualquer decisão de compra.</p>
        </div>
        <Link className="primary" href="/opportunities/new">Nova oportunidade</Link>
      </section>
      <div className="kanban">
        {columns.map((status) => {
          const items = opportunities.filter((item) => item.status === status || (status === 'screening' && item.status === 'new'))
          return (
            <section className="kanbanColumn" key={status}>
              <h3>{statusLabel[status]}</h3>
              {items.length ? items.map((opportunity) => <DealCard key={opportunity.id} opportunity={opportunity} />) : <p className="emptyState">Nenhuma oportunidade nesta etapa.</p>}
            </section>
          )
        })}
      </div>
    </OSShell>
  )
}
