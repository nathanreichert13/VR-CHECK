# VR-CHECK

Sistema web para fazer **vistorias de imóveis** (entrada e saída) e gerar o laudo em **PDF** ou **Word (.docx)** automaticamente.

- Cômodos padrão já cadastrados, que podem ser **adicionados, removidos, renomeados e reordenados**
- Fotos pela **câmera do celular** ou da galeria, **redimensionadas automaticamente** (sem macro)
- Descrição de cada cômodo **digitada ou ditada por voz** (🎤)
- Laudo em **PDF** ou **Word** no mesmo formato usado hoje: texto à esquerda, grade de fotos à direita e assinaturas no final. O Word pode ser editado depois.
- Depois de conferir e salvar o laudo, os dados são **apagados** do banco, o que mantém o Supabase no plano gratuito
- **Histórico** das vistorias concluídas para consulta (endereço, locatário e CPF, Imb, contrato, datas), **sem fotos**, com busca

## Tecnologias

React + TypeScript + Vite · Supabase (banco, login e fotos) · `@react-pdf/renderer` (PDF) · `docx` (Word), ambos gerados no navegador · Web Speech API (ditado)

## Rodar no computador

Pré-requisito: [Node.js](https://nodejs.org) LTS.

```bash
npm install
npm run dev
```

Abra `http://localhost:5173`.

Sem configurar o Supabase, o sistema roda em **modo local**: tudo fica salvo só no navegador daquele aparelho. Isso é útil para testar.

## Configurar o Supabase (modo nuvem)

1. No painel do Supabase, abra **SQL Editor → New query**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**.
2. Em **Authentication → Sign In / Providers**, desative **"Allow new users to sign up"**. Só quem você cadastrar entra.
3. Em **Authentication → Users → Add user**, crie um usuário (e-mail + senha) para cada pessoa do escritório.
4. Em **Project Settings → API**, copie a **Project URL** e a chave **anon / publishable**.
5. Copie `.env.example` para `.env.local` e preencha:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_KEY=sua-chave-publica
   ```
6. Reinicie o `npm run dev`. Agora o sistema pede login.

> A chave *anon/publishable* é pública (vai para o navegador). Quem protege os dados são as regras de segurança do `schema.sql` e o login. **Nunca** use a chave `service_role` aqui.

## Fluxo de uso

1. **Nova vistoria** → preencha o cabeçalho (endereço, Imb, contrato, locatário e CPF, vistoriador).
2. Medidores (leitura + foto) e cores de tinta.
3. Em cada cômodo: toque no nome para abrir, tire as fotos e dite ou digite a descrição.
4. Fechamento: entrega das chaves, cidade/data, administradora e testemunhas.
5. **📄 PDF** ou **📝 Word** → confira o arquivo → salve na pasta do imóvel → **"Laudo conferido e salvo: apagar dados"**. Na mesma janela dá para baixar também o outro formato.

Ao apagar uma vistoria que já teve laudo gerado, um registro dela (sem fotos) vai para o **Histórico**. Vistorias excluídas sem gerar laudo não entram no histórico.

Tudo é salvo automaticamente enquanto você edita. Dá para começar no celular e terminar no computador (no modo nuvem).

## Estrutura

```
src/
  App.tsx              rotas + login
  types.ts, modelo.ts  modelo de dados, cômodos padrão, máscaras CPF/CNPJ
  storage/             armazenamento: local (IndexedDB) ou Supabase
  lib/imagens.ts       redimensionamento/compressão das fotos
  lib/ditado.ts        ditado por voz
  pages/               Lista, Editor, Histórico, Configurações, Login
  components/          cômodo, fotos, descrição com ditado, pessoas
  lib/laudo.ts         partes comuns do laudo (fotos, nome do arquivo, download)
  pdf/                 layout do laudo e geração do PDF
  word/                geração do laudo em Word (.docx)
supabase/schema.sql    tabelas, bucket de fotos e regras de segurança
```

## Observações

- O **ditado por voz** funciona no Chrome/Edge (Android e computador) e exige **HTTPS** (ou `localhost`). Onde não houver, use o microfone do teclado do celular.
- As **Configurações** (administradora, cidade, cômodos padrão) ficam salvas em cada aparelho.
