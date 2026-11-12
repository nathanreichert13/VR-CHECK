import type { FotoRef, RegistroHistorico, ResumoVistoria, Vistoria } from '../types'

/**
 * Onde as vistorias e fotos ficam guardadas enquanto estão em andamento.
 * - "local": IndexedDB do navegador (só neste aparelho)
 * - "nuvem": Supabase (compartilhado entre celular e computador)
 */
export interface Repositorio {
  modo: 'local' | 'nuvem'
  listar(): Promise<ResumoVistoria[]>
  carregar(id: string): Promise<Vistoria | null>
  salvar(v: Vistoria): Promise<void>
  /** Apaga a vistoria e TODAS as fotos dela. */
  excluir(id: string): Promise<void>
  enviarFoto(vistoriaId: string, arquivo: Blob): Promise<FotoRef>
  /** Devolve um mapa id da foto -> URL exibível. */
  urlsFotos(refs: FotoRef[]): Promise<Record<string, string>>
  baixarFoto(ref: FotoRef): Promise<Blob>
  removerFotos(refs: FotoRef[]): Promise<void>

  // ----- Histórico de vistorias concluídas (sem fotos) -----
  registrarHistorico(r: RegistroHistorico): Promise<void>
  listarHistorico(): Promise<RegistroHistorico[]>
  excluirHistorico(id: string): Promise<void>
}
