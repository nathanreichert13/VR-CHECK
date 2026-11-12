import { useRef } from 'react'
import type { FotoRef } from '../types'

interface Props {
  fotos: FotoRef[]
  urls: Record<string, string>
  aoAdicionar: (arquivos: File[]) => void
  aoRemover: (foto: FotoRef) => void
  aoMover: (foto: FotoRef, direcao: -1 | 1) => void
  ocupado?: boolean
}

export default function Fotos({ fotos, urls, aoAdicionar, aoRemover, aoMover, ocupado }: Props) {
  const galeria = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)

  function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (arquivos.length) aoAdicionar(arquivos)
  }

  return (
    <div className="fotos">
      {fotos.length > 0 && (
        <div className="grade-fotos">
          {fotos.map((f, i) => (
            <figure key={f.id} className="miniatura">
              {urls[f.id] ? (
                <a href={urls[f.id]} target="_blank" rel="noreferrer">
                  <img src={urls[f.id]} alt={`Foto ${i + 1}`} loading="lazy" />
                </a>
              ) : (
                <div className="sem-imagem">…</div>
              )}
              <div className="controles-foto">
                <button type="button" onClick={() => aoMover(f, -1)} disabled={i === 0} aria-label="Mover para a esquerda">
                  ◀
                </button>
                <button type="button" className="perigo" onClick={() => aoRemover(f)} aria-label="Remover foto">
                  ✕
                </button>
                <button type="button" onClick={() => aoMover(f, 1)} disabled={i === fotos.length - 1} aria-label="Mover para a direita">
                  ▶
                </button>
              </div>
            </figure>
          ))}
        </div>
      )}
      <div className="botoes-fotos">
        <button type="button" className="btn" onClick={() => camera.current?.click()} disabled={ocupado}>
          📷 Câmera
        </button>
        <button type="button" className="btn" onClick={() => galeria.current?.click()} disabled={ocupado}>
          🖼️ Galeria / arquivos
        </button>
        <span className="sutil">{fotos.length} foto{fotos.length === 1 ? '' : 's'}</span>
      </div>
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={escolher} />
      <input ref={galeria} type="file" accept="image/*" multiple hidden onChange={escolher} />
    </div>
  )
}
