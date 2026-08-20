import Link from 'next/link'
import { CalendarDays, ChevronRight } from 'lucide-react'
import { DealCard } from '@/components/deal-card'
import { MetricCard } from '@/components/metric-card'
import { OSShell } from '@/components/os-shell'
import { opportunities, pipeline } from '@/lib/demo-data'
import { money } from '@/lib/format'

export default function Home() {
  const highPriority = opportunities.slice(0, 3)

  return (
    <OSShell title="Visão geral" eyebrow="QUARTA-FEIRA, 19 AGO 2026">
      <div className="hero">
        <div>
          <span className="pill green">● Operação ativa</span>
          <h2>Decisões melhores.<br /><em>Patrimônio maior.</em></h2>
          <p>Um centro de comando para encontrar, analisar e executar oportunidades em leilões com disciplina de risco, valuation e aprovação humana obrigatória.</p>
        </div>
        <div className="heroMetric"><span>Score médio das oportunidades</span><strong>85<span>/100</span></strong><small>↑ 7,2% vs. mês anterior</small></div>
      </div>

      <div className="metrics">
        <MetricCard label="Patrimônio monitorado" value={money(500000)} note="Base atual" />
        <MetricCard label="Capital disponível" value={money(150000)} note="Após compromissos" />
        <MetricCard label="Capital comprometido" value={money(80000)} note="Em operações" />
        <MetricCard label="Oportunidades ativas" value="23" note="8 em alta prioridade" />
      </div>

      <section className="sectionHead">
        <div><span className="eyebrow">DEAL FLOW</span><h3>Oportunidades prioritárias</h3></div>
        <Link className="textButton" href="/opportunities">Ver todas <ChevronRight size={15} /></Link>
      </section>
      <div className="cards">{highPriority.map((opportunity) => <DealCard key={opportunity.id} opportunity={opportunity} />)}</div>

      <div className="lower">
        <section className="panel">
          <div className="panelHead"><div><span className="eyebrow">PIPELINE</span><h3>Fluxo de oportunidades</h3></div></div>
          <div className="pipeline">{pipeline.map((stage) => <div key={stage.label}><strong>{stage.count}</strong><span>{stage.label}</span></div>)}</div>
        </section>
        <section className="panel">
          <div className="panelHead"><div><span className="eyebrow">AGENDA</span><h3>Próximos marcos</h3></div><CalendarDays size={18} /></div>
          <div className="events">
            <div><b>22 AGO</b><span><strong>Revisão final</strong>LEILAO-2026-0017 · 10:00</span></div>
            <div><b>25 AGO</b><span><strong>Leilão</strong>LEILAO-2026-0018 · 14:30</span></div>
          </div>
        </section>
      </div>
    </OSShell>
  )
}
