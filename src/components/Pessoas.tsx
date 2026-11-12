import { mascararDocumento, novaPessoa } from '../modelo'
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
      <h3>{titulo}</h3>
      {pessoas.map((p, i) => (
        <div key={p.id} className="pessoa">
          <label className="campo">
            <span>Nome {pessoas.length > 1 ? i + 1 : ''}</span>
            <input value={p.nome} onChange={(e) => alterar(p.id, 'nome', e.target.value)} />
          </label>
          <label className="campo doc">
            <span>CPF / CNPJ</span>
            <input
              inputMode="numeric"
              value={p.documento}
              onChange={(e) => alterar(p.id, 'documento', mascararDocumento(e.target.value))}
            />
          </label>
          <button
            type="button"
            className="btn icone perigo"
            onClick={() => aoMudar(pessoas.filter((x) => x.id !== p.id))}
            aria-label="Remover"
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="btn" onClick={() => aoMudar([...pessoas, novaPessoa()])}>
        + {rotuloAdicionar}
      </button>
    </div>
  )
}
