import Segmentado from '../components/Segmentado'
import { useEffect, useMemo, useState } from 'react'
import Icone from '../components/Icone'
import { dataBR, rotuloDocumento } from '../modelo'
import type { Repositorio } from '../storage/repo'
import type { RegistroHistorico, TipoVistoria } from '../types'

/** minúsculas e sem acentos, para a busca achar "joao" em "João". */
function normalizar(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function textoBusca(r: RegistroHistorico): string {
  const partes = [
    r.endereco, r.imb, r.contrato, r.vistoriador,
    ...r.locatarios.flatMap((l) => [l.nome, l.documento, l.documento.replace(/\D/g, '')]),
  ]
  return normalizar(partes.join(' '))
}

function dataHora(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const NOME_FORMATO = { pdf: 'PDF', docx: 'Word' } as const

export default function Historico({ repo }: { repo: Repositorio }) {
  const [itens, setItens] = useState<RegistroHistorico[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState<TipoVistoria | 'todos'>('todos')

  useEffect(() => {
    repo.listarHistorico().then(setItens).catch((e) => setErro(String((e as Error).message ?? e)))
  }, [repo])

  const filtrados = useMemo(() => {
    const termos = normalizar(busca).split(/\s+/).filter(Boolean)
    return (itens ?? []).filter((r) => {
      if (tipo !== 'todos' && r.tipo !== tipo) return false
      if (termos.length === 0) return true
      const alvo = textoBusca(r)
      return termos.every((t) => alvo.includes(t))
    })
  }, [itens, busca, tipo])

  async function excluir(r: RegistroHistorico) {
    if (!confirm(`Remover "${r.endereco || 'sem endereço'}" do histórico? Isso não pode ser desfeito.`)) return
    try {
      await repo.excluirHistorico(r.id)
      setItens((a) => a?.filter((x) => x.id !== r.id) ?? null)
    } catch (e) {
      setErro(`Não foi possível remover: ${(e as Error).message}`)
    }
  }

  return (
    <>
      <h1 className="titulo-grande">Histórico</h1>

      <div className="busca">
        <Icone nome="busca" tamanho={17} />
        <input
          type="search"
          placeholder="Endereço, locatário, CPF, Imb ou contrato"
          aria-label="Buscar no histórico"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>
      <Segmentado
        className="espaco-abaixo"
        rotulo="Tipo de vistoria"
        valor={tipo}
        aoMudar={setTipo}
        opcoes={[
          { valor: 'todos', rotulo: 'Todas' },
          { valor: 'entrada', rotulo: 'Entrada' },
          { valor: 'saida', rotulo: 'Saída' },
        ]}
      />

      {erro && (
        <div className="aviso-erro" role="alert">
          <pre>{erro}</pre>
        </div>
      )}
      {itens === null && !erro && <p className="nota">Carregando…</p>}
      {itens?.length === 0 && (
        <div className="vazio">
          <Icone nome="historico" tamanho={44} />
          <h3>Nenhuma vistoria concluída</h3>
          <p>Quando você gerar o laudo e apagar os dados de uma vistoria, o registro aparece aqui.</p>
        </div>
      )}
      {itens && itens.length > 0 && (
        <p className="nota sem-margem-topo">
          {filtrados.length} de {itens.length} vistoria{itens.length === 1 ? '' : 's'}. Ficam só os dados para consulta, sem
          fotos: o laudo completo está no arquivo salvo.
        </p>
      )}

      {filtrados.map((r) => (
        <section key={r.id} className="grupo registro">
          <div className="linha">
            <div className="linha-corpo">
              <span className="linha-titulo">{r.endereco.split('\n')[0] || 'Sem endereço'}</span>
              <span className="linha-sub">
                Vistoria de {r.tipo === 'entrada' ? 'entrada' : 'saída'} · {dataBR(r.dataVistoria)}
              </span>
            </div>
          </div>
          <dl>
            {r.locatarios.map((l, i) => (
              <div key={i} className="linha linha-info">
                <dt>Locatário</dt>
                <dd>
                  {l.nome || '—'}
                  {l.documento && <small>{`${rotuloDocumento(l.documento)} ${l.documento}`}</small>}
                </dd>
              </div>
            ))}
            {(r.imb || r.contrato) && (
              <div className="linha linha-info">
                <dt>Imb / Contrato</dt>
                <dd>
                  {r.imb || '—'} / {r.contrato || '—'}
                </dd>
              </div>
            )}
            <div className="linha linha-info">
              <dt>Vistoriador</dt>
              <dd>{r.vistoriador || '—'}</dd>
            </div>
            <div className="linha linha-info">
              <dt>Laudo</dt>
              <dd>
                {r.formatos.map((f) => NOME_FORMATO[f]).join(' e ') || '—'}
                <small>
                  {dataHora(r.laudoGeradoEm)} · {r.totalComodos} cômodo{r.totalComodos === 1 ? '' : 's'}, {r.totalFotos} foto
                  {r.totalFotos === 1 ? '' : 's'}
                </small>
              </dd>
            </div>
            <div className="linha linha-info">
              <dt>Concluída</dt>
              <dd>
                {dataHora(r.concluidoEm)}
                {r.concluidoPor && <small>{r.concluidoPor}</small>}
              </dd>
            </div>
          </dl>
          <button type="button" className="linha linha-botao perigo" onClick={() => excluir(r)}>
            Remover do histórico
          </button>
        </section>
      ))}
    </>
  )
}
