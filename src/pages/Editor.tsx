import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Descricao from '../components/Descricao'
import Fotos from '../components/Fotos'
import Pessoas from '../components/Pessoas'
import SecaoCard from '../components/SecaoCard'
import { redimensionar } from '../lib/imagens'
import { irPara } from '../lib/rota'
import { mascararDocumento, novaSecao, novoMedidor, paraHistorico, todasFotos } from '../modelo'
import type { Repositorio } from '../storage/repo'
import type { FotoRef, Secao, Vistoria } from '../types'

type Alvo = { tipo: 'medidor'; id: string } | { tipo: 'comodo'; id: string } | { tipo: 'chaves' }

function alterarFotos(v: Vistoria, alvo: Alvo, fn: (f: FotoRef[]) => FotoRef[]): Vistoria {
  switch (alvo.tipo) {
    case 'medidor':
      return { ...v, medidores: v.medidores.map((m) => (m.id === alvo.id ? { ...m, fotos: fn(m.fotos) } : m)) }
    case 'comodo':
      return { ...v, comodos: v.comodos.map((c) => (c.id === alvo.id ? { ...c, fotos: fn(c.fotos) } : c)) }
    case 'chaves':
      return { ...v, entregaChaves: { ...v.entregaChaves, fotos: fn(v.entregaChaves.fotos) } }
  }
}

type EstadoSalvar = 'salvo' | 'pendente' | 'salvando' | 'erro'

type Formato = 'pdf' | 'docx'
const NOME_FORMATO: Record<Formato, string> = { pdf: 'PDF', docx: 'Word' }

interface Props {
  id: string
  repo: Repositorio
}

