import Segmentado from '../components/Segmentado'
import { useState } from 'react'
import { definirTema, useTema, type Tema } from '../lib/tema'
import { carregarConfig, COMODOS_PADRAO, mascararDocumento, salvarConfig } from '../modelo'
import type { Configuracoes as Config } from '../types'

export default function Configuracoes() {
  const [c, setC] = useState<Config>(carregarConfig)
  const [salvo, setSalvo] = useState(false)
  const { tema } = useTema()

  function alterar<K extends keyof Config>(k: K, valor: Config[K]) {
    setC((a) => ({ ...a, [k]: valor }))
    setSalvo(false)
  }

  function salvar() {
    salvarConfig({ ...c, comodosPadrao: c.comodosPadrao.map((s) => s.trim()).filter(Boolean) })
    setSalvo(true)
  }

  return (
    <>
      <h1 className="titulo-grande">Ajustes</h1>

      <h2 className="grupo-titulo">Aparência</h2>
      <div className="grupo grupo-pad">
        <Segmentado<Tema>
          rotulo="Tema"
          valor={tema}
          aoMudar={definirTema}
          opcoes={[
            { valor: 'sistema', rotulo: 'Automático' },
            { valor: 'claro', rotulo: 'Claro' },
            { valor: 'escuro', rotulo: 'Escuro' },
          ]}
        />
      </div>
      <p className="nota">Automático acompanha o modo claro ou escuro do aparelho.</p>

      <h2 className="grupo-titulo">Administradora</h2>
      <div className="grupo grupo-pad">
        <label className="campo">
          <span>Nome</span>
          <input value={c.administradoraNome} onChange={(e) => alterar('administradoraNome', e.target.value)} />
        </label>
        <label className="campo sem-margem">
          <span>CNPJ / CPF</span>
          <input
            inputMode="numeric"
            value={c.administradoraDocumento}
            onChange={(e) => alterar('administradoraDocumento', mascararDocumento(e.target.value))}
          />
        </label>
      </div>

      <h2 className="grupo-titulo">Padrões da vistoria</h2>
      <div className="grupo grupo-pad">
        <label className="campo">
          <span>Cidade/UF</span>
          <input value={c.cidade} placeholder="Ex.: Florianópolis/SC" onChange={(e) => alterar('cidade', e.target.value)} />
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
        <button className="btn fantasma" onClick={() => alterar('comodosPadrao', COMODOS_PADRAO)}>
          Restaurar cômodos padrão
        </button>
      </div>
      <p className="nota">Esses dados preenchem cada nova vistoria criada neste aparelho.</p>

      <button className="btn primario grande largo espaco-acima" onClick={salvar}>
        {salvo ? 'Salvo' : 'Salvar'}
      </button>
    </>
  )
}
