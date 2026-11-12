import { createStore, del, delMany, get, keys, set, values } from 'idb-keyval'
import { resumir, uid } from '../modelo'
import type { FotoRef, RegistroHistorico, Vistoria } from '../types'
import type { Repositorio } from './repo'

const lojaVistorias = createStore('vrcheck-vistorias', 'vistorias')
const lojaFotos = createStore('vrcheck-fotos', 'fotos')
const lojaHistorico = createStore('vrcheck-historico', 'historico')

/** Cache de URLs temporárias (blob:) para não recriar a cada render. */
const urls = new Map<string, string>()

function liberarUrl(caminho: string) {
  const u = urls.get(caminho)
  if (u) {
    URL.revokeObjectURL(u)
    urls.delete(caminho)
  }
}

export const repositorioLocal: Repositorio = {
  modo: 'local',

  async listar() {
    const todas = (await values(lojaVistorias)) as Vistoria[]
    return todas.map(resumir).sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))
  },

  async carregar(id) {
    return ((await get(id, lojaVistorias)) as Vistoria | undefined) ?? null
  },

  async salvar(v) {
    await set(v.id, v, lojaVistorias)
  },

  async excluir(id) {
    const prefixo = `${id}/`
    const chaves = (await keys(lojaFotos)).filter((k) => String(k).startsWith(prefixo))
    chaves.forEach((k) => liberarUrl(String(k)))
    await delMany(chaves, lojaFotos)
    await del(id, lojaVistorias)
  },

  async enviarFoto(vistoriaId, arquivo) {
    const id = uid()
    const caminho = `${vistoriaId}/${id}.jpg`
    await set(caminho, arquivo, lojaFotos)
    urls.set(caminho, URL.createObjectURL(arquivo))
    return { id, caminho }
  },

  async urlsFotos(refs) {
    const mapa: Record<string, string> = {}
    for (const r of refs) {
      let u = urls.get(r.caminho)
      if (!u) {
        const blob = (await get(r.caminho, lojaFotos)) as Blob | undefined
        if (!blob) continue
        u = URL.createObjectURL(blob)
        urls.set(r.caminho, u)
      }
      mapa[r.id] = u
    }
    return mapa
  },

  async baixarFoto(ref: FotoRef) {
    const blob = (await get(ref.caminho, lojaFotos)) as Blob | undefined
    if (!blob) throw new Error('Foto não encontrada neste aparelho.')
    return blob
  },

  async removerFotos(refs) {
    refs.forEach((r) => liberarUrl(r.caminho))
    await delMany(refs.map((r) => r.caminho), lojaFotos)
  },

  async registrarHistorico(r) {
    await set(r.id, r, lojaHistorico)
  },

  async listarHistorico() {
    const todos = (await values(lojaHistorico)) as RegistroHistorico[]
    return todos.sort((a, b) => b.concluidoEm.localeCompare(a.concluidoEm))
  },

  async excluirHistorico(id) {
    await del(id, lojaHistorico)
  },
}
