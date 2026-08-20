import { CalendarDays } from 'lucide-react'
import { OSShell } from '@/components/os-shell'
import { opportunities } from '@/lib/demo-data'

export default function CalendarPage() {
  return (
    <OSShell title="Calendário" eyebrow="MARCOS E PRAZOS">
      <section className="sectionIntro">
        <span className="eyebrow">CONTROLE DE ERRO</span>
        <h2>Prazos críticos</h2>
        <p>O Calendar deve virar uma camada de prevenção: revisão documental, pré-lance, pagamento, registro, desocupação e saída.</p>
      </section>
      <section className="panel">
        <div className="panelHead"><div><span className="eyebrow">AGENDA</span><h3>Próximos eventos</h3></div><CalendarDays size={18} /></div>
        <div className="events">
          {opportunities.map((opportunity) => (
            <div key={opportunity.id}><b>{new Date(opportunity.nextMilestoneDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase()}</b><span><strong>{opportunity.nextMilestone}</strong>{opportunity.id} · {opportunity.title}</span></div>
          ))}
        </div>
      </section>
    </OSShell>
  )
}
