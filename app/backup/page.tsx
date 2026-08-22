'use client'

import { useMemo, useState } from 'react'
import { Download, RefreshCw, Trash2, Upload } from 'lucide-react'
import { OSShell } from '@/components/os-shell'
import { clearLocalBackupData, downloadLocalBackup, exportLocalBackup, importLocalBackup, listLeiloesStorageKeys, validateBackupPayload } from '@/lib/local-backup'

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

export default function BackupPage() {
  const [keys, setKeys] = useState<string[]>(() => listLeiloesStorageKeys())
  const [jsonInput, setJsonInput] = useState('')
  const [message, setMessage] = useState('')
  const [preview, setPreview] = useState(() => exportLocalBackup())

  const backupSize = useMemo(() => formatBytes(JSON.stringify(preview).length), [preview])

  function refresh() {
    setKeys(listLeiloesStorageKeys())
    setPreview(exportLocalBackup())
    setMessage('Diagnóstico local atualizado.')
  }

  function download() {
    const payload = downloadLocalBackup()
    setPreview(payload)
    setMessage('Backup exportado em JSON.')
  }

  function importBackup() {
    try {
      const parsed = JSON.parse(jsonInput)
      if (!validateBackupPayload(parsed)) {
        setMessage('Arquivo inválido: este JSON não parece ser um backup do Leilões OS.')
        return
      }
      const result = importLocalBackup(parsed)
      setMessage(result.message)
      refresh()
    } catch {
      setMessage('JSON inválido. Copie o conteúdo completo do arquivo de backup.')
    }
  }

  function clearData() {
    const removed = clearLocalBackupData()
    setJsonInput('')
    refresh()
    setMessage(`${removed} registros locais removidos deste navegador.`)
  }

  return (
    <OSShell title="Backup local" eyebrow="LOCAL-FIRST">
      <section className="sectionIntro actionIntro">
        <div>
          <span className="eyebrow">EXPORTAR E RESTAURAR</span>
          <h2>Backup dos dados do navegador</h2>
          <p>Enquanto o sistema estiver sem Supabase, os dados ficam no localStorage. Exporte um JSON antes de trocar de computador, limpar navegador ou testar mudanças grandes.</p>
        </div>
        <button className="outline" type="button" onClick={refresh}><RefreshCw size={15} /> Atualizar</button>
      </section>

      {message && <div className={message.includes('inválido') ? 'formAlert error backupMessage' : 'formAlert success backupMessage'}><span>{message}</span></div>}

      <div className="metrics backupMetrics">
        <div className="metric"><span>Chaves locais</span><strong>{keys.length}</strong><small>Registros do Leilões OS</small></div>
        <div className="metric"><span>Tamanho estimado</span><strong>{backupSize}</strong><small>JSON exportável</small></div>
        <div className="metric"><span>Versão</span><strong>{preview.version}</strong><small>{new Date(preview.exportedAt).toLocaleString('pt-BR')}</small></div>
        <div className="metric"><span>Ambiente</span><strong>Local-first</strong><small>Sem Supabase</small></div>
      </div>

      <div className="detailGrid">
        <section className="panel">
          <div className="panelHead"><div><span className="eyebrow">EXPORTAÇÃO</span><h3>Baixar backup</h3></div><Download size={18} /></div>
          <p className="panelCopy">O arquivo contém Radar, oportunidades, diligência, valuation, comitê, calendário, pós-leilão e patrimônio salvos neste navegador.</p>
          <div className="backupKeyList">
            {keys.length ? keys.map((key) => <code key={key}>{key}</code>) : <div className="emptyState">Nenhum dado local encontrado ainda.</div>}
          </div>
          <div className="modalActions"><button className="primary" type="button" onClick={download}><Download size={15} /> Exportar JSON</button></div>
        </section>

        <section className="panel">
          <div className="panelHead"><div><span className="eyebrow">IMPORTAÇÃO</span><h3>Restaurar backup</h3></div><Upload size={18} /></div>
          <label className="textAreaLabel">Cole aqui o JSON do backup<textarea value={jsonInput} onChange={(event) => setJsonInput(event.target.value)} placeholder="Cole o conteúdo do arquivo leiloes-os-backup-AAAA-MM-DD.json" /></label>
          <div className="modalActions">
            <button className="primary" type="button" onClick={importBackup}><Upload size={15} /> Importar backup</button>
            <button className="outline" type="button" onClick={clearData}><Trash2 size={15} /> Limpar dados locais</button>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panelHead"><div><span className="eyebrow">PREVIEW</span><h3>Resumo do JSON exportável</h3></div></div>
        <pre className="backupPreview">{JSON.stringify(preview, null, 2).slice(0, 3500)}</pre>
      </section>
    </OSShell>
  )
}
