import CampoDocumento from './CampoDocumento'
import Icone from './Icone'
import { novaPessoa } from '../modelo'
import type { Pessoa } from '../types'

interface Props {
  titulo: string
  pessoas: Pessoa[]
  aoMudar: (p: Pessoa[]) => void
  rotuloAdicionar: string
}

/** Lista editável de pessoas (nome + CPF/CNPJ): locatários, testemunhas. */
export default function Pessoas({ titulo, pessoas, aoMudar, rotuloAdicionar }: Props) {
  function alterar(id: string, campo: 'nome' | 'documento', valor: string) {
    aoMudar(pessoas.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)))
  }

  return (
    <div className="pessoas">
      <h3 className="subtitulo-campos">{titulo}</h3>
      {pessoas.map((p, i) => (
        <div key={p.id} className="pessoa">
          <label className="campo">
            <span>Nome {pessoas.length > 1 ? i + 1 : ''}</span>
            <input value={p.nome} onChange={(e) => alterar(p.id, 'nome', e.target.value)} />
          </label>
          <CampoDocumento
            className="doc"
            rotulo="CPF / CNPJ"
            valor={p.documento}
            aoMudar={(d) => alterar(p.id, 'documento', d)}
          />
          <button
            type="button"
            className="btn fantasma icone perigo"
            onClick={() => aoMudar(pessoas.filter((x) => x.id !== p.id))}
            aria-label="Remover"
            title="Remover"
          >
            <Icone nome="lixo" />
          </button>
        </div>
      ))}
      <button type="button" className="btn fantasma" onClick={() => aoMudar([...pessoas, novaPessoa()])}>
        <Icone nome="mais" /> {rotuloAdicionar}
      </button>
    </div>
  )
}
