import { OSShell } from '@/components/os-shell'

export default function RadarPage() {
  return (
    <OSShell title="Radar" eyebrow="CAPTURA DE OPORTUNIDADES">
      <section className="sectionIntro">
        <span className="eyebrow">RADAR</span>
        <h2>Fontes de oportunidades</h2>
        <p>Este módulo vai concentrar leiloeiros, e-mails recebidos, editais, URLs monitoradas e oportunidades novas para triagem.</p>
      </section>
      <div className="cards">
        {['Gmail de leiloeiros', 'Sites de leilão', 'Editais públicos'].map((source) => (
          <article className="deal" key={source}>
            <div className="dealTop"><span className="dealType">Fonte</span><span className="risk baixo">Ativa</span></div>
            <h4>{source}</h4>
            <p className="panelCopy">Conector planejado para a próxima fase do OS.</p>
          </article>
        ))}
      </div>
    </OSShell>
  )
}
