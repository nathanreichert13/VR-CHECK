import { useId, useState } from 'react'
import { mascararDocumento, validarDocumento } from '../modelo'

interface Props {
  rotulo: string
  valor: string
  aoMudar: (documento: string) => void
  className?: string
}

/**
 * Campo de CPF/CNPJ com máscara e conferência dos dígitos verificadores.
 * "Incompleto" só aparece depois que a pessoa sai do campo (para não incomodar enquanto digita);
 * "inválido" (11 ou 14 dígitos que não batem) aparece na hora.
 */
export default function CampoDocumento({ rotulo, valor, aoMudar, className = '' }: Props) {
  const [digitando, setDigitando] = useState(false)
  const idAviso = useId()
  const { situacao, mensagem } = validarDocumento(valor)
  const mostrar = situacao === 'invalido' || (situacao === 'incompleto' && !digitando)

  return (
    <label className={`campo ${className}`}>
      <span>{rotulo}</span>
      <input
        inputMode="numeric"
        autoComplete="off"
        value={valor}
        className={mostrar ? 'invalido' : ''}
        aria-invalid={mostrar}
        aria-describedby={mostrar ? idAviso : undefined}
        onFocus={() => setDigitando(true)}
        onBlur={() => setDigitando(false)}
        onChange={(e) => aoMudar(mascararDocumento(e.target.value))}
      />
      {mostrar && (
        <small id={idAviso} className="campo-aviso" role="status">
          {mensagem}
        </small>
      )}
    </label>
  )
}
