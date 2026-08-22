'use client'

const STORAGE_PREFIX = 'leiloes-os:'

export interface LocalBackupPayload {
  app: 'LeiloesOS'
  version: string
  exportedAt: string
  keys: Record<string, unknown>
}

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

export function listLeiloesStorageKeys() {
  if (!canUseStorage()) return []
  return Object.keys(window.localStorage).filter((key) => key.startsWith(STORAGE_PREFIX)).sort()
}

export function exportLocalBackup(): LocalBackupPayload {
  const keys: Record<string, unknown> = {}
  if (canUseStorage()) {
    for (const key of listLeiloesStorageKeys()) {
      const raw = window.localStorage.getItem(key)
      if (!raw) continue
      try {
        keys[key] = JSON.parse(raw)
      } catch {
        keys[key] = raw
      }
    }
  }

  return {
    app: 'LeiloesOS',
    version: '0.7-local-first',
    exportedAt: new Date().toISOString(),
    keys,
  }
}

export function downloadLocalBackup() {
  const payload = exportLocalBackup()
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  link.href = url
  link.download = `leiloes-os-backup-${date}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return payload
}

export function validateBackupPayload(payload: unknown): payload is LocalBackupPayload {
  if (!payload || typeof payload !== 'object') return false
  const candidate = payload as Partial<LocalBackupPayload>
  return candidate.app === 'LeiloesOS' && Boolean(candidate.keys) && typeof candidate.keys === 'object'
}

export function importLocalBackup(payload: LocalBackupPayload) {
  if (!canUseStorage()) return { ok: false as const, message: 'localStorage indisponível neste ambiente.' }
  if (!validateBackupPayload(payload)) return { ok: false as const, message: 'Arquivo de backup inválido.' }

  for (const [key, value] of Object.entries(payload.keys)) {
    if (!key.startsWith(STORAGE_PREFIX)) continue
    window.localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
  }

  return { ok: true as const, message: 'Backup restaurado com sucesso.' }
}

export function clearLocalBackupData() {
  if (!canUseStorage()) return 0
  const keys = listLeiloesStorageKeys()
  keys.forEach((key) => window.localStorage.removeItem(key))
  return keys.length
}
