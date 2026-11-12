import { useState } from 'react'
import type { FotoRef, Secao } from '../types'
import Descricao from './Descricao'
import Fotos from './Fotos'

interface Props {
  secao: Secao
  urls: Record<string, string>
  /** Aplica as alterações sobre a versão mais recente da seção. */
  aoMudar: (alteracao: Partial<Secao>) => void
  aoAdicionarFotos: (arquivos: File[]) => void
  aoRemoverFoto: (f: FotoRef) => void
  /** Ausentes = seção fixa (ex.: Entrega das chaves). */
  aoSubir?: () => void
  aoDescer?: () => void
  aoExcluir?: () => void
  podeRenomear?: boolean
  abertoInicial?: boolean
  ocupado?: boolean
}

export default function SecaoCard({
  secao, urls, aoMudar, aoAdicionarFotos, aoRemoverFoto,
  aoSubir, aoDescer, aoExcluir, podeRenomear = true, abertoInicial = false, ocupado,
}: Props) {
  const [aberto, setAberto] = useState(abertoInicial)

  function mover(f: FotoRef, dir: -1 | 1) {
    const i = secao.fotos.findIndex((x) => x.id === f.id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= secao.fotos.length) return
    const fotos = [...secao.fotos]
    ;[fotos[i], fotos[j]] = [fotos[j], fotos[i]]
    aoMudar({ fotos })
  }

  const temTexto = secao.descricao.trim().length > 0

  return (
    <section className={`cartao secao ${aberto ? 'aberta' : ''}`}>
      <div className="secao-cabecalho">
        <button type="button" className="alternar" onClick={() => setAberto(!aberto)} aria-expanded={aberto}>
          {aberto ? '▾' : '▸'}
        </button>
        {podeRenomear && aberto ? (
          <input
            className="nome-secao"
            value={secao.nome}
            onChange={(e) => aoMudar({ nome: e.target.value })}
            aria-label="Nome do cômodo"
          />
        ) : (
          <button type="button" className="nome-secao texto" onClick={() => setAberto(!aberto)}>
            {secao.nome || 'Sem nome'}
          </button>
        )}
        <span className="indicadores">
          <span className={temTexto ? 'ok-texto' : 'sutil'}>{temTexto ? '✓ texto' : 'sem texto'}</span>
          <span className="sutil">· {secao.fotos.length} 📷</span>
        </span>
        {aberto && (aoSubir || aoDescer || aoExcluir) && (
          <span className="acoes-secao">
            <button type="button" className="btn icone" onClick={aoSubir} disabled={!aoSubir} aria-label="Subir">
              ↑
            </button>
            <button type="button" className="btn icone" onClick={aoDescer} disabled={!aoDescer} aria-label="Descer">
              ↓
            </button>
            <button type="button" className="btn icone perigo" onClick={aoExcluir} aria-label="Excluir cômodo">
              ✕
            </button>
          </span>
        )}
      </div>
      {aberto && (
        <div className="secao-corpo">
          <Descricao valor={secao.descricao} aoMudar={(descricao) => aoMudar({ descricao })} />
          <Fotos
            fotos={secao.fotos}
            urls={urls}
            aoAdicionar={aoAdicionarFotos}
            aoRemover={aoRemoverFoto}
            aoMover={mover}
            ocupado={ocupado}
          />
        </div>
      )}
    </section>
  )
}
