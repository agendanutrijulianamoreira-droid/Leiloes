'use client'

import { useMemo, useState } from 'react'
import { Bell, CalendarDays, ChevronRight, CircleDollarSign, FileSearch, LayoutDashboard, Plus, Radar, ShieldAlert, Target, TrendingUp, Wallet } from 'lucide-react'

const opportunities = [
  { id:'LEILAO-2026-0017', title:'Apartamento — Belo Horizonte', type:'Imóvel residencial', market:420000, bid:218000, max:265000, roi:34.8, score:86, risk:'Médio', confidence:87, status:'Pré-lance' },
  { id:'LEILAO-2026-0018', title:'Sala comercial — Contagem', type:'Comercial', market:310000, bid:162000, max:188000, roi:28.2, score:78, risk:'Médio', confidence:73, status:'Diligência' },
  { id:'LEILAO-2026-0019', title:'Casa — Nova Lima', type:'Residencial', market:680000, bid:355000, max:410000, roi:41.5, score:91, risk:'Alto', confidence:61, status:'Análise' },
]

const money = (n:number) => n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})

export default function Home() {
  const [active, setActive] = useState('Visão geral')
  const [showNew, setShowNew] = useState(false)
  const totals = useMemo(() => ({ patrimony: 500000, available:150000, committed:80000 }), [])
  const nav = [
    ['Visão geral',LayoutDashboard],['Radar',Radar],['Oportunidades',Target],['Diligência',FileSearch],['Valuation',CircleDollarSign],['Pré-lance',ShieldAlert],['Calendário',CalendarDays],['Patrimônio',Wallet]
  ] as const
  return <main className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brandMark">L</div><div><strong>LEILÕES OS</strong><span>Investment Operating System</span></div></div>
      <nav>{nav.map(([label,Icon])=><button key={label} className={active===label?'nav active':'nav'} onClick={()=>setActive(label)}><Icon size={17}/>{label}</button>)}</nav>
      <div className="sidebarBottom"><div className="statusDot"/> Sistema operacional <span>v0.1</span></div>
    </aside>
    <section className="content">
      <header className="topbar"><div><div className="eyebrow">QUARTA-FEIRA, 19 AGO 2026</div><h1>{active}</h1></div><div className="topActions"><button className="iconButton"><Bell size={18}/></button><button className="primary" onClick={()=>setShowNew(true)}><Plus size={17}/> Nova oportunidade</button></div></header>
      <div className="hero"><div><span className="pill green">● Operação ativa</span><h2>Decisões melhores.<br/><em>Patrimônio maior.</em></h2><p>Um centro de comando para encontrar, analisar e executar oportunidades em leilões com disciplina de risco.</p></div><div className="heroMetric"><span>Score médio das oportunidades</span><strong>85<span>/100</span></strong><small>↑ 7,2% vs. mês anterior</small></div></div>
      <div className="metrics">
        {[['Patrimônio monitorado',money(totals.patrimony),'Base atual'],['Capital disponível',money(totals.available),'Após compromissos'],['Capital comprometido',money(totals.committed),'Em operações'],['Oportunidades ativas','23','8 em alta prioridade']].map(([a,b,c],i)=><div className="metric" key={a}><span>{a}</span><strong>{b}</strong><small>{i===0?<TrendingUp size={13}/>:null}{c}</small></div>)}
      </div>
      <section className="sectionHead"><div><span className="eyebrow">DEAL FLOW</span><h3>Oportunidades prioritárias</h3></div><button className="textButton">Ver todas <ChevronRight size={15}/></button></section>
      <div className="cards">{opportunities.map(o=><article className="deal" key={o.id}><div className="dealTop"><span className="dealType">{o.type}</span><span className={'risk '+o.risk.toLowerCase()}>{o.risk}</span></div><h4>{o.title}</h4><small className="muted">{o.id}</small><div className="dealGrid"><div><span>Mercado</span><b>{money(o.market)}</b></div><div><span>Lance atual</span><b>{money(o.bid)}</b></div><div><span>Limite máximo</span><b>{money(o.max)}</b></div><div><span>ROI base</span><b>{o.roi}%</b></div></div><div className="dealFooter"><div><div className="progress"><i style={{width:`${o.score}%`}}/></div><span>Score {o.score}/100 · Confiança {o.confidence}%</span></div><button className="outline">Analisar <ChevronRight size={14}/></button></div></article>)}</div>
      <div className="lower"><section className="panel"><div className="panelHead"><div><span className="eyebrow">PIPELINE</span><h3>Fluxo de oportunidades</h3></div></div><div className="pipeline">{[['Novas','8'],['Triagem','12'],['Diligência','5'],['Valuation','3'],['Aprovadas','2']].map(x=><div key={x[0]}><strong>{x[1]}</strong><span>{x[0]}</span></div>)}</div></section><section className="panel"><div className="panelHead"><div><span className="eyebrow">AGENDA</span><h3>Próximos marcos</h3></div><CalendarDays size={18}/></div><div className="events"><div><b>22 AGO</b><span><strong>Revisão final</strong>LEILAO-2026-0017 · 10:00</span></div><div><b>25 AGO</b><span><strong>Leilão</strong>LEILAO-2026-0018 · 14:30</span></div></div></section></div>
    </section>
    {showNew&&<div className="modalBackdrop" onClick={()=>setShowNew(false)}><div className="modal" onClick={e=>e.stopPropagation()}><span className="eyebrow">NOVA OPORTUNIDADE</span><h2>Adicionar ao Deal Flow</h2><p>O próximo passo será conectar esta entrada ao banco e ao Gmail.</p><input placeholder="Nome do ativo / lote"/><input placeholder="URL do edital"/><div className="modalActions"><button className="outline" onClick={()=>setShowNew(false)}>Cancelar</button><button className="primary" onClick={()=>setShowNew(false)}>Criar oportunidade</button></div></div></div>}
  </main>
}
