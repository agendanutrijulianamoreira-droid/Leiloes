import { createClient, type SupabaseClient } from '@supabase/supabase-js'

interface ServerClientOptions {
  /**
   * Use only for trusted server-side maintenance jobs.
   * Never expose this through public routes without authentication and explicit authorization.
   */
  admin?: boolean
}

export function isSupabaseServerConfigured(options: ServerClientOptions = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = options.admin ? process.env.SUPABASE_SERVICE_ROLE_KEY : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return Boolean(url && key)
}

export function getSupabaseServerClient(options: ServerClientOptions = {}): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = options.admin ? process.env.SUPABASE_SERVICE_ROLE_KEY : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) return null

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
