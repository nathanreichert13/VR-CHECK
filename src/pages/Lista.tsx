import { useEffect, useState } from 'react'
import Icone from '../components/Icone'
import { carregarConfig, criarVistoria, dataBR } from '../modelo'
import { irPara } from '../lib/rota'
import type { Repositorio } from '../storage/repo'
import type { ResumoVistoria, TipoVistoria } from '../types'

interface Props {
  repo: Repositorio
  /** E-mail do login atual (null no modo local). */
  usuario: string | null
}

function haQuanto(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms)) return ''
  const min = Math.round(ms / 60000)
  if (min < 1) return 'Agora'
  if (min < 60) return `${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? 'Ontem' : dataBR(iso.slice(0, 10))
}

export default function Lista({ repo, usuario }: Props) {
  const [itens, setItens] = useState<ResumoVistoria[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [criando, setCriando] = useState<TipoVistoria | null>(null)

  useEffect(() => {
    repo.listar().then(setItens).catch((e) => setErro(String(e.message ?? e)))
  }, [repo])

  async function nova(tipo: TipoVistoria) {
    setCriando(tipo)
    try {
      const v = { ...criarVistoria(carregarConfig()), tipo, criadoPor: usuario ?? '' }
      await repo.salvar(v)
      irPara(`/v/${v.id}`)
    } catch (e) {
      setErro(`Não foi possível criar a vistoria: ${(e as Error).message}`)
      setCriando(null)
    }
  }

  return (
    <>
      <h1 className="titulo-grande">Vistorias</h1>

      <div className="acoes-nova">
        <button className="btn primario grande" onClick={() => nova('entrada')} disabled={criando !== null}>
          {criando === 'entrada' ? 'Criando…' : 'Nova vistoria de entrada'}
        </button>
        <button className="btn grande" onClick={() => nova('saida')} disabled={criando !== null}>
          {criando === 'saida' ? 'Criando…' : 'Nova vistoria de saída'}
        </button>
      </div>

      {erro && (
        <div className="aviso-erro" role="alert">
          <pre>{erro}</pre>
        </div>
      )}

      <h2 className="grupo-titulo">Em andamento</h2>

      {itens === null && !erro && (
        <div className="grupo">
          <div className="linha linha-carregando">Carregando…</div>
        </div>
      )}

      {itens?.length === 0 && (
        <div className="vazio">
          <Icone nome="documento" tamanho={44} />
          <h3>Nenhuma vistoria em andamento</h3>
          <p>Crie uma vistoria de entrada ou de saída. Depois de gerar e salvar o laudo, ela vai para o Histórico.</p>
        </div>
      )}

      {itens && itens.length > 0 && (
        <ul className="grupo">
          {itens.map((v) => (
            <li key={v.id}>
              <a className="linha linha-link" href={`#/v/${v.id}`}>
                <div className="linha-corpo">
                  <span className="linha-titulo">{v.endereco.split('\n')[0] || 'Sem endereço'}</span>
                  <span className="linha-sub">
                    {v.tipo === 'entrada' ? 'Entrada' : 'Saída'} · {dataBR(v.data)}
                    {v.locatario && ` · ${v.locatario}`}
                  </span>
                  {v.status === 'pdf_gerado' && (
                    <span className="linha-sub verde">
                      <Icone nome="check" tamanho={13} /> Laudo gerado
                    </span>
                  )}
                </div>
                <span className="linha-valor">{haQuanto(v.atualizadoEm)}</span>
                <span className="linha-seta" aria-hidden="true">
                  <Icone nome="direita" tamanho={16} />
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {repo.modo === 'local' && (
        <p className="nota">Modo local: sem Supabase configurado, as vistorias ficam salvas só neste navegador.</p>
      )}
    </>
  )
}
