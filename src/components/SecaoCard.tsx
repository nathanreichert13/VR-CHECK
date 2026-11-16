import { useState } from 'react'
import type { FotoRef, Secao } from '../types'
import Descricao from './Descricao'
import Fotos from './Fotos'
import Icone from './Icone'

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

/** Linha expansível de uma lista agrupada: um cômodo (ou a entrega das chaves). */
export default function SecaoCard({
  secao, urls, aoMudar, aoAdicionarFotos, aoRemoverFoto,
  aoSubir, aoDescer, aoExcluir, podeRenomear = true, abertoInicial = false, ocupado,
}: Props) {
  const [aberto, setAberto] = useState(abertoInicial)
  // O conteúdo só é montado na primeira abertura e depois fica, para animar abrir e fechar.
  const [montado, setMontado] = useState(abertoInicial)

  function alternar() {
    setMontado(true)
    setAberto((a) => !a)
  }

  function mover(f: FotoRef, dir: -1 | 1) {
    const i = secao.fotos.findIndex((x) => x.id === f.id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= secao.fotos.length) return
    const fotos = [...secao.fotos]
    ;[fotos[i], fotos[j]] = [fotos[j], fotos[i]]
    aoMudar({ fotos })
  }

  const temTexto = secao.descricao.trim().length > 0
  const n = secao.fotos.length
  const completo = temTexto && n > 0
  const resumo = completo
    ? `${n} foto${n === 1 ? '' : 's'}`
    : temTexto
      ? 'Sem fotos'
      : n > 0
        ? 'Sem descrição'
        : 'Vazio'

  return (
    <div className={`comodo ${aberto ? 'aberto' : ''}`}>
      <button type="button" className="linha comodo-linha" onClick={alternar} aria-expanded={aberto}>
        <span className="linha-titulo">{secao.nome || 'Sem nome'}</span>
        <span className={`comodo-resumo ${completo ? 'completo' : temTexto || n ? 'parcial' : ''}`}>
          {completo && <Icone nome="check" tamanho={15} />}
          {resumo}
        </span>
        <span className="comodo-seta" aria-hidden="true">
          <Icone nome="direita" tamanho={16} />
        </span>
      </button>

      <div className="comodo-gaveta" inert={!aberto}>
        <div className="comodo-gaveta-interna">
          {montado && (
            <div className="comodo-corpo">
              {podeRenomear && (
                <label className="campo">
                  <span>Nome do cômodo</span>
                  <input value={secao.nome} onChange={(e) => aoMudar({ nome: e.target.value })} />
                </label>
              )}
              <Descricao valor={secao.descricao} aoMudar={(descricao) => aoMudar({ descricao })} />
              <Fotos
                fotos={secao.fotos}
                urls={urls}
                aoAdicionar={aoAdicionarFotos}
                aoRemover={aoRemoverFoto}
                aoMover={mover}
                ocupado={ocupado}
              />
              {(aoSubir || aoDescer || aoExcluir) && (
                <div className="comodo-acoes">
                  <button type="button" className="btn fantasma pequeno" onClick={aoSubir} disabled={!aoSubir}>
                    <Icone nome="cima" tamanho={16} /> Subir
                  </button>
                  <button type="button" className="btn fantasma pequeno" onClick={aoDescer} disabled={!aoDescer}>
                    <Icone nome="baixo" tamanho={16} /> Descer
                  </button>
                  {aoExcluir && (
                    <button type="button" className="btn fantasma pequeno perigo empurrar" onClick={aoExcluir}>
                      Excluir cômodo
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
