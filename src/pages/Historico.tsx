import { useEffect, useMemo, useState } from 'react'
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
    <div className="pagina">
      <header className="topo">
        <a className="btn" href="#/">← Voltar</a>
        <h1>Histórico</h1>
      </header>
      <p className="sutil">
        Vistorias concluídas (laudo gerado e dados apagados). Ficam aqui só os dados para consulta, <strong>sem fotos</strong>.
        O laudo completo está no arquivo PDF/Word que foi salvo.
      </p>

      <div className="cartao filtros-historico">
        <input
          type="search"
          placeholder="Buscar por endereço, locatário, CPF, Imb ou contrato…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <div className="segmentado">
          {(['todos', 'entrada', 'saida'] as const).map((t) => (
            <button key={t} type="button" className={tipo === t ? 'ativo' : ''} onClick={() => setTipo(t)}>
              {t === 'todos' ? 'Todas' : t === 'entrada' ? 'Entrada' : 'Saída'}
            </button>
          ))}
        </div>
      </div>

      {erro && <p className="erro">{erro}</p>}
      {itens === null && !erro && <p className="sutil">Carregando…</p>}
      {itens?.length === 0 && <p className="sutil">Nenhuma vistoria concluída ainda.</p>}
      {itens && itens.length > 0 && (
        <p className="sutil">
          {filtrados.length} de {itens.length} vistoria{itens.length === 1 ? '' : 's'}
        </p>
      )}

      <ul className="lista">
        {filtrados.map((r) => (
          <li key={r.id} className="cartao item-historico">
            <div className="item-titulo">
              <strong>{r.endereco || 'Sem endereço'}</strong>
              <span className={`selo ${r.tipo === 'entrada' ? '' : 'saida'}`}>
                {r.tipo === 'entrada' ? 'Entrada' : 'Saída'}
              </span>
            </div>
            <dl className="dados-historico">
              {r.locatarios.map((l, i) => (
                <div key={i}>
                  <dt>Locatário(a)</dt>
                  <dd>
                    {l.nome || '—'}
                    {l.documento && ` · ${rotuloDocumento(l.documento)} ${l.documento}`}
                  </dd>
                </div>
              ))}
              <div>
                <dt>Data da vistoria</dt>
                <dd>{dataBR(r.dataVistoria)}</dd>
              </div>
              {(r.imb || r.contrato) && (
                <div>
                  <dt>Imb / Contrato</dt>
                  <dd>
                    {r.imb || '—'} / {r.contrato || '—'}
                  </dd>
                </div>
              )}
              <div>
                <dt>Vistoriador</dt>
                <dd>{r.vistoriador || '—'}</dd>
              </div>
              <div>
                <dt>Laudo</dt>
                <dd>
                  {r.formatos.map((f) => NOME_FORMATO[f]).join(' e ') || '—'} · gerado em {dataHora(r.laudoGeradoEm)} ·{' '}
                  {r.totalComodos} cômodo{r.totalComodos === 1 ? '' : 's'}, {r.totalFotos} foto{r.totalFotos === 1 ? '' : 's'}
                </dd>
              </div>
              <div>
                <dt>Concluída</dt>
                <dd>
                  {dataHora(r.concluidoEm)}
                  {r.concluidoPor && ` por ${r.concluidoPor}`}
                </dd>
              </div>
            </dl>
            <div className="acoes-historico">
              <button type="button" className="btn perigo" onClick={() => excluir(r)}>
                Remover do histórico
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
