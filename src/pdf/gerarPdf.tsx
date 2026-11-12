import { pdf } from '@react-pdf/renderer'
import { PDF_LADO_MAX, PDF_QUALIDADE, redimensionar } from '../lib/imagens'
import { prepararFotos } from '../lib/laudo'
import type { Repositorio } from '../storage/repo'
import type { Vistoria } from '../types'
import LaudoPdf from './LaudoPdf'

/**
 * Gera o laudo em PDF no próprio navegador.
 * As fotos são baixadas e reduzidas para o tamanho do PDF antes da montagem.
 */
export async function gerarLaudoPdf(
  v: Vistoria,
  repo: Repositorio,
  progresso: (etapa: string) => void,
): Promise<{ blob: Blob; falhas: number }> {
  const { fotos, falhas } = await prepararFotos(
    v,
    repo,
    (original) => redimensionar(original, PDF_LADO_MAX, PDF_QUALIDADE),
    progresso,
  )
  const urls: Record<string, string> = {}
  fotos.forEach((blob, id) => (urls[id] = URL.createObjectURL(blob)))
  try {
    progresso('Montando o PDF…')
    const blob = await pdf(<LaudoPdf v={v} urls={urls} />).toBlob()
    return { blob, falhas }
  } finally {
    Object.values(urls).forEach((u) => URL.revokeObjectURL(u))
  }
}
