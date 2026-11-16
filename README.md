# PropostaAI

MicroSaaS em português (Brasil) que transforma o **brief do cliente + dados da empresa** em uma **proposta comercial profissional completa em PDF**.

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (Radix UI + Lucide)
- **MongoDB + Mongoose** (com cache global serverless)
- **NextAuth** (Google OAuth + Email/Senha com `bcryptjs`)
- **OpenRouter API** com streaming SSE e fallback automático:
  1. `nvidia/nemotron-3-ultra-550b-a55b:free`
  2. `nvidia/nemotron-3.5-super-vl:free`
  3. `google/gemma-4-31b-it:free`
- **@react-pdf/renderer** (PDF A4 com cabeçalho, logo, tabelas e rodapé)
- **Stripe** (Checkout recorrente mensal R$ 39/mês, Customer Portal e Webhook)

## Como rodar localmente

1. Copie o arquivo de variáveis de ambiente:
   ```bash
   cp .env.example .env.local
   ```
2. Preencha `MONGODB_URI`, `NEXTAUTH_SECRET`, `OPENROUTER_API_KEY` (e opcionalmente Google OAuth e Stripe).
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
4. Acesse `http://localhost:3000`.

## Deploy na Vercel

- Importe o repositório na Vercel.
- Configure as variáveis de ambiente listadas em `.env.example`.
- Aponte o webhook do Stripe para `https://seu-dominio.com/api/stripe/webhook` escutando:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
