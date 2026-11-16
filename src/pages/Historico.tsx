import { Fragment, useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import Icone from '../components/Icone'
import Segmentado from '../components/Segmentado'
import { dataBR, rotuloDocumento } from '../modelo'
import type { Repositorio } from '../storage/repo'
import type { RegistroHistorico, TipoVistoria } from '../types'

/** minúsculas e sem acentos, para a busca achar "joao" em "João". */
function normalizar(t: string): string {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Login (e-mail) de quem fez a vistoria. Registros antigos não têm: usa quem concluiu. */
function feitaPor(r: RegistroHistorico): string {
  return r.criadoPor || r.concluidoPor || ''
}

function textoBusca(r: RegistroHistorico): string {
  const partes = [
    // E-mail: só o de quem FEZ a vistoria (não o de quem apenas concluiu), para a busca por login ser exata.
    r.endereco, r.imb, r.contrato, r.vistoriador, feitaPor(r),
    ...r.locatarios.flatMap((l) => [l.nome, l.documento, l.documento.replace(/\D/g, '')]),
  ]
  return normalizar(partes.join(' '))
}

/** Permite quebrar a linha logo após o "@" (em vez de no meio do domínio) em telas estreitas. */
function quebravel(email: string): string {
  return email.replace('@', '@​')
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
  const [aberto, setAberto] = useState<string | null>(null)

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
      setAberto(null)
    } catch (e) {
      setErro(`Não foi possível remover: ${(e as Error).message}`)
    }
  }

  function alternar(id: string) {
    setAberto((a) => (a === id ? null : id))
  }

  function teclado(e: KeyboardEvent, id: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      alternar(id)
    }
  }

  return (
    <>
      <h1 className="titulo-grande">Histórico</h1>

      <div className="busca">
        <Icone nome="busca" tamanho={17} />
        <input
          type="search"
          placeholder="E-mail, vistoriador, endereço, locatário, CPF ou Imb"
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
        <>
          <p className="nota sem-margem-topo">
            {filtrados.length} de {itens.length} vistoria{itens.length === 1 ? '' : 's'}. Toque em uma linha para ver os
            detalhes. Ficam só os dados para consulta, sem fotos: o laudo completo está no arquivo salvo.
          </p>

          {filtrados.length === 0 ? (
            <div className="grupo">
              <div className="linha linha-carregando">Nenhuma vistoria encontrada para “{busca}”.</div>
            </div>
          ) : (
            <div className="grupo tabela-historico-moldura">
              <table className="tabela-historico">
                <thead>
                  <tr>
                    <th>Imóvel</th>
                    <th className="col-larga">Data</th>
                    <th className="col-larga">Tipo</th>
                    <th>Feita por</th>
                    <th className="col-seta" aria-hidden="true" />
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((r) => {
                    const expandido = aberto === r.id
                    const email = feitaPor(r)
                    return (
                      <Fragment key={r.id}>
                        <tr
                          className={`linha-tabela ${expandido ? 'aberta' : ''}`}
                          tabIndex={0}
                          role="button"
                          aria-expanded={expandido}
                          onClick={() => alternar(r.id)}
                          onKeyDown={(e) => teclado(e, r.id)}
                        >
                          <td>
                            <span className="celula-titulo">{r.endereco.split('\n')[0] || 'Sem endereço'}</span>
                            <span className="celula-sub">
                              {r.imb ? `Imb ${r.imb}` : 'Sem Imb'}
                              <span className="so-celular">
                                {' · '}
                                {dataBR(r.dataVistoria)} · {r.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                              </span>
                            </span>
                          </td>
                          <td className="col-larga">{dataBR(r.dataVistoria)}</td>
                          <td className="col-larga">{r.tipo === 'entrada' ? 'Entrada' : 'Saída'}</td>
                          <td>
                            <span className="celula-titulo">{r.vistoriador || '—'}</span>
                            <span className="celula-sub celula-email">{email ? quebravel(email) : 'login não registrado'}</span>
                          </td>
                          <td className="col-seta" aria-hidden="true">
                            <Icone nome={expandido ? 'baixo' : 'direita'} tamanho={15} />
                          </td>
                        </tr>
                        {expandido && (
                          <tr className="linha-detalhe">
                            <td colSpan={5}>
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
                                  <dd>
                                    {r.vistoriador || '—'}
                                    <small>Login: {email || 'não registrado'}</small>
                                  </dd>
                                </div>
                                <div className="linha linha-info">
                                  <dt>Laudo</dt>
                                  <dd>
                                    {r.formatos.map((f) => NOME_FORMATO[f]).join(' e ') || '—'}
                                    <small>
                                      {dataHora(r.laudoGeradoEm)} · {r.totalComodos} cômodo{r.totalComodos === 1 ? '' : 's'},{' '}
                                      {r.totalFotos} foto{r.totalFotos === 1 ? '' : 's'}
                                    </small>
                                  </dd>
                                </div>
                                <div className="linha linha-info">
                                  <dt>Concluída</dt>
                                  <dd>
                                    {dataHora(r.concluidoEm)}
                                    {r.concluidoPor && <small>por {r.concluidoPor}</small>}
                                  </dd>
                                </div>
                              </dl>
                              <button type="button" className="linha linha-botao perigo" onClick={() => excluir(r)}>
                                Remover do histórico
                              </button>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  )
}
