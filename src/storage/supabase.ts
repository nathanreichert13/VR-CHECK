import type { SupabaseClient } from '@supabase/supabase-js'
import { resumir, uid } from '../modelo'
import type { RegistroHistorico, Vistoria } from '../types'
import type { Repositorio } from './repo'

const BUCKET = 'fotos'
const VALIDADE_URL_S = 60 * 60 // 1 hora

/** Cache de URLs: blob: das fotos enviadas nesta sessão, ou URLs assinadas com validade. */
const urls = new Map<string, { url: string; expira: number }>()

export function criarRepositorioSupabase(sb: SupabaseClient): Repositorio {
  return {
    modo: 'nuvem',

    async listar() {
      const { data, error } = await sb
        .from('vistorias')
        .select('dados')
        .order('atualizado_em', { ascending: false })
      if (error) throw error
      return (data ?? []).map((l) => resumir(l.dados as Vistoria))
    },

    async carregar(id) {
      const { data, error } = await sb.from('vistorias').select('dados').eq('id', id).maybeSingle()
      if (error) throw error
      return data ? (data.dados as Vistoria) : null
    },

    async salvar(v) {
      const { error } = await sb
        .from('vistorias')
        .upsert({ id: v.id, dados: v, atualizado_em: v.atualizadoEm })
      if (error) throw error
    },

    async excluir(id) {
      // Apaga todos os arquivos da pasta da vistoria (inclusive fotos "órfãs").
      for (;;) {
        const { data, error } = await sb.storage.from(BUCKET).list(id, { limit: 1000 })
        if (error) throw error
        if (!data || data.length === 0) break
        const caminhos = data.map((f) => `${id}/${f.name}`)
        caminhos.forEach((c) => urls.delete(c))
        const { error: e2 } = await sb.storage.from(BUCKET).remove(caminhos)
        if (e2) throw e2
        if (data.length < 1000) break
      }
      const { error } = await sb.from('vistorias').delete().eq('id', id)
      if (error) throw error
    },

    async enviarFoto(vistoriaId, arquivo) {
      const id = uid()
      const caminho = `${vistoriaId}/${id}.jpg`
      const { error } = await sb.storage
        .from(BUCKET)
        .upload(caminho, arquivo, { contentType: 'image/jpeg', upsert: false })
      if (error) throw error
      urls.set(caminho, { url: URL.createObjectURL(arquivo), expira: Infinity })
      return { id, caminho }
    },

    async urlsFotos(refs) {
      const agora = Date.now()
      const mapa: Record<string, string> = {}
      const faltando = refs.filter((r) => {
        const c = urls.get(r.caminho)
        if (c && c.expira > agora) {
          mapa[r.id] = c.url
          return false
        }
        return true
      })
      for (let i = 0; i < faltando.length; i += 100) {
        const lote = faltando.slice(i, i + 100)
        const { data, error } = await sb.storage
          .from(BUCKET)
          .createSignedUrls(lote.map((r) => r.caminho), VALIDADE_URL_S)
        if (error) throw error
        data?.forEach((d, j) => {
          if (!d.signedUrl) return
          const ref = lote[j]
          urls.set(ref.caminho, { url: d.signedUrl, expira: agora + (VALIDADE_URL_S - 120) * 1000 })
          mapa[ref.id] = d.signedUrl
        })
      }
      return mapa
    },

    async baixarFoto(ref) {
      const { data, error } = await sb.storage.from(BUCKET).download(ref.caminho)
      if (error || !data) throw error ?? new Error('Falha ao baixar foto.')
      return data
    },

    async removerFotos(refs) {
      if (refs.length === 0) return
      refs.forEach((r) => urls.delete(r.caminho))
      const { error } = await sb.storage.from(BUCKET).remove(refs.map((r) => r.caminho))
      if (error) throw error
    },

    async registrarHistorico(r) {
      const { data } = await sb.auth.getSession()
      const registro: RegistroHistorico = { ...r, concluidoPor: r.concluidoPor || data.session?.user.email || '' }
      const { error } = await sb
        .from('historico')
        .upsert({ id: registro.id, dados: registro, concluido_em: registro.concluidoEm })
      if (error) throw error
    },

    async listarHistorico() {
      const { data, error } = await sb
        .from('historico')
        .select('dados')
        .order('concluido_em', { ascending: false })
      if (error) throw error
      return (data ?? []).map((l) => l.dados as RegistroHistorico)
    },

    async excluirHistorico(id) {
      const { error } = await sb.from('historico').delete().eq('id', id)
      if (error) throw error
    },
  }
}
