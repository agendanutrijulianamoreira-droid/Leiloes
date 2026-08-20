'use client'

import type { DueDiligenceItem, RiskLevel } from './domain'
import { dueDiligenceItems } from './demo-data'

const STORAGE_KEY = 'leiloes-os:diligence:v1'

export type DiligenceStatus = DueDiligenceItem['status']

export interface EditableDiligenceItem extends DueDiligenceItem {
  id: string
  notes?: string
  updatedAt?: string
}

const defaultChecklist: Omit<EditableDiligenceItem, 'id'>[] = [
  { category: 'Documental', item: 'Edital analisado', status: 'pending', evidence: 'Aguardando upload ou revisão manual do edital.', risk: 'Médio' },
  { category: 'Documental', item: 'Matrícula atualizada', status: 'pending', evidence: 'Emitir matrícula atualizada antes da decisão de lance.', risk: 'Alto' },
  { category: 'Jurídico', item: 'Processo consultado', status: 'pending', evidence: 'Verificar andamento, recursos, ônus e partes envolvidas.', risk: 'Alto' },
  { category: 'Ocupação', item: 'Situação de posse', status: 'pending', evidence: 'Confirmar se o bem está ocupado, desocupado ou sem informação confiável.', risk: 'Alto' },
  { category: 'Financeiro', item: 'Débitos de condomínio', status: 'pending', evidence: 'Solicitar declaração ou estimar contingência conservadora.', risk: 'Médio' },
  { category: 'Financeiro', item: 'IPTU e taxas públicas', status: 'pending', evidence: 'Consultar prefeitura ou documento equivalente.', risk: 'Médio' },
  { category: 'Mercado', item: 'Comparáveis de venda', status: 'pending', evidence: 'Levantar amostra conservadora de imóveis semelhantes.', risk: 'Médio' },
  { category: 'Operacional', item: 'Custo de reforma/regularização', status: 'pending', evidence: 'Estimar custo com margem de segurança.', risk: 'Médio' },
]

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function keyFor(dealId: string) {
  return dealId.trim().toUpperCase()
}

function makeId(category: string, item: string) {
  return `${category}:${item}`.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function normalize(items: DueDiligenceItem[]): EditableDiligenceItem[] {
  return items.map((item) => ({ ...item, id: makeId(item.category, item.item) }))
}

function readAll(): Record<string, EditableDiligenceItem[]> {
  if (!canUseStorage()) return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, EditableDiligenceItem[]>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, EditableDiligenceItem[]>) {
  if (!canUseStorage()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function getDefaultDiligence(dealId: string): EditableDiligenceItem[] {
  const demo = dueDiligenceItems[keyFor(dealId)]
  if (demo?.length) return normalize(demo)
  return defaultChecklist.map((item) => ({ ...item, id: makeId(item.category, item.item) }))
}

export function loadLocalDiligence(dealId: string): EditableDiligenceItem[] {
  const all = readAll()
  return all[keyFor(dealId)] ?? getDefaultDiligence(dealId)
}

export function saveLocalDiligence(dealId: string, items: EditableDiligenceItem[]) {
  const all = readAll()
  all[keyFor(dealId)] = items.map((item) => ({ ...item, updatedAt: new Date().toISOString() }))
  writeAll(all)
  return all[keyFor(dealId)]
}

export function updateLocalDiligenceItem(dealId: string, itemId: string, patch: Partial<Pick<EditableDiligenceItem, 'status' | 'evidence' | 'risk' | 'notes'>>) {
  const current = loadLocalDiligence(dealId)
  const next = current.map((item) => item.id === itemId ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item)
  saveLocalDiligence(dealId, next)
  return next
}

export function resetLocalDiligence(dealId: string) {
  const all = readAll()
  all[keyFor(dealId)] = getDefaultDiligence(dealId)
  writeAll(all)
  return all[keyFor(dealId)]
}

export function summarizeDiligence(items: EditableDiligenceItem[]) {
  const total = items.length || 1
  const confirmed = items.filter((item) => item.status === 'confirmed').length
  const warnings = items.filter((item) => item.status === 'warning').length
  const pending = items.filter((item) => item.status === 'pending').length
  const blocked = items.filter((item) => item.status === 'blocked').length
  const critical = items.filter((item) => item.risk === 'Crítico' || item.status === 'blocked').length
  const completionPct = Math.round((confirmed / total) * 100)
  const highestRisk: RiskLevel = critical ? 'Crítico' : blocked ? 'Crítico' : warnings ? 'Alto' : pending ? 'Médio' : 'Baixo'
  return { total, confirmed, warnings, pending, blocked, critical, completionPct, highestRisk }
}
