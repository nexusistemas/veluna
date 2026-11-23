# Diretrizes de Engenharia — Veluna Cosméticos (`veluna.nexusistemas.com.app`)

## 1. Stack, Domínio e Hospedagem Serverless
- **Marca / Domínio:** Veluna Cosméticos (`https://veluna.nexusistemas.com.app`), arquivo `public/CNAME` obrigatório.
- **Frontend:** React 18 + TypeScript + Vite (`base: '/'`) + Tailwind CSS v3 + Lucide React.
- **Roteamento:** Usar exclusivamente `HashRouter` (`react-router-dom`) para evitar erro 404 ao recarregar rotas no GitHub Pages com domínio próprio.
- **Backend/Auth/Storage:** Supabase (`@supabase/supabase-js`) + Supabase Edge Functions (Deno).

## 2. Travas Anti-Bug (Obrigatórias em todas as etapas)
- **Zero Segredos no Git:** Nunca commitar tokens de API (PAT do GitHub, token da Cloudflare, `mp_access_token`) em arquivos rastreados.
- **Teto de 250 linhas por arquivo:** Divida páginas grandes em subcomponentes, hooks e serviços pequenos. Nunca omita código existente ao editar arquivos.
- **Contrato Único (`src/types/database.ts`):** Nunca invente nomes de tabelas ou colunas fora de `src/types/database.ts`.
- **Isolamento Deno vs. Vite:** Manter `"supabase/functions"` em `"exclude"` no `tsconfig.json`.
- **Mobile-First e PWA:** Interface desenhada para uso com uma mão no celular (botões min 44px, identidade sofisticada de cosméticos em tons rose/pink `#db2777` e neutros suaves).

## 3. Regras de Segurança do Banco de Dados (Supabase RLS)
- **Variantes na Loja Pública:** Visitantes anônimos consultam SEMPRE a view `public_product_variants` (que oculta `cost_price` e `batch_expiry_date`). No `/painel` autenticado da Thacilla, usar `product_variants`.
- **Configurações vs. Segredos:** Dados públicos ficam em `store_settings` (`id = 1`). Tokens sensíveis (`mp_access_token`, `mp_webhook_secret`, `whatsapp_webhook_url`, `whatsapp_webhook_token`) ficam exclusivamente em `private_secrets` (`id = 1`).
- **Cupons e Pedidos:** Validar cupons via RPC `validate_coupon_public(p_code, p_subtotal)`, criar pedidos via RPC `create_order_atomic(p_payload)` e consultar status via RPC `get_order_public_status(p_order_id, p_token)`.
- **Storage:** Imagens convertidas no navegador para `.webp` antes do upload no bucket público `catalog`.
