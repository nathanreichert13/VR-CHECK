import { useEffect, useState } from 'react'
import { carregarConfig, criarVistoria, dataBR } from '../modelo'
import { irPara } from '../lib/rota'
import type { Repositorio } from '../storage/repo'
import type { ResumoVistoria } from '../types'

interface Props {
  repo: Repositorio
  usuario: string | null
  aoSair?: () => void
}

export default function Lista({ repo, usuario, aoSair }: Props) {
  const [itens, setItens] = useState<ResumoVistoria[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)

  useEffect(() => {
    repo.listar().then(setItens).catch((e) => setErro(String(e.message ?? e)))
  }, [repo])

  async function nova() {
    setCriando(true)
    try {
      const v = criarVistoria(carregarConfig())
      await repo.salvar(v)
      irPara(`/v/${v.id}`)
    } catch (e) {
      setErro(`Não foi possível criar a vistoria: ${(e as Error).message}`)
      setCriando(false)
    }
  }

  return (
    <div className="pagina">
      <header className="topo">
        <div>
          <h1>VR-CHECK</h1>
          <span className={`selo ${repo.modo}`}>
            {repo.modo === 'nuvem' ? 'Nuvem' : 'Modo local: dados só neste aparelho'}
          </span>
        </div>
        <div className="acoes-topo">
          <a className="btn" href="#/historico">Histórico</a>
          <a className="btn" href="#/config">Configurações</a>
          {aoSair && (
            <button className="btn" onClick={aoSair} title={usuario ?? ''}>
              Sair
            </button>
          )}
        </div>
      </header>

      <button className="btn primario largo grande" onClick={nova} disabled={criando}>
        + Nova vistoria
      </button>

      {erro && <p className="erro">{erro}</p>}

      <h2 className="subtitulo">Vistorias em andamento</h2>
      {itens === null && !erro && <p className="sutil">Carregando…</p>}
      {itens?.length === 0 && (
        <p className="sutil">Nenhuma vistoria em andamento. Depois de gerar e salvar o laudo (PDF ou Word), a vistoria é apagada daqui.</p>
      )}
      <ul className="lista">
        {itens?.map((v) => (
          <li key={v.id}>
            <a className="cartao item-lista" href={`#/v/${v.id}`}>
              <div className="item-titulo">
                <strong>{v.endereco || 'Sem endereço'}</strong>
                {v.status === 'pdf_gerado' && <span className="selo ok">Laudo gerado</span>}
              </div>
              <div className="sutil">
                Vistoria de {v.tipo === 'entrada' ? 'entrada' : 'saída'} · {dataBR(v.data)}
                {v.imb && ` · Imb ${v.imb}`}
              </div>
              <div className="sutil">
                {v.locatario || 'Locatário não informado'} · {v.totalFotos} fotos
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
