# Database schema — Supabase/PostgreSQL

Migration: `supabase/migrations/20260822010000_leiloes_os_full_schema.sql`
(single file, applied and smoke-tested against PostgreSQL 16 — see
"Validation" below). `supabase/schema.sql` is the old first draft, kept only
for history; it is superseded by this migration.

## Architecture, in short

- **Workspace-scoped multi-tenancy.** Every operational table carries a
  `workspace_id`. `workspaces` + `workspace_members` (`owner` / `admin` /
  `analyst` / `viewer`) gate all access through RLS, so the MVP can run
  single-user today and add collaborators later without a schema change.
- **`opportunities` is the deal's mother record.** It holds asset attributes
  (address, matrícula, processo, ocupação) directly — there is no separate
  `assets` table, matching how the app already models a deal — plus a
  *denormalized* snapshot of the current valuation/risk/decision for fast
  dashboard reads.
- **Audited history lives in separate immutable tables.** `valuations` and
  `committee_memos` never get UPDATEd in place: every recalculation or
  re-decision is a new row (`is_current` flags the latest). That satisfies
  "keep an audit trail for changes to valuations, limits and decisions"
  without relying on the generic audit log for the full picture.
- **Generic `audit_logs`** additionally captures INSERT/UPDATE/DELETE diffs
  (old/new JSON, changed columns, actor) on `opportunities`, `valuations`,
  `committee_memos` and `post_auction_records` via a `SECURITY DEFINER`
  trigger — readable only by `owner`/`admin`.
- **Documents are never overwritten.** `opportunity_documents` has a
  `BEFORE UPDATE` trigger that rejects changes to identity fields
  (`file_name`, `drive_file_id`, `storage_path`, `content_hash`,
  `is_original`, `document_type`); only extraction metadata can be enriched
  in place. A new file/version is always a new row
  (`version_of_document_id` chains it to the original).
- **AI is advisory only.** `ai_reports` stores model output with
  `is_applied boolean default false` and `reviewed_by`/`reviewed_at` —
  nothing in this schema lets an AI report change a decision, bid limit, or
  status by itself. Financial math (max bid, ROI, scenarios) is expected to
  keep living in `lib/valuation.ts`-style typed functions, not in triggers.
- **Views are `security_invoker = true`** (`view_dashboard_overview`,
  `view_pipeline_summary`, `view_portfolio_summary`,
  `view_due_diligence_summary`, `view_calendar_upcoming`,
  `view_opportunity_full_detail`), so they run under the querying user's own
  RLS grants instead of silently bypassing them as the view owner.
- **Hard safety rules stay soft constraints, not CHECKs.** e.g. "current bid
  above `max_bid_absolute` blocks participation" is a status/decision gate
  the application enforces (mirroring `lib/valuation.ts#classifyBid`); the
  database still needs to store that overshoot to show the blocked state,
  so it isn't a `CHECK` constraint.

## Validation performed

Applied the migration twice against a throwaway local PostgreSQL 16
database (idempotent — safe to re-run), with `auth.users`/`auth.uid()`
stubbed to mirror Supabase. Confirmed: profile + owner-membership
auto-provisioning on signup/workspace creation, the audit trigger recording
an INSERT and an UPDATE with correct `changed_fields`, the document
immutability trigger blocking a `file_name` change while allowing
`extracted_text` updates, `fn_opportunity_diligence_completion` and all six
views returning correct aggregates, and RLS actually isolating tenants (a
workspace member sees their opportunity, an outsider sees zero rows, and a
cross-tenant `INSERT` is rejected by the RLS policy).

## Mapping localStorage → tables

