/** Tamanho guardado no armazenamento: bom para dar zoom e servir de prova. */
export const FOTO_LADO_MAX = 1600
export const FOTO_QUALIDADE = 0.78

/** Tamanho usado dentro do PDF (miniaturas de ~6 cm): mantém o arquivo leve. */
export const PDF_LADO_MAX = 900
export const PDF_QUALIDADE = 0.72

function abrirImagem(url: string): Promise<HTMLImageElement> {
  // onload em vez de img.decode(): decode() pode ficar parado com a aba em segundo plano.
  return new Promise((ok, falha) => {
    const i = new Image()
    i.onload = () => ok(i)
    i.onerror = () =>
      falha(
        new Error(
          'Não foi possível abrir esta imagem. Se for HEIC (iPhone), tire a foto pelo botão "Câmera" do sistema ou exporte como JPEG.',
        ),
      )
    i.src = url
  })
}

async function desenhar(
  arquivo: Blob,
  tamanho: (w: number, h: number) => { w: number; h: number; sx: number; sy: number; sw: number; sh: number },
  qualidade: number,
): Promise<Blob> {
  const url = URL.createObjectURL(arquivo)
  try {
    const img = await abrirImagem(url)
    const t = tamanho(img.naturalWidth, img.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = t.w
    canvas.height = t.h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Navegador sem suporte a canvas.')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, t.sx, t.sy, t.sw, t.sh, 0, 0, t.w, t.h)
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', qualidade))
    canvas.width = canvas.height = 0 // libera memória (importante no celular)
    if (!blob) throw new Error('Falha ao comprimir a imagem.')
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Recorta a imagem no formato largura × altura, preenchendo tudo (como "object-fit: cover").
 * Usado no Word, que não recorta imagens sozinho.
 */
export function recortar(arquivo: Blob, largura: number, altura: number, qualidade = PDF_QUALIDADE): Promise<Blob> {
  return desenhar(
    arquivo,
    (w, h) => {
      const escala = Math.max(largura / w, altura / h)
      const sw = largura / escala
      const sh = altura / escala
      return { w: largura, h: altura, sx: (w - sw) / 2, sy: (h - sh) / 2, sw, sh }
    },
    qualidade,
  )
}

/**
 * Redimensiona e comprime uma imagem para JPEG no próprio aparelho.
 * Substitui a macro de redimensionar fotos. A orientação (EXIF) do celular é respeitada
 * porque o navegador já aplica a rotação ao desenhar a imagem.
 */
export function redimensionar(arquivo: Blob, ladoMax = FOTO_LADO_MAX, qualidade = FOTO_QUALIDADE): Promise<Blob> {
  return desenhar(
    arquivo,
    (w, h) => {
      const escala = Math.min(1, ladoMax / Math.max(w, h))
      return {
        w: Math.max(1, Math.round(w * escala)),
        h: Math.max(1, Math.round(h * escala)),
        sx: 0, sy: 0, sw: w, sh: h,
      }
    },
    qualidade,
  )
}
