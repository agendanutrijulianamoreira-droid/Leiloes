# Leilões OS

Sistema operacional de análise, diligência, valuation, comitê de investimento, calendário, pós-leilão e gestão patrimonial de oportunidades em leilões.

## MVP local-first + Supabase bootstrap

O fluxo operacional ainda roda em modo local-first para não perder velocidade de protótipo. Radar, oportunidades, valuations, diligências, decisões do comitê, marcos de calendário, pós-leilão, snapshots patrimoniais e backups continuam salvos no `localStorage` do navegador.

A base Supabase já começou: `/account` permite validar autenticação, criar workspace e selecionar o `workspace_id` ativo. A migração dos módulos para gravação no banco deve ser feita em etapas, mantendo `localStorage` como fallback.

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
10. `/backup` — exportar, importar ou limpar dados locais.
11. `/account` — login Supabase, criação e seleção de workspace.
12. `/opportunities/[dealId]` — consultar ficha-mãe.

## Supabase

Configure na Vercel ou no `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_DATA_MODE=local
```

Não exponha `SUPABASE_SERVICE_ROLE_KEY` no front-end. Ela só deve ser usada futuramente em rotas server-side realmente privilegiadas.

## Regra de segurança

O sistema não automatiza lance, pagamento ou ato jurídico. IA pode ajudar na extração e análise, mas o cálculo financeiro e as travas de risco são determinísticos.

## Rodar localmente

```bash
npm install
npm run dev
```

Depois acesse `http://localhost:3000`.

## Validar antes de publicar

```bash
npm run typecheck
npm run lint
npm run build
```

Ou rode tudo junto:

```bash
npm run check
```

## Próxima fase

Migrar módulo por módulo para Supabase:

1. Radar.
2. Oportunidades.
3. Diligência.
4. Valuation.
5. Comitê.
6. Calendário.
7. Pós-leilão.
8. Patrimônio.

Cada módulo deve manter fallback local até a gravação no banco estar validada.
