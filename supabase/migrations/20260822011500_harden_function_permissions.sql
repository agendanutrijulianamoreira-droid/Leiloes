-- ============================================================================
-- Leilões OS — function hardening
-- ============================================================================
-- Addresses two WARN-level findings from Supabase's security advisor on the
-- schema in 20260822010000_leiloes_os_full_schema.sql:
--
-- 1. function_search_path_mutable — three functions did not pin search_path,
--    leaving them open to schema-shadowing if a caller's search_path is
--    manipulated. Pin all of them to `public`.
-- 2. anon/authenticated_security_definer_function_executable — Postgres
--    grants EXECUTE to PUBLIC by default, so every function was silently
--    callable via PostgREST's /rest/v1/rpc/<fn> even though none of them are
--    meant to be called directly from the client:
--      - trigger handlers (fn_set_updated_at, fn_handle_new_auth_user,
--        fn_handle_new_workspace, fn_prevent_document_mutation, fn_audit_log)
--        only ever run as triggers and never need direct EXECUTE grants.
--      - is_workspace_member / workspace_role_of are RLS-policy helpers;
--        `authenticated` still needs EXECUTE for RLS to evaluate, but `anon`
--        does not.
--      - fn_opportunity_diligence_completion is the one function meant to be
--        called directly by the app (RPC); keep it for `authenticated` only.
-- ============================================================================

alter function public.fn_set_updated_at() set search_path = public;
alter function public.fn_prevent_document_mutation() set search_path = public;
alter function public.fn_opportunity_diligence_completion(uuid) set search_path = public;

-- NOTE: Supabase grants EXECUTE directly to anon/authenticated/service_role
-- on every new function in `public` (a platform default privilege), on top
-- of the ordinary PUBLIC grant. `revoke ... from public` alone does not
-- touch those direct grants, so each role is revoked explicitly below.

-- Trigger-only functions: never called directly, so no client role needs
-- EXECUTE. service_role is left with it (harmless — it already bypasses RLS
-- and is Supabase's own default for every function).
revoke execute on function public.fn_set_updated_at() from public, anon, authenticated;
revoke execute on function public.fn_handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.fn_handle_new_workspace() from public, anon, authenticated;
revoke execute on function public.fn_prevent_document_mutation() from public, anon, authenticated;
revoke execute on function public.fn_audit_log() from public, anon, authenticated;

-- RLS-policy helpers: authenticated needs EXECUTE for policies to evaluate;
-- anon does not (anon has no workspace membership, so it would always
-- resolve to false/null, but there is no reason to expose it as an RPC).
revoke execute on function public.is_workspace_member(uuid) from public, anon;

revoke execute on function public.workspace_role_of(uuid) from public, anon;

-- Intentional app-facing RPC: authenticated only, RLS on diligence_items
-- still applies underneath since this function runs as SECURITY INVOKER.
revoke execute on function public.fn_opportunity_diligence_completion(uuid) from public, anon;
