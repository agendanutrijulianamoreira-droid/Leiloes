'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, RefreshCw, Save, TrendingUp, Wallet } from 'lucide-react'
import { MetricCard } from '@/components/metric-card'
import { OSShell } from '@/components/os-shell'
import { money, percent, statusLabel } from '@/lib/format'
import { buildPortfolioSnapshot, loadPortfolioSettings, savePortfolioSettings, type PortfolioSettings, type PortfolioSnapshot } from '@/lib/local-portfolio'

function toInputDate(value: string) {
  return new Date(value).toLocaleString('pt-BR')
}

export default function PortfolioPage() {
  const [settings, setSettings] = useState<PortfolioSettings>(() => ({
    startingNetWorth: 500000,
    liquidCapital: 150000,
    reserveCapital: 50000,
    maxAllocationPerDealPct: 20,
    notes: '',
    updatedAt: new Date().toISOString(),
  }))
  const [snapshot, setSnapshot] = useState<PortfolioSnapshot | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const loaded = loadPortfolioSettings()
    setSettings(loaded)
    setSnapshot(buildPortfolioSnapshot(loaded))
  }, [])

  const maxPerDeal = useMemo(() => settings.liquidCapital * (settings.maxAllocationPerDealPct / 100), [settings.liquidCapital, settings.maxAllocationPerDealPct])

  function updateNumber(field: keyof Pick<PortfolioSettings, 'startingNetWorth' | 'liquidCapital' | 'reserveCapital' | 'maxAllocationPerDealPct'>) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(event.target.value)
      setSettings((current) => ({ ...current, [field]: Number.isFinite(value) ? value : 0 }))
    }
  }

  function saveSettings() {
    const saved = savePortfolioSettings({
      startingNetWorth: settings.startingNetWorth,
      liquidCapital: settings.liquidCapital,
      reserveCapital: settings.reserveCapital,
      maxAllocationPerDealPct: settings.maxAllocationPerDealPct,
      notes: settings.notes,
    })
    setSettings(saved)
    setSnapshot(buildPortfolioSnapshot(saved))
    setMessage('Snapshot patrimonial atualizado localmente.')
  }

  function refreshSnapshot() {
    setSnapshot(buildPortfolioSnapshot(settings))
    setMessage('Indicadores recalculados a partir das oportunidades e pós-leilões locais.')
  }

  if (!snapshot) {
    return <OSShell title="Patrimônio" eyebrow="WEALTH ENGINE"><section className="panel"><p className="panelCopy">Carregando painel patrimonial...</p></section></OSShell>
  }

  return (
    <OSShell title="Patrimônio" eyebrow="WEALTH ENGINE">
      <section className="sectionIntro actionIntro">
        <div>
          <span className="eyebrow">PAINEL PATRIMONIAL</span>
          <h2>Crescimento ajustado ao risco</h2>
          <p>Controle local de patrimônio, capital comprometido, capital em risco, lucro realizado e carteira de ativos de leilão.</p>
        </div>
        <button className="outline" onClick={refreshSnapshot}><RefreshCw size={15} /> Recalcular</button>
      </section>

      {snapshot.concentrationWarning && <div className="formAlert error portfolioAlert"><AlertTriangle size={15} /> <span>{snapshot.concentrationWarning}</span></div>}
      {message && <div className="formAlert success portfolioAlert"><span>{message}</span></div>}

      <div className="metrics">
        <MetricCard label="Patrimônio projetado" value={money(snapshot.projectedNetWorth)} note="Patrimônio inicial + resultado" />
        <MetricCard label="Capital disponível" value={money(snapshot.availableToDeploy)} note="Líquido - reserva - comprometido" />
        <MetricCard label="Capital em risco" value={money(snapshot.capitalAtRisk)} note="Operações ativas" />
        <MetricCard label="Lucro realizado" value={money(snapshot.realizedProfit)} note="Operações encerradas" />
      </div>

      <div className="metrics portfolioMetrics">
        <MetricCard label="Valor monitorado" value={money(snapshot.monitoredValue)} note={`${snapshot.opportunities.length} oportunidades`} />
        <MetricCard label="Lucro não realizado" value={money(snapshot.unrealizedProfit)} note="Estimado em ativos ativos" />
        <MetricCard label="ROI médio" value={percent(snapshot.averageRoiPct)} note="Baseado em operações com ROI" />
        <MetricCard label="Ativos arrematados" value={String(snapshot.wonDeals)} note={`${snapshot.closedDeals} encerrados`} />
      </div>

      <div className="detailGrid">
        <section className="panel">
          <div className="panelHead"><div><span className="eyebrow">CONFIGURAÇÃO</span><h3>Premissas patrimoniais</h3></div><Wallet size={18} /></div>
          <div className="formGrid twoColumns portfolioForm">
            <label>Patrimônio líquido inicial<input type="number" value={settings.startingNetWorth} onChange={updateNumber('startingNetWorth')} /></label>
            <label>Capital líquido disponível<input type="number" value={settings.liquidCapital} onChange={updateNumber('liquidCapital')} /></label>
            <label>Reserva mínima<input type="number" value={settings.reserveCapital} onChange={updateNumber('reserveCapital')} /></label>
            <label>Limite por operação (%)<input type="number" value={settings.maxAllocationPerDealPct} onChange={updateNumber('maxAllocationPerDealPct')} /></label>
          </div>
          <label className="textAreaLabel">Notas patrimoniais<textarea value={settings.notes} onChange={(event) => setSettings((current) => ({ ...current, notes: event.target.value }))} /></label>
          <div className="portfolioRuleBox">
            <span>Limite máximo por operação</span>
            <strong>{money(maxPerDeal)}</strong>
            <small>Usado para alertar concentração excessiva.</small>
          </div>
          <div className="modalActions"><button className="primary" onClick={saveSettings}><Save size={15} /> Salvar snapshot</button></div>
        </section>

        <section className="panel">
          <div className="panelHead"><div><span className="eyebrow">REGRAS DE CRESCIMENTO</span><h3>Limites atuais</h3></div><TrendingUp size={18} /></div>
          <div className="facts">
            <div><span>Comprometimento máximo por operação</span><strong>{settings.maxAllocationPerDealPct}% do capital líquido</strong></div>
            <div><span>Reserva mínima</span><strong>{money(settings.reserveCapital)}</strong></div>
            <div><span>Alavancagem</span><strong>Bloqueada até histórico validado</strong></div>
            <div><span>Última atualização</span><strong>{toInputDate(settings.updatedAt)}</strong></div>
          </div>
          <div className="portfolioThesis">
            <span>Leitura do OS</span>
            <p>{snapshot.availableToDeploy <= 0 ? 'Capital disponível zerado ou negativo: novas operações devem ficar bloqueadas até liberar caixa.' : 'Há capital disponível, mas cada operação deve respeitar o limite por deal e as travas do comitê.'}</p>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panelHead"><div><span className="eyebrow">CARTEIRA</span><h3>Oportunidades e ativos</h3></div></div>
        <div className="portfolioTable">
          <div className="portfolioRow portfolioHead"><span>Deal</span><span>Status</span><span>Capital em risco</span><span>Valor estimado</span><span>Lucro</span><span>ROI</span></div>
          {snapshot.assets.map((asset) => (
            <div className="portfolioRow" key={asset.dealId}>
              <span><strong>{asset.dealId}</strong><small>{asset.title}</small></span>
              <span><b>{statusLabel[asset.status]}</b><small>{asset.decision}</small></span>
              <span>{money(asset.capitalAtRisk)}</span>
              <span>{money(asset.estimatedValue)}</span>
              <span>{money(asset.realizedProfit || asset.unrealizedProfit)}</span>
              <span>{percent(asset.roiPct)}</span>
            </div>
          ))}
        </div>
      </section>
    </OSShell>
  )
}
