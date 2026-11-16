import Segmentado from '../components/Segmentado'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Descricao from '../components/Descricao'
import Fotos from '../components/Fotos'
import Icone from '../components/Icone'
import Pessoas from '../components/Pessoas'
import SecaoCard from '../components/SecaoCard'
import { redimensionar } from '../lib/imagens'
import { irPara } from '../lib/rota'
import { novaSecao, novoMedidor, paraHistorico, todasFotos, validarDocumento } from '../modelo'
import CampoDocumento from '../components/CampoDocumento'
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

type Etapa = 'dados' | 'medidores' | 'comodos' | 'fechamento'
const ETAPAS: { id: Etapa; rotulo: string }[] = [
  { id: 'dados', rotulo: 'Dados' },
  { id: 'medidores', rotulo: 'Medidores' },
  { id: 'comodos', rotulo: 'Cômodos' },
  { id: 'fechamento', rotulo: 'Fechamento' },
]

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

  // ---------- Etapa visível (controle segmentado do topo) ----------
  const [etapaAtiva, setEtapaAtiva] = useState<Etapa>('dados')
  const travaEtapa = useRef(0)
  const carregada = v !== null
  useEffect(() => {
    if (!carregada) return
    const f = () => {
      if (Date.now() < travaEtapa.current) return
      const fim = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
      let atual: Etapa = ETAPAS[0].id
      for (const e of ETAPAS) {
        const el = document.getElementById(`etapa-${e.id}`)
        if (el && el.getBoundingClientRect().top < 170) atual = e.id
      }
      setEtapaAtiva(fim ? 'fechamento' : atual)
    }
    f()
    window.addEventListener('scroll', f, { passive: true })
    return () => window.removeEventListener('scroll', f)
  }, [carregada])

  function irParaEtapa(e: Etapa) {
    // Durante a rolagem animada o indicador vai direto ao destino, sem passar pelas etapas do meio.
    travaEtapa.current = Date.now() + 900
    setEtapaAtiva(e)
    document.getElementById(`etapa-${e}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ---------- Laudo (PDF / Word) ----------
  function pendencias(x: Vistoria): string[] {
    const p: string[] = []
    if (!x.endereco.trim()) p.push('Endereço')
    if (!x.locatarios.some((l) => l.nome.trim())) p.push('Nome do locatário')
    if (x.locatarios.some((l) => l.nome.trim() && !l.documento.trim())) p.push('CPF do locatário')
    if (!x.vistoriador.trim()) p.push('Vistoriador')
    if (!x.administradora.nome.trim()) p.push('Administradora')
    // Documentos preenchidos com erro (incompleto ou dígito verificador que não bate)
    const docs = [
      ...x.locatarios.map((l, i) => ({ quem: `locatário ${l.nome.trim() || i + 1}`, doc: l.documento })),
      ...x.testemunhas.map((t, i) => ({ quem: `testemunha ${t.nome.trim() || i + 1}`, doc: t.documento })),
      { quem: 'administradora', doc: x.administradora.documento },
    ]
    for (const { quem, doc } of docs) {
      const { situacao, mensagem } = validarDocumento(doc)
      if (situacao === 'incompleto' || situacao === 'invalido') p.push(`${mensagem} (${quem})`)
    }
    const vazios = x.comodos.filter((c) => !c.descricao.trim() && c.fotos.length === 0).map((c) => c.nome)
    if (vazios.length) p.push(`Cômodos vazios (não irão para o laudo): ${vazios.join(', ')}`)
    return p
  }

  async function gerarLaudo(formato: Formato, conferir = true) {
    if (!v) return
    const nome = NOME_FORMATO[formato]
    const p = conferir ? pendencias(v) : []
    if (p.length && !confirm(`Atenção, confira antes de gerar:\n\n• ${p.join('\n• ')}\n\nGerar o ${nome} mesmo assim?`)) return
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
        <div className="vazio">
          <Icone nome="documento" tamanho={44} />
          <h3>Vistoria não encontrada</h3>
          <p>Ela pode já ter sido apagada depois de gerar o laudo.</p>
          <a className="btn primario" href="#/">
            Voltar para as vistorias
          </a>
        </div>
      </div>
    )
  }
  if (!v) return <div className="centro">{erro ?? 'Abrindo vistoria…'}</div>

  const ocupado = envio !== null
  const textoEstado = { salvo: 'Salvo', pendente: 'Editando…', salvando: 'Salvando…', erro: 'Erro ao salvar' }[estado]
  const comodosFeitos = v.comodos.filter((c) => c.descricao.trim() || c.fotos.length).length

  function alterarMedidor(id: string, alteracao: Partial<{ nome: string; leitura: string }>) {
    atualizar((a) => ({ ...a, medidores: a.medidores.map((x) => (x.id === id ? { ...x, ...alteracao } : x)) }))
  }

  return (
    <div className="editor">
      <header className="navbar">
        <div className="navbar-inner">
          <a className="voltar vidro" href="#/" aria-label="Voltar para as vistorias" title="Vistorias">
            <Icone nome="voltar" tamanho={22} />
          </a>
          <div className="nav-titulo">
            <strong>{v.endereco.split('\n')[0].trim() || 'Nova vistoria'}</strong>
            <span>Vistoria de {v.tipo === 'entrada' ? 'entrada' : 'saída'}</span>
          </div>
          <span className={`estado-salvar ${estado}`} role="status">
            {textoEstado}
          </span>
        </div>
        <div className="navbar-extra">
          <Segmentado<Etapa>
            papel="tab"
            rotulo="Etapas da vistoria"
            valor={etapaAtiva}
            aoMudar={irParaEtapa}
            opcoes={ETAPAS.map((e) => ({ valor: e.id, rotulo: e.rotulo }))}
          />
        </div>
      </header>

      <div className="pagina">
        {erro && (
          <div className="aviso-erro" role="alert">
            <pre>{erro}</pre>
            <button className="btn fantasma pequeno" onClick={() => setErro(null)}>
              OK
            </button>
          </div>
        )}

        {/* Dados da vistoria */}
        <h2 className="grupo-titulo" id="etapa-dados">
          Dados da vistoria
        </h2>
        <section className="grupo grupo-pad">
          <Segmentado
            className="espaco-abaixo"
            rotulo="Tipo de vistoria"
            valor={v.tipo}
            aoMudar={(t) => campo('tipo', t)}
            opcoes={[
              { valor: 'entrada', rotulo: 'Entrada' },
              { valor: 'saida', rotulo: 'Saída' },
            ]}
          />
          <label className="campo">
            <span>Endereço</span>
            <textarea rows={2} value={v.endereco} onChange={(e) => campo('endereco', e.target.value)} />
          </label>
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
          <Pessoas
            titulo="Locatários"
            pessoas={v.locatarios}
            aoMudar={(p) => campo('locatarios', p)}
            rotuloAdicionar="Adicionar locatário"
          />
          <label className="campo sem-margem">
            <span>Vistoria realizada por</span>
            <input value={v.vistoriador} onChange={(e) => campo('vistoriador', e.target.value)} />
          </label>
        </section>

        {/* Medidores e pintura */}
        <h2 className="grupo-titulo" id="etapa-medidores">
          Medidores e pintura
        </h2>
        <section className="grupo grupo-pad">
          {v.medidores.map((m) => (
            <div key={m.id} className="medidor">
              <div className="grade-campos">
                <label className="campo">
                  <span>Medidor</span>
                  <input value={m.nome} onChange={(e) => alterarMedidor(m.id, { nome: e.target.value })} />
                </label>
                <label className="campo">
                  <span>Leitura</span>
                  <input inputMode="decimal" value={m.leitura} onChange={(e) => alterarMedidor(m.id, { leitura: e.target.value })} />
                </label>
                <button
                  type="button"
                  className="btn fantasma icone perigo alinhar-base"
                  aria-label="Remover medidor"
                  title="Remover medidor"
                  onClick={() => {
                    if (m.fotos.length && !confirm(`Remover "${m.nome}" e suas fotos?`)) return
                    atualizar((a) => ({ ...a, medidores: a.medidores.filter((x) => x.id !== m.id) }))
                    repo.removerFotos(m.fotos).catch(() => {})
                  }}
                >
                  <Icone nome="lixo" />
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
            className="btn fantasma"
            onClick={() => atualizar((a) => ({ ...a, medidores: [...a.medidores, novoMedidor('Medidor de gás')] }))}
          >
            <Icone nome="mais" /> Adicionar medidor
          </button>
          <div className="grade-campos espaco-acima">
            <label className="campo sem-margem">
              <span>Cor da tinta interna</span>
              <input value={v.tintaInterna} placeholder="Ex.: Branco Neve / Suvinil" onChange={(e) => campo('tintaInterna', e.target.value)} />
            </label>
            <label className="campo sem-margem">
              <span>Cor da tinta externa</span>
              <input value={v.tintaExterna} onChange={(e) => campo('tintaExterna', e.target.value)} />
            </label>
          </div>
        </section>

        {/* Cômodos */}
        <div className="grupo-titulo-linha" id="etapa-comodos">
          <h2 className="grupo-titulo">Cômodos</h2>
          <span className="grupo-titulo-extra">
            {comodosFeitos} de {v.comodos.length} preenchidos
          </span>
        </div>
        <div className="grupo">
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
          <div className="linha adicionar-comodo">
            <input
              placeholder="Novo cômodo (ex.: Quarto 4)"
              value={novoComodo}
              onChange={(e) => setNovoComodo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && adicionarComodo()}
            />
            <button type="button" className="btn fantasma" onClick={adicionarComodo}>
              <Icone nome="mais" /> Adicionar
            </button>
          </div>
        </div>
        <p className="nota">Toque em um cômodo para fotografar e descrever.</p>

        {/* Fechamento */}
        <h2 className="grupo-titulo" id="etapa-fechamento">
          Fechamento
        </h2>
        <div className="grupo">
          <SecaoCard
            secao={v.entregaChaves}
            urls={urls}
            podeRenomear={false}
            aoMudar={(alt) => atualizar((a) => ({ ...a, entregaChaves: { ...a.entregaChaves, ...alt } }))}
            aoAdicionarFotos={(arq) => adicionarFotos({ tipo: 'chaves' }, arq)}
            aoRemoverFoto={(f) => removerFoto({ tipo: 'chaves' }, f)}
            ocupado={ocupado}
          />
        </div>

        <h2 className="grupo-titulo">Assinaturas</h2>
        <section className="grupo grupo-pad">
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
            <CampoDocumento
              rotulo="CNPJ / CPF da administradora"
              valor={v.administradora.documento}
              aoMudar={(documento) => campo('administradora', { ...v.administradora, documento })}
            />
          </div>
          <Pessoas
            titulo="Testemunhas"
            pessoas={v.testemunhas}
            aoMudar={(p) => campo('testemunhas', p)}
            rotuloAdicionar="Adicionar testemunha"
          />
          <div className="campo sem-margem">
            <span>Texto de ciência (topo do laudo)</span>
            <Descricao valor={v.textoCiente} aoMudar={(t) => campo('textoCiente', t)} placeholder="" />
          </div>
        </section>

        <div className="grupo">
          <button
            type="button"
            className="linha linha-botao perigo"
            onClick={() => confirm('Apagar esta vistoria e todas as fotos? Isso não pode ser desfeito.') && apagarVistoria()}
          >
            Excluir vistoria
          </button>
        </div>
      </div>

      {/* Barra inferior */}
      <div className="toolbar vidro">
        <span className="toolbar-info">
          {envio
            ? `Processando fotos ${envio.feitas} de ${envio.total}…`
            : gerando
              ? gerando.etapa
              : `${comodosFeitos} de ${v.comodos.length} cômodos · ${fotos.length} foto${fotos.length === 1 ? '' : 's'}`}
        </span>
        <div className="toolbar-botoes">
          <button type="button" className="btn" onClick={() => gerarLaudo('docx')} disabled={ocupado || gerando !== null}>
            Word
          </button>
          <button type="button" className="btn primario" onClick={() => gerarLaudo('pdf')} disabled={ocupado || gerando !== null}>
            Gerar PDF
          </button>
        </div>
      </div>

      {gerado && (
        <div className="modal-fundo">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
            <div className="modal-corpo">
              <h2 id="modal-titulo">{NOME_FORMATO[gerado]} gerado</h2>
              <p>
                Abra o arquivo baixado e confira. Depois de salvar o laudo no lugar definitivo (ex.: pasta do imóvel), apague
                os dados da vistoria daqui.
              </p>
              <p className="nota-modal">
                Depois de apagar, o arquivo baixado é a única cópia do laudo. O Histórico guarda só os dados de consulta, sem
                fotos.
              </p>
            </div>
            <div className="modal-botoes">
              <button className="modal-botao perigo" onClick={apagarVistoria}>
                Laudo conferido: apagar dados
              </button>
              <button className="modal-botao" onClick={() => gerarLaudo(gerado === 'pdf' ? 'docx' : 'pdf', false)}>
                Baixar também em {gerado === 'pdf' ? 'Word' : 'PDF'}
              </button>
              <button className="modal-botao forte" onClick={() => setGerado(null)}>
                Continuar editando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
