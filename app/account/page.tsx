'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, LogOut, RefreshCw, UserRound } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { OSShell } from '@/components/os-shell'
import { isSupabaseConfigured } from '@/lib/supabase-browser'
import type { ActiveWorkspace } from '@/lib/supabase-workspace'
import { createWorkspace, getActiveWorkspaceId, getCurrentUser, listUserWorkspaces, setActiveWorkspaceId, signInWithEmail, signOut, signUpWithEmail } from '@/lib/supabase-workspace'

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null)
  const [workspaces, setWorkspaces] = useState<ActiveWorkspace[]>([])
  const [activeWorkspaceId, setActiveWorkspaceState] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [workspaceName, setWorkspaceName] = useState('Leilões OS')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function refresh() {
    setLoading(true)
    setMessage('')
    setError('')
    const current = await getCurrentUser()
    setUser(current.user)

    if (current.user) {
      const listed = await listUserWorkspaces()
      setWorkspaces(listed.workspaces)
      setActiveWorkspaceState(getActiveWorkspaceId())
      if (listed.error) setError(listed.error)
    }

    if (!current.user) {
      setWorkspaces([])
      setActiveWorkspaceState(null)
    }

    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')
    const result = await signInWithEmail(email, password)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setMessage('Login realizado.')
    await refresh()
  }

  async function signup() {
    setMessage('')
    setError('')
    const result = await signUpWithEmail(email, password, fullName)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setMessage('Cadastro criado. Se o Supabase exigir confirmação, confirme o e-mail antes de entrar.')
  }

  async function logout() {
    await signOut()
    setUser(null)
    setWorkspaces([])
    setActiveWorkspaceState(null)
    setMessage('Sessão encerrada.')
  }

  async function addWorkspace() {
    setMessage('')
    setError('')
    const result = await createWorkspace(workspaceName)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setMessage('Workspace criado e selecionado.')
    await refresh()
  }

  function chooseWorkspace(workspaceId: string) {
    setActiveWorkspaceId(workspaceId)
    setActiveWorkspaceState(workspaceId)
    setMessage('Workspace ativo atualizado.')
  }

  return (
    <OSShell title="Conta" eyebrow="SUPABASE AUTH" action={<button className="outline" type="button" onClick={refresh}><RefreshCw size={15} /> Atualizar</button>}>
      <section className="sectionIntro actionIntro">
        <div>
          <span className="eyebrow">AUTENTICAÇÃO E WORKSPACE</span>
          <h2>Preparar conexão real com Supabase</h2>
          <p>Esta tela valida login, cria workspace e define qual `workspace_id` será usado quando os módulos saírem do localStorage.</p>
        </div>
        <div className={isSupabaseConfigured() ? 'supabaseStatus ready' : 'supabaseStatus blocked'}>
          <span>{isSupabaseConfigured() ? 'Supabase configurado' : 'Supabase sem ENV'}</span>
        </div>
      </section>

      {message && <div className="formAlert success accountAlert"><CheckCircle2 size={15} /> <span>{message}</span></div>}
      {error && <div className="formAlert error accountAlert"><span>{error}</span></div>}

      {!isSupabaseConfigured() ? (
        <section className="panel">
          <div className="panelHead"><div><span className="eyebrow">ENV</span><h3>Configure a Vercel primeiro</h3></div></div>
          <p className="panelCopy">Defina `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` nas variáveis de ambiente. Depois rode novo deploy.</p>
        </section>
      ) : null}

      <div className="detailGrid">
        <section className="panel">
          <div className="panelHead"><div><span className="eyebrow">SESSÃO</span><h3>{user ? 'Usuário conectado' : 'Entrar ou criar conta'}</h3></div><UserRound size={18} /></div>
          {user ? (
            <div className="accountSession">
              <div><span>E-mail</span><strong>{user.email}</strong></div>
              <div><span>User ID</span><strong>{user.id}</strong></div>
              <button className="outline" type="button" onClick={logout}><LogOut size={15} /> Sair</button>
            </div>
          ) : (
            <form onSubmit={login} className="formGrid accountForm">
              <label>Nome completo<input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Juliana Moreira" /></label>
              <label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@email.com" /></label>
              <label>Senha<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo configurado no Supabase" /></label>
              <div className="modalActions compactActions">
                <button className="primary" type="submit" disabled={loading}>Entrar</button>
                <button className="outline" type="button" onClick={signup} disabled={loading}>Criar conta</button>
              </div>
            </form>
          )}
        </section>

        <section className="panel">
          <div className="panelHead"><div><span className="eyebrow">WORKSPACE</span><h3>Workspace ativo</h3></div></div>
          {!user ? <p className="emptyState">Faça login antes de criar ou selecionar um workspace.</p> : (
            <>
              <div className="formGrid accountForm">
                <label>Novo workspace<input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} /></label>
                <button className="primary" type="button" onClick={addWorkspace}>Criar workspace</button>
              </div>
              <div className="workspaceList">
                {workspaces.map((workspace) => (
                  <button key={workspace.id} className={workspace.id === activeWorkspaceId ? 'workspaceCard active' : 'workspaceCard'} type="button" onClick={() => chooseWorkspace(workspace.id)}>
                    <span>{workspace.role}</span>
                    <strong>{workspace.name}</strong>
                    <small>{workspace.id}</small>
                  </button>
                ))}
                {!workspaces.length && <p className="emptyState">Nenhum workspace encontrado. Crie o primeiro workspace para liberar gravação no Supabase.</p>}
              </div>
            </>
          )}
        </section>
      </div>
    </OSShell>
  )
}
