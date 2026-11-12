import { dataBR } from '../modelo'
import type { Repositorio } from '../storage/repo'
import type { FotoRef, Pessoa, Secao, Vistoria } from '../types'

/** Cômodos que entram no laudo (os vazios ficam de fora). */
export function comodosDoLaudo(v: Vistoria): Secao[] {
  return v.comodos.filter((c) => c.descricao.trim() || c.fotos.length)
}

export function pessoasPreenchidas(p: Pessoa[]): Pessoa[] {
  return p.filter((x) => x.nome.trim() || x.documento.trim())
}

/** Todas as fotos que aparecem no laudo, na ordem. */
export function fotosDoLaudo(v: Vistoria): FotoRef[] {
  return [
    ...v.medidores.flatMap((m) => m.fotos),
    ...comodosDoLaudo(v).flatMap((c) => c.fotos),
    ...v.entregaChaves.fotos,
  ]
}

const SIMULTANEAS = 4

/**
 * Baixa e prepara (reduz/recorta) as fotos do laudo, 4 de cada vez.
 * Fotos que falharem ficam de fora e são contadas em `falhas`.
 */
export async function prepararFotos(
  v: Vistoria,
  repo: Repositorio,
  preparar: (original: Blob) => Promise<Blob>,
  progresso: (etapa: string) => void,
): Promise<{ fotos: Map<string, Blob>; falhas: number }> {
  const lista = fotosDoLaudo(v)
  const fotos = new Map<string, Blob>()
  let feitas = 0
  let falhas = 0
  let proxima = 0

  progresso(`Preparando fotos 0/${lista.length}…`)
  async function trabalhador() {
    while (proxima < lista.length) {
      const f = lista[proxima++]
      try {
        fotos.set(f.id, await preparar(await repo.baixarFoto(f)))
      } catch {
        falhas++
      }
      feitas++
      progresso(`Preparando fotos ${feitas}/${lista.length}…`)
    }
  }
  await Promise.all(Array.from({ length: SIMULTANEAS }, trabalhador))
  return { fotos, falhas }
}

export function nomeArquivo(v: Vistoria, extensao: 'pdf' | 'docx'): string {
  const tipo = v.tipo === 'entrada' ? 'ENTRADA' : 'SAIDA'
  const endereco = (v.endereco || 'imovel').split(/[–\n]| - /)[0].trim().slice(0, 60)
  const bruto = `VISTORIA ${tipo} - ${endereco} - ${dataBR(v.data).replace(/\//g, '-')}.${extensao}`
  return bruto.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ')
}

/** Dispara o download de um arquivo gerado no navegador. */
export function baixarArquivo(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
