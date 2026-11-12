import { useState } from 'react'
import { carregarConfig, COMODOS_PADRAO, mascararDocumento, salvarConfig } from '../modelo'
import type { Configuracoes as Config } from '../types'

export default function Configuracoes() {
  const [c, setC] = useState<Config>(carregarConfig)
  const [salvo, setSalvo] = useState(false)

  function alterar<K extends keyof Config>(k: K, valor: Config[K]) {
    setC((a) => ({ ...a, [k]: valor }))
    setSalvo(false)
  }

  function salvar() {
    salvarConfig({ ...c, comodosPadrao: c.comodosPadrao.map((s) => s.trim()).filter(Boolean) })
    setSalvo(true)
  }

  return (
    <div className="pagina">
      <header className="topo">
        <a className="btn" href="#/">← Voltar</a>
        <h1>Configurações</h1>
      </header>
      <p className="sutil">
        Estes dados preenchem automaticamente cada nova vistoria criada <strong>neste aparelho</strong>.
      </p>

      <section className="cartao">
        <h2>Administradora</h2>
        <label className="campo">
          <span>Nome</span>
          <input value={c.administradoraNome} onChange={(e) => alterar('administradoraNome', e.target.value)} />
        </label>
        <label className="campo">
          <span>CNPJ / CPF</span>
          <input
            inputMode="numeric"
            value={c.administradoraDocumento}
            onChange={(e) => alterar('administradoraDocumento', mascararDocumento(e.target.value))}
          />
        </label>
      </section>

      <section className="cartao">
        <h2>Padrões da vistoria</h2>
        <label className="campo">
          <span>Cidade/UF (ex.: Florianópolis/SC)</span>
          <input value={c.cidade} onChange={(e) => alterar('cidade', e.target.value)} />
        </label>
        <label className="campo">
          <span>Vistoriador padrão</span>
          <input value={c.vistoriador} onChange={(e) => alterar('vistoriador', e.target.value)} />
        </label>
        <label className="campo">
          <span>Texto de ciência (cabeçalho do laudo)</span>
          <textarea rows={3} value={c.textoCiente} onChange={(e) => alterar('textoCiente', e.target.value)} />
        </label>
        <label className="campo">
          <span>Cômodos padrão (um por linha)</span>
          <textarea
            rows={10}
            value={c.comodosPadrao.join('\n')}
            onChange={(e) => alterar('comodosPadrao', e.target.value.split('\n'))}
          />
        </label>
        <button className="btn" onClick={() => alterar('comodosPadrao', COMODOS_PADRAO)}>
          Restaurar cômodos padrão
        </button>
      </section>

      <button className="btn primario largo" onClick={salvar}>
        Salvar configurações
      </button>
      {salvo && <p className="ok-texto">Configurações salvas.</p>}
    </div>
  )
}
