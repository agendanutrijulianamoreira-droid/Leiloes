# Leilões OS — instructions for Claude

## Product
Build a conservative investment operating system for auction opportunities. The product is not an automated bidding agent. Human approval is mandatory before bids, payments, legal actions or irreversible operations.

## Architecture rules
1. Keep deterministic financial calculations separate from AI reasoning.
2. Never invent missing auction, legal, market or cost data.
3. Every material claim must have a source and consultation date.
4. Preserve original documents and never overwrite them.
5. Missing critical evidence blocks bid approval.
6. Current bid above `max_bid_absolute` blocks participation.
7. Critical legal risk blocks participation.
8. Financial scenarios must expose assumptions.
9. Keep an audit trail for changes to valuations, limits and decisions.
10. Prefer small, testable modules over a monolithic AI prompt.

## Stack target
Next.js 14, TypeScript, Supabase/PostgreSQL, Tailwind/shadcn-style UI, Google Workspace integrations, OpenAI structured outputs/tool calling.

## Current state
The repository contains the first dashboard shell, a domain-oriented Supabase schema and architecture notes. Continue incrementally; do not replace the dashboard with a generic template.

## Roadmap
- Authentication and owner profile
- Auction CRUD
- Asset detail page
- Due diligence workspace
- Valuation/scenario calculator
- Bid-limit engine
- Investment committee workflow
- Gmail intake
- Drive document management
- Calendar milestones
- OpenAI automation layer
- Portfolio/wealth dashboard
- Post-operation actual-vs-estimated learning

## AI boundary
AI can extract, classify, summarize, compare documents, research and recommend. The final bid decision remains a user action. Financial formulas should be implemented in typed functions with tests rather than generated ad hoc by the model.
