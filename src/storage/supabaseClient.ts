import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const chave = import.meta.env.VITE_SUPABASE_KEY as string | undefined

/** Cliente do Supabase, ou null se o projeto ainda não foi configurado (modo local). */
export const supabase: SupabaseClient | null =
  url && chave && !url.includes('SEU-PROJETO') ? createClient(url, chave) : null
