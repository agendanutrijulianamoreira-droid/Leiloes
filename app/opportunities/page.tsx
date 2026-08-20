import { DealCard } from '@/components/deal-card'
import { OSShell } from '@/components/os-shell'
import { opportunities } from '@/lib/demo-data'
import { statusLabel } from '@/lib/format'

export default function OpportunitiesPage() {
  return (
    <OSShell title="Oportunidades" eyebrow="DEAL FLOW">
      <section className="sectionIntro">
        <span className="eyebrow">CRM DE INVESTIMENTOS</span>
        <h2>Pipeline de leilões</h2>
        <p>Cada oportunidade precisa passar por triagem, diligência, valuation, comitê e pré-lance antes de qualquer decisão de compra.</p>
      </section>
      <div className="kanban">
        {['screening', 'due_diligence', 'valuation', 'pre_bid'].map((status) => (
          <section className="kanbanColumn" key={status}>
            <h3>{statusLabel[status]}</h3>
            {opportunities.filter((item) => item.status === status || (status === 'screening' && item.status === 'new')).map((opportunity) => (
              <DealCard key={opportunity.id} opportunity={opportunity} />
            ))}
          </section>
        ))}
      </div>
    </OSShell>
  )
}
