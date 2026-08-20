import Link from 'next/link'
import { OpportunityBoard } from '@/components/opportunity-board'
import { OSShell } from '@/components/os-shell'

export default function OpportunitiesPage() {
  return (
    <OSShell title="Oportunidades" eyebrow="DEAL FLOW LOCAL">
      <section className="sectionIntro actionIntro">
        <div>
          <span className="eyebrow">CRM DE INVESTIMENTOS</span>
          <h2>Pipeline de leilões</h2>
          <p>Modo local-first: cadastre, edite o fluxo e teste decisões sem configurar Supabase. Os dados ficam no navegador.</p>
        </div>
        <Link className="primary" href="/opportunities/new">Nova oportunidade</Link>
      </section>
      <OpportunityBoard />
    </OSShell>
  )
}
