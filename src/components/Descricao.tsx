import { useRef } from 'react'
import { ditadoSuportado, juntarTexto, useDitado } from '../lib/ditado'

interface Props {
  valor: string
  aoMudar: (texto: string) => void
  placeholder?: string
}

/** Campo de texto com botão de ditado por voz. */
export default function Descricao({ valor, aoMudar, placeholder }: Props) {
  // Guarda o valor mais recente para o ditado não sobrescrever o que acabou de ser digitado/ditado.
  const atual = useRef(valor)
  atual.current = valor

  const { ouvindo, parcial, erro, iniciar, parar } = useDitado((trecho) => {
    const novo = juntarTexto(atual.current, trecho)
    atual.current = novo
    aoMudar(novo)
  })

  return (
    <div className="descricao">
      <textarea
        rows={5}
        value={valor}
        placeholder={placeholder ?? 'Descreva o estado do cômodo…'}
        onChange={(e) => aoMudar(e.target.value)}
      />
      {ouvindo && parcial && <p className="parcial">{parcial}…</p>}
      <div className="linha-ditado">
        {ditadoSuportado ? (
          <button type="button" className={`btn ${ouvindo ? 'gravando' : ''}`} onClick={ouvindo ? parar : iniciar}>
            {ouvindo ? '⏹ Parar ditado' : '🎤 Ditar'}
          </button>
        ) : (
          <span className="sutil">Dica: use o microfone do teclado do celular para ditar.</span>
        )}
        {ouvindo && <span className="sutil">Ouvindo… fale normalmente</span>}
      </div>
      {erro && <p className="erro">{erro}</p>}
    </div>
  )
}
