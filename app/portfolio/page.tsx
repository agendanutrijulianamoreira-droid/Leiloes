import { MetricCard } from '@/components/metric-card'
import { OSShell } from '@/components/os-shell'
import { money } from '@/lib/format'

export default function PortfolioPage() {
  return (
    <OSShell title="Patrimônio" eyebrow="WEALTH ENGINE">
      <section className="sectionIntro">
        <span className="eyebrow">PAINEL PATRIMONIAL</span>
        <h2>Crescimento ajustado ao risco</h2>
        <p>Este módulo vai acompanhar capital disponível, capital comprometido, capital em risco, lucro realizado, ROI e aprendizado histórico.</p>
      </section>
      <div className="metrics">
        <MetricCard label="Patrimônio líquido" value={money(500000)} note="Snapshot demo" />
        <MetricCard label="Capital líquido" value={money(150000)} note="Disponível para novas operações" />
        <MetricCard label="Capital em risco" value={money(80000)} note="Em leilões e regularização" />
        <MetricCard label="Lucro realizado" value={money(0)} note="Sem operações encerradas" />
      </div>
      <section className="panel">
        <div className="panelHead"><div><span className="eyebrow">REGRAS DE CRESCIMENTO</span><h3>Limites atuais</h3></div></div>
        <div className="facts">
          <div><span>Comprometimento máximo por operação</span><strong>20% do capital disponível</strong></div>
          <div><span>Reserva mínima</span><strong>Não tocar reserva de segurança</strong></div>
          <div><span>Alavancagem</span><strong>Bloqueada até histórico validado</strong></div>
          <div><span>Exposição crítica</span><strong>Requer aprovação humana explícita</strong></div>
        </div>
      </section>
    </OSShell>
  )
}