| localStorage key (`lib/local-*.ts`) | Shape | → Table(s) |
|---|---|---|
| `leiloes-os:opportunities:v1` (`AuctionOpportunity[]`, `local-opportunities.ts`) | one row per deal, `id` = deal code | `opportunities`. `id` (e.g. `LEILAO-2026-0001`) → `deal_code`; keep the generated `uuid` as the new primary key and index `deal_code` for lookups by the app's existing routes (`/opportunities/[dealId]`). `marketConservative/marketBase/marketOptimistic`, `maxBidAbsolute/maxBidRecommended/comfortBid`, `baseRoiPct` → same-named columns (also insert one row into `valuations` per opportunity so there is a sourced, dated history from day one — `market_value_source`/`market_value_consulted_at` are required and have no local equivalent, so backfill with `"Importado do localStorage"` and the import timestamp, then have the user correct it). `risk` (`'Baixo'\|'Médio'\|'Alto'\|'Crítico'`) → `risk` enum (`low/medium/high/critical`); `decision` (`'A — Aprovar'` etc.) → `decision` enum (`A_APPROVE` etc.) using the same mapping already implemented in `lib/opportunity-repository.ts#mapAuctionRow`, just inverted. `blockers: string[]` → `blockers text[]`. |
| `leiloes-os:diligence:v1` (`Record<dealId, EditableDiligenceItem[]>`, `local-diligence.ts`) | keyed by deal code | `diligence_items`, one row per item, `opportunity_id` resolved from `deal_code`. `status` maps 1:1 to the `diligence_status` enum. `risk` maps to `risk_level`. `id` (`"category:item"` slug) is dropped — uniqueness is now `(opportunity_id, category, item)`. |
| `leiloes-os:radar:v1` (`RadarLead[]`, `local-radar.ts`) | flat list | `radar_leads`. `sourceType` → `radar_source_type` enum. `status` → `radar_status` enum. `promotedDealId` → `promoted_opportunity_id` (resolve the opportunity's uuid by `deal_code`). |
| `leiloes-os:committee:v1` (`Record<dealId, CommitteeMemo>`, `local-committee.ts`) | one memo per deal (local storage only ever kept the latest) | `committee_memos`, one row with `is_current = true`. `approvedBy: string` → `approved_by_name` (leave `approved_by_user_id` null unless the string can be matched to a `profiles` row). `hardBlockers: string[]` → `hard_blockers text[]`. |
| `leiloes-os:calendar-events:v1` (`Record<dealId, LocalCalendarEvent[]>`, `local-calendar.ts`) | list per deal | `calendar_events`. `kind`/`status` map 1:1 to `calendar_event_kind`/`calendar_event_status` enums (`calendar_event_status` additionally supports `cancelled`, unused by the local model). Drop the deterministic `id` (`"dealId:kind"`); a uuid plus `(opportunity_id, kind)` is no longer unique-constrained in the DB since multiple events of the same kind become possible (e.g. a rescheduled auction) — de-dupe during import by keeping the most recently `updatedAt` row per `(dealId, kind)`. |
| `leiloes-os:post-auction:v1` (`Record<dealId, PostAuctionRecord>`, `local-post-auction.ts`) | one record per deal | `post_auction_records`, one row (`opportunity_id` is `unique`, matching the local 1:1 shape). `outcome`/`stage`/`exitStrategy` map 1:1 to their enums. |
| `leiloes-os:portfolio:v1` (`PortfolioSettings`, `local-portfolio.ts`) | single object | `portfolio_settings`, one row per workspace (`upsert` on `workspace_id`). |
| *(computed, not persisted locally)* `buildPortfolioSnapshot()` output | — | `portfolio_snapshots` — start writing a dated row here once the app is live (e.g. daily cron or on-demand "snapshot now" action); nothing to backfill from localStorage. |
| — (no local equivalent) | — | `opportunity_documents`, `files_metadata`, `ai_reports`, `audit_logs`, `valuation_scenarios`, `workspaces`, `profiles`, `workspace_members` are new — created empty. On first login, create one `workspaces` row for the user (trigger auto-adds them as `owner`), then import everything above under that `workspace_id`. |

### Suggested import order (respects foreign keys)

1. Create/select the target `workspaces` row (auth sign-up already
   provisions `profiles` + the creator's `workspace_members` row via
   trigger).
2. `radar_leads` (so `opportunities.radar_lead_id` can resolve).
3. `opportunities`.
4. `opportunity_documents`, `diligence_items`, `valuations` (+ one
   `valuation_scenarios` row per pessimistic/base/optimistic if the local
   scenario data is worth preserving), `committee_memos`,
   `calendar_events`, `post_auction_records` — all keyed off the
   `opportunities.id` just created.
5. `portfolio_settings`.
6. Keep `leiloes-os:backup:*` exports (`lib/local-backup.ts`) as a
   downloadable fallback until the import is confirmed correct in
   production, then retire the localStorage code paths.
