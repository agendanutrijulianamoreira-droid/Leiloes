'use client'

import type { User } from '@supabase/supabase-js'
import { getSupabaseBrowserClient } from './supabase-browser'

const ACTIVE_WORKSPACE_KEY = 'leiloes-os:active-workspace-id'

export interface WorkspaceRow {
  id: string
  name: string
  slug: string
  owner_id: string
  plan: string
  created_at: string
  updated_at: string
}

export interface WorkspaceMemberRow {
  id: string
  workspace_id: string
  user_id: string
  role: 'owner' | 'admin' | 'analyst' | 'viewer'
  status: string
  workspaces?: WorkspaceRow | WorkspaceRow[] | null
}

export interface ActiveWorkspace {
  id: string
  name: string
  slug: string
  role: WorkspaceMemberRow['role']
}

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

export function getActiveWorkspaceId() {
  if (!canUseStorage()) return null
  return window.localStorage.getItem(ACTIVE_WORKSPACE_KEY)
}

export function setActiveWorkspaceId(workspaceId: string) {
  if (!canUseStorage()) return
  window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId)
}

export function clearActiveWorkspaceId() {
  if (!canUseStorage()) return
  window.localStorage.removeItem(ACTIVE_WORKSPACE_KEY)
}

export function makeWorkspaceSlug(name: string) {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

  return `${base || 'workspace'}-${Date.now().toString(36)}`
}

export async function getCurrentUser() {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return { user: null as User | null, error: 'Supabase não configurado.' }

  const { data, error } = await supabase.auth.getUser()
  return { user: data.user, error: error?.message ?? null }
}

export async function signInWithEmail(email: string, password: string) {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return { ok: false as const, error: 'Supabase não configurado.' }

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error ? { ok: false as const, error: error.message } : { ok: true as const }
}

export async function signUpWithEmail(email: string, password: string, fullName?: string) {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return { ok: false as const, error: 'Supabase não configurado.' }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName || email } },
  })
  return error ? { ok: false as const, error: error.message } : { ok: true as const }
}

export async function signOut() {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return
  clearActiveWorkspaceId()
  await supabase.auth.signOut()
}

function normalizeWorkspace(member: WorkspaceMemberRow): ActiveWorkspace | null {
  const workspace = Array.isArray(member.workspaces) ? member.workspaces[0] : member.workspaces
  if (!workspace) return null
  return { id: workspace.id, name: workspace.name, slug: workspace.slug, role: member.role }
}

export async function listUserWorkspaces() {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return { workspaces: [] as ActiveWorkspace[], error: 'Supabase não configurado.' }

  const { data, error } = await supabase
    .from('workspace_members')
    .select('id, workspace_id, user_id, role, status, workspaces(id, name, slug, owner_id, plan, created_at, updated_at)')
    .eq('status', 'active')
    .order('created_at', { ascending: true })

  if (error) return { workspaces: [] as ActiveWorkspace[], error: error.message }

  const workspaces = ((data ?? []) as WorkspaceMemberRow[])
    .map(normalizeWorkspace)
    .filter((item): item is ActiveWorkspace => Boolean(item))

  const activeId = getActiveWorkspaceId()
  if (!activeId && workspaces[0]) setActiveWorkspaceId(workspaces[0].id)

  return { workspaces, error: null }
}

export async function createWorkspace(name: string) {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return { ok: false as const, error: 'Supabase não configurado.', workspace: null }

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return { ok: false as const, error: userError?.message ?? 'Faça login antes de criar um workspace.', workspace: null }

  const cleanName = name.trim()
  if (!cleanName) return { ok: false as const, error: 'Informe o nome do workspace.', workspace: null }

  const { data, error } = await supabase
    .from('workspaces')
    .insert({ name: cleanName, slug: makeWorkspaceSlug(cleanName), owner_id: userData.user.id })
    .select('id, name, slug, owner_id, plan, created_at, updated_at')
    .single()

  if (error) return { ok: false as const, error: error.message, workspace: null }

  setActiveWorkspaceId(data.id)
  return { ok: true as const, error: null, workspace: data as WorkspaceRow }
}
