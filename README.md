# Leilões OS

Sistema operacional de análise, diligência, valuation, comitê de investimento, calendário, pós-leilão e gestão patrimonial de oportunidades em leilões.

## MVP local-first

Nesta fase o sistema roda sem Supabase. Radar, oportunidades, valuations, diligências, decisões do comitê, marcos de calendário, pós-leilão e snapshots patrimoniais são salvos no `localStorage` do navegador.

Fluxo principal:

1. `/radar` — cadastrar fontes, leads e oportunidades brutas.
2. `/opportunities/new` — cadastrar oportunidade manualmente.
3. `/diligence` — preencher checklist de diligência.
4. `/valuation` — calcular preço máximo e cenários.
5. `/committee` — registrar decisão formal e travas.
6. `/calendar` — controlar marcos críticos.
7. `/pre-lance` — visualizar limites finais de lance.
8. `/post-auction` — registrar resultado, custos reais e aprendizado.
9. `/portfolio` — consolidar capital, risco, lucro e carteira.
10. `/opportunities/[dealId]` — consultar ficha-mãe.

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