export default function Editor({ id, repo }: Props) {
  const [v, setV] = useState<Vistoria | null>(null)
  const [naoEncontrada, setNaoEncontrada] = useState(false)
  const [estado, setEstado] = useState<EstadoSalvar>('salvo')
  const [erro, setErro] = useState<string | null>(null)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [envio, setEnvio] = useState<{ feitas: number; total: number } | null>(null)
  const [gerando, setGerando] = useState<{ etapa: string } | null>(null)
  /** Formato recém-gerado: abre a janela "conferiu e salvou? apagar dados". */
  const [gerado, setGerado] = useState<Formato | null>(null)
  const [novoComodo, setNovoComodo] = useState('')
  const [comodoRecente, setComodoRecente] = useState<string | null>(null)

  const atual = useRef<Vistoria | null>(null)
  atual.current = v
  const carregou = useRef(false)
  /** Depois de apagada, nenhum salvamento pendente pode recriar a vistoria. */
  const apagada = useRef(false)

  // ---------- Carregar ----------
  useEffect(() => {
    repo
      .carregar(id)
      .then((dados) => {
        if (!dados) setNaoEncontrada(true)
        else setV(dados)
      })
      .catch((e) => setErro(`Erro ao abrir a vistoria: ${(e as Error).message}`))
  }, [id, repo])

  // ---------- Salvamento automático ----------
  const salvarAgora = useCallback(async () => {
    const dados = atual.current
    if (!dados || apagada.current) return
    setEstado('salvando')
    try {
      await repo.salvar(dados)
      // Só marca "salvo" se nada mudou durante o envio.
      setEstado(atual.current === dados ? 'salvo' : 'pendente')
    } catch (e) {
      setEstado('erro')
      setErro(`Não foi possível salvar: ${(e as Error).message}`)
    }
  }, [repo])

  useEffect(() => {
    if (!v) return
    if (!carregou.current) {
      carregou.current = true
      return
    }
    setEstado('pendente')
    const t = setTimeout(salvarAgora, 800)
    return () => clearTimeout(t)
  }, [v, salvarAgora])

  useEffect(() => {
    const aoEsconder = () => {
      if (document.visibilityState === 'hidden' && atual.current && !apagada.current) {
        repo.salvar(atual.current).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', aoEsconder)
    return () => document.removeEventListener('visibilitychange', aoEsconder)
  }, [repo])

  // ---------- URLs das miniaturas ----------
  const fotos = useMemo(() => (v ? todasFotos(v) : []), [v])
  useEffect(() => {
    const faltando = fotos.filter((f) => !urls[f.id])
    if (faltando.length === 0) return
    let cancelado = false
    repo
      .urlsFotos(faltando)
      .then((m) => !cancelado && setUrls((u) => ({ ...u, ...m })))
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [fotos, urls, repo])

  // ---------- Alterações ----------
  const atualizar = useCallback((fn: (v: Vistoria) => Vistoria) => {
    setV((a) => (a ? { ...fn(a), atualizadoEm: new Date().toISOString() } : a))
  }, [])

  function campo<K extends keyof Vistoria>(k: K, valor: Vistoria[K]) {
    atualizar((a) => ({ ...a, [k]: valor }))
  }

  function alterarComodo(cid: string, alteracao: Partial<Secao>) {
    atualizar((a) => ({ ...a, comodos: a.comodos.map((c) => (c.id === cid ? { ...c, ...alteracao } : c)) }))
  }

  function moverComodo(cid: string, dir: -1 | 1) {
    atualizar((a) => {
      const i = a.comodos.findIndex((c) => c.id === cid)
      const j = i + dir
      if (i < 0 || j < 0 || j >= a.comodos.length) return a
      const comodos = [...a.comodos]
      ;[comodos[i], comodos[j]] = [comodos[j], comodos[i]]
      return { ...a, comodos }
    })
  }

  function excluirComodo(c: Secao) {
    const temConteudo = c.descricao.trim() || c.fotos.length
    if (temConteudo && !confirm(`Excluir "${c.nome}" com ${c.fotos.length} foto(s) e o texto?`)) return
    atualizar((a) => ({ ...a, comodos: a.comodos.filter((x) => x.id !== c.id) }))
    repo.removerFotos(c.fotos).catch(() => {})
  }

  function adicionarComodo() {
    const nome = novoComodo.trim() || `Cômodo ${(v?.comodos.length ?? 0) + 1}`
    const s = novaSecao(nome)
    atualizar((a) => ({ ...a, comodos: [...a.comodos, s] }))
    setComodoRecente(s.id)
    setNovoComodo('')
  }

  async function adicionarFotos(alvo: Alvo, arquivos: File[]) {
    if (!v) return
    const falhas: string[] = []
    setEnvio({ feitas: 0, total: arquivos.length })
    for (let i = 0; i < arquivos.length; i++) {
      try {
        const blob = await redimensionar(arquivos[i])
        const ref = await repo.enviarFoto(v.id, blob)
        const m = await repo.urlsFotos([ref])
        setUrls((u) => ({ ...u, ...m }))
        atualizar((a) => alterarFotos(a, alvo, (f) => [...f, ref]))
      } catch (e) {
        falhas.push(`${arquivos[i].name}: ${(e as Error).message}`)
      }
      setEnvio({ feitas: i + 1, total: arquivos.length })
    }
    setEnvio(null)
    if (falhas.length) setErro(`Algumas fotos não foram adicionadas:\n${falhas.join('\n')}`)
  }

  function removerFoto(alvo: Alvo, foto: FotoRef) {
    if (!confirm('Remover esta foto?')) return
    atualizar((a) => alterarFotos(a, alvo, (f) => f.filter((x) => x.id !== foto.id)))
    repo.removerFotos([foto]).catch(() => {})
  }

  function moverFoto(alvo: Alvo, foto: FotoRef, dir: -1 | 1) {
    atualizar((a) =>
      alterarFotos(a, alvo, (f) => {
        const i = f.findIndex((x) => x.id === foto.id)
        const j = i + dir
        if (i < 0 || j < 0 || j >= f.length) return f
        const n = [...f]
        ;[n[i], n[j]] = [n[j], n[i]]
        return n
      }),
    )
  }

  // ---------- Laudo (PDF / Word) ----------
  function pendencias(x: Vistoria): string[] {
    const p: string[] = []
    if (!x.endereco.trim()) p.push('Endereço')
    if (!x.locatarios.some((l) => l.nome.trim())) p.push('Nome do locatário')
    if (x.locatarios.some((l) => l.nome.trim() && !l.documento.trim())) p.push('CPF do locatário')
    if (!x.vistoriador.trim()) p.push('Vistoriador')
    if (!x.administradora.nome.trim()) p.push('Administradora')
    const vazios = x.comodos.filter((c) => !c.descricao.trim() && c.fotos.length === 0).map((c) => c.nome)
    if (vazios.length) p.push(`Cômodos vazios (não irão para o laudo): ${vazios.join(', ')}`)
    return p
  }

  async function gerarLaudo(formato: Formato, conferir = true) {
    if (!v) return
    const nome = NOME_FORMATO[formato]
    const p = conferir ? pendencias(v) : []
    if (p.length && !confirm(`Atenção, faltam:\n\n• ${p.join('\n• ')}\n\nGerar o ${nome} mesmo assim?`)) return
    setErro(null)
    setGerado(null)
    setGerando({ etapa: 'Preparando…' })
    try {
      await salvarAgora()
      const progresso = (etapa: string) => setGerando({ etapa })
      const { nomeArquivo, baixarArquivo } = await import('../lib/laudo')
      const { blob, falhas } =
        formato === 'pdf'
          ? await (await import('../pdf/gerarPdf')).gerarLaudoPdf(v, repo, progresso)
          : await (await import('../word/gerarDocx')).gerarLaudoDocx(v, repo, progresso)
      baixarArquivo(blob, nomeArquivo(v, formato))
      if (falhas > 0) setErro(`${falhas} foto(s) não puderam ser incluídas no ${nome}.`)
      const em = new Date().toISOString()
      atualizar((a) => ({ ...a, status: 'pdf_gerado', laudosGerados: [...(a.laudosGerados ?? []), { formato, em }] }))
      setGerado(formato)
    } catch (e) {
      setErro(`Erro ao gerar o ${nome}: ${(e as Error).message}`)
    } finally {
      setGerando(null)
    }
  }

  async function apagarVistoria() {
    const atualV = atual.current
    if (!atualV) return
    apagada.current = true
    try {
      // Vistoria com laudo gerado = concluída: guarda um registro (sem fotos) no histórico antes de apagar.
      // Se o registro falhar, nada é apagado.
      if (atualV.status === 'pdf_gerado') await repo.registrarHistorico(paraHistorico(atualV))
      await repo.excluir(atualV.id)
      irPara('/')
    } catch (e) {
      apagada.current = false
      setErro(`Não foi possível apagar: ${(e as Error).message}`)
    }
  }

  // ---------- Render ----------
  if (naoEncontrada) {
    return (
      <div className="pagina">
        <p>Vistoria não encontrada (pode já ter sido apagada após gerar o PDF).</p>
        <a className="btn" href="#/">← Voltar</a>
      </div>
    )
  }
  if (!v) return <div className="centro">{erro ?? 'Abrindo vistoria…'}</div>

  const ocupado = envio !== null
  const textoEstado = { salvo: '✓ Salvo', pendente: 'Alterações…', salvando: 'Salvando…', erro: '⚠ Erro ao salvar' }[estado]

  return (
    <div className="pagina editor">
      <header className="topo fixo">
        <a className="btn" href="#/">← Vistorias</a>
        <span className={`estado-salvar ${estado}`}>{textoEstado}</span>
      </header>

      {erro && (
        <div className="erro caixa" role="alert">
          <pre>{erro}</pre>
          <button className="btn" onClick={() => setErro(null)}>OK</button>
        </div>
      )}

      {/* Dados da vistoria */}
      <section className="cartao">
        <h2>Dados da vistoria</h2>
        <div className="segmentado">
          {(['entrada', 'saida'] as const).map((t) => (
            <button key={t} type="button" className={v.tipo === t ? 'ativo' : ''} onClick={() => campo('tipo', t)}>
              {t === 'entrada' ? 'Entrada' : 'Saída'}
            </button>
          ))}
        </div>
        <div className="grade-campos">
          <label className="campo">
            <span>Data da vistoria</span>
            <input type="date" value={v.data} onChange={(e) => campo('data', e.target.value)} />
          </label>
          <label className="campo">
            <span>Imb</span>
            <input value={v.imb} onChange={(e) => campo('imb', e.target.value)} />
          </label>
          <label className="campo">
            <span>Nº do contrato</span>
            <input value={v.contrato} onChange={(e) => campo('contrato', e.target.value)} />
          </label>
        </div>
        <label className="campo">
          <span>Endereço</span>
          <textarea rows={2} value={v.endereco} onChange={(e) => campo('endereco', e.target.value)} />
        </label>
        <Pessoas
          titulo="Locatário(s)"
          pessoas={v.locatarios}
          aoMudar={(p) => campo('locatarios', p)}
          rotuloAdicionar="Adicionar locatário"
        />
        <label className="campo">
          <span>Vistoria realizada por</span>
          <input value={v.vistoriador} onChange={(e) => campo('vistoriador', e.target.value)} />
        </label>
      </section>

      {/* Medidores e pintura */}
      <section className="cartao">
        <h2>Medidores e pintura</h2>
        {v.medidores.map((m) => (
          <div key={m.id} className="medidor">
            <div className="grade-campos">
              <label className="campo">
                <span>Medidor</span>
                <input
                  value={m.nome}
                  onChange={(e) =>
                    atualizar((a) => ({
                      ...a,
                      medidores: a.medidores.map((x) => (x.id === m.id ? { ...x, nome: e.target.value } : x)),
                    }))
                  }
                />
              </label>
              <label className="campo">
                <span>Leitura</span>
                <input
                  inputMode="decimal"
                  value={m.leitura}
                  onChange={(e) =>
                    atualizar((a) => ({
                      ...a,
                      medidores: a.medidores.map((x) => (x.id === m.id ? { ...x, leitura: e.target.value } : x)),
                    }))
                  }
                />
              </label>
              <button
                type="button"
                className="btn icone perigo alinhar-base"
                aria-label="Remover medidor"
                onClick={() => {
                  if (m.fotos.length && !confirm(`Remover "${m.nome}" e suas fotos?`)) return
                  atualizar((a) => ({ ...a, medidores: a.medidores.filter((x) => x.id !== m.id) }))
                  repo.removerFotos(m.fotos).catch(() => {})
                }}
              >
                ✕
              </button>
            </div>
            <Fotos
              fotos={m.fotos}
              urls={urls}
              aoAdicionar={(arq) => adicionarFotos({ tipo: 'medidor', id: m.id }, arq)}
              aoRemover={(f) => removerFoto({ tipo: 'medidor', id: m.id }, f)}
              aoMover={(f, d) => moverFoto({ tipo: 'medidor', id: m.id }, f, d)}
              ocupado={ocupado}
            />
          </div>
        ))}
        <button
          type="button"
          className="btn"
          onClick={() => atualizar((a) => ({ ...a, medidores: [...a.medidores, novoMedidor('Medidor de gás')] }))}
        >
          + Adicionar medidor
        </button>
        <div className="grade-campos">
          <label className="campo">
            <span>Cor da tinta interna</span>
            <input value={v.tintaInterna} placeholder="Ex.: Branco Neve / Suvinil" onChange={(e) => campo('tintaInterna', e.target.value)} />
          </label>
          <label className="campo">
            <span>Cor da tinta externa</span>
            <input value={v.tintaExterna} onChange={(e) => campo('tintaExterna', e.target.value)} />
          </label>
        </div>
      </section>

      {/* Cômodos */}
      <h2 className="subtitulo">Cômodos ({v.comodos.length})</h2>
      {v.comodos.map((c, i) => (
        <SecaoCard
          key={c.id}
          secao={c}
          urls={urls}
          abertoInicial={c.id === comodoRecente}
          aoMudar={(alt) => alterarComodo(c.id, alt)}
          aoAdicionarFotos={(arq) => adicionarFotos({ tipo: 'comodo', id: c.id }, arq)}
          aoRemoverFoto={(f) => removerFoto({ tipo: 'comodo', id: c.id }, f)}
          aoSubir={i > 0 ? () => moverComodo(c.id, -1) : undefined}
          aoDescer={i < v.comodos.length - 1 ? () => moverComodo(c.id, 1) : undefined}
          aoExcluir={() => excluirComodo(c)}
          ocupado={ocupado}
        />
      ))}
      <div className="cartao adicionar-comodo">
        <input
          placeholder="Nome do novo cômodo (ex.: Quarto 4)"
          value={novoComodo}
          onChange={(e) => setNovoComodo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && adicionarComodo()}
        />
        <button type="button" className="btn primario" onClick={adicionarComodo}>
          + Adicionar cômodo
        </button>
      </div>

      {/* Entrega das chaves */}
      <h2 className="subtitulo">Fechamento</h2>
      <SecaoCard
        secao={v.entregaChaves}
        urls={urls}
        podeRenomear={false}
        aoMudar={(alt) => atualizar((a) => ({ ...a, entregaChaves: { ...a.entregaChaves, ...alt } }))}
        aoAdicionarFotos={(arq) => adicionarFotos({ tipo: 'chaves' }, arq)}
        aoRemoverFoto={(f) => removerFoto({ tipo: 'chaves' }, f)}
        ocupado={ocupado}
      />

      {/* Assinaturas */}
      <section className="cartao">
        <h2>Assinaturas</h2>
        <div className="grade-campos">
          <label className="campo">
            <span>Cidade/UF</span>
            <input value={v.cidade} placeholder="Ex.: Florianópolis/SC" onChange={(e) => campo('cidade', e.target.value)} />
          </label>
          <label className="campo">
            <span>Data da assinatura</span>
            <input type="date" value={v.dataAssinatura} onChange={(e) => campo('dataAssinatura', e.target.value)} />
          </label>
        </div>
        <div className="grade-campos">
          <label className="campo">
            <span>Administradora</span>
            <input
              value={v.administradora.nome}
              onChange={(e) => campo('administradora', { ...v.administradora, nome: e.target.value })}
            />
          </label>
          <label className="campo">
            <span>CNPJ / CPF da administradora</span>
            <input
              inputMode="numeric"
              value={v.administradora.documento}
              onChange={(e) => campo('administradora', { ...v.administradora, documento: mascararDocumento(e.target.value) })}
            />
          </label>
        </div>
        <Pessoas
          titulo="Testemunhas"
          pessoas={v.testemunhas}
          aoMudar={(p) => campo('testemunhas', p)}
          rotuloAdicionar="Adicionar testemunha"
        />
        <div className="campo">
          <span>Texto de ciência (topo do laudo)</span>
          <Descricao valor={v.textoCiente} aoMudar={(t) => campo('textoCiente', t)} placeholder="" />
        </div>
      </section>

      <section className="cartao zona-perigo">
        <button
          type="button"
          className="btn perigo"
          onClick={() => confirm('Apagar esta vistoria e todas as fotos? Isso não pode ser desfeito.') && apagarVistoria()}
        >
          Excluir vistoria
        </button>
      </section>

      {/* Barra inferior */}
      <div className="barra-inferior">
        {envio ? (
          <span>
            Processando fotos {envio.feitas}/{envio.total}…
          </span>
        ) : gerando ? (
          <span className="etapa">{gerando.etapa}</span>
        ) : (
          <span className="sutil etapa">
            {fotos.length} fotos · {v.comodos.length} cômodos
          </span>
        )}
        <div className="botoes-laudo">
          <button type="button" className="btn" onClick={() => gerarLaudo('docx')} disabled={ocupado || gerando !== null}>
            📝 Word
          </button>
          <button type="button" className="btn primario" onClick={() => gerarLaudo('pdf')} disabled={ocupado || gerando !== null}>
            📄 PDF
          </button>
        </div>
      </div>

      {gerado && (
        <div className="modal-fundo">
          <div className="cartao modal">
            <h2>{NOME_FORMATO[gerado]} gerado</h2>
            <p>
              Abra o arquivo baixado e confira se está tudo certo. Depois de <strong>salvar o laudo no lugar definitivo</strong>{' '}
              (ex.: pasta do imóvel no Dropbox), apague os dados da vistoria daqui para liberar espaço.
            </p>
            <p className="aviso">
              Depois de apagar, os arquivos baixados serão a única cópia do laudo. No <strong>Histórico</strong> ficam só os dados
              para consulta (endereço, locatário, datas), sem fotos.
            </p>
            <div className="botoes-modal">
              <button className="btn" onClick={() => gerarLaudo(gerado === 'pdf' ? 'docx' : 'pdf', false)}>
                Baixar também em {gerado === 'pdf' ? 'Word' : 'PDF'}
              </button>
              <button className="btn" onClick={() => setGerado(null)}>
                Ainda não, continuar editando
              </button>
              <button className="btn perigo-cheio" onClick={apagarVistoria}>
                Laudo conferido e salvo: apagar dados
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
