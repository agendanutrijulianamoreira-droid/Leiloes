# Leilões OS — Architecture

## Core principle
The application separates deterministic financial calculations from AI interpretation. AI may extract, classify, summarize and identify risks; it must not silently change financial assumptions or approve a bid.

## Pipeline
Radar → Triagem → Diligência → Valuation → Investment Committee → Pré-lance → Leilão → Pós-arrematação → Regularização → Realização → Aprendizado.

## Integrations planned
- Gmail: intake of emails and attachments from auctioneers.
- Google Drive: immutable source documents + versioned working documents.
- Google Calendar: deadlines, auction dates and operational milestones.
- OpenAI: structured extraction, document analysis, research and workflow automation.

## Safety gates
- Human approval is mandatory before any bid/payment/legal act.
- Missing critical evidence blocks bid approval.
- Current bid above absolute maximum blocks participation.
- Legal risk marked critical blocks participation.
- Financial calculations must expose assumptions and scenarios.

## Recommended next implementation phases
1. Supabase schema + authentication.
2. CRUD for auctions/assets/documents.
3. Valuation engine and scenario calculator.
4. Due diligence checklist and risk scoring.
5. Gmail/Drive/Calendar OAuth connectors.
6. OpenAI structured analysis endpoint.
7. Portfolio and post-operation learning.
