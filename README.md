# Leilões OS

Sistema operacional de análise, diligência, valuation, comitê de investimento e gestão patrimonial de oportunidades em leilões.

## MVP local-first

Nesta fase o sistema roda sem Supabase. As oportunidades, valuations, diligências e decisões do comitê são salvas no `localStorage` do navegador.

Fluxo principal:

1. `/opportunities/new` — cadastrar oportunidade.
2. `/diligence` — preencher checklist de diligência.
3. `/valuation` — calcular preço máximo e cenários.
4. `/committee` — registrar decisão formal e travas.
5. `/opportunities/[dealId]` — consultar ficha-mãe.
6. `/pre-lance` — visualizar limites finais de lance.

## Regra de segurança

O sistema não automatiza lance, pagamento ou ato jurídico. IA pode ajudar na extração e análise, mas o cálculo financeiro e as travas de risco são determinísticos.

## Rodar localmente

```bash
npm install
npm run dev
```

Depois acesse `http://localhost:3000`.

## Futuro

Supabase, autenticação, Gmail, Google Drive, Google Calendar e OpenAI entram depois que o fluxo operacional estiver validado.
