import type { CSSProperties } from 'react'

interface Opcao<T extends string> {
  valor: T
  rotulo: string
}

interface Props<T extends string> {
  opcoes: Opcao<T>[]
  valor: T
  aoMudar: (valor: T) => void
  rotulo: string
  /** "tab" para navegar entre seções; "radio" para escolher um valor. */
  papel?: 'tab' | 'radio'
  className?: string
}

/** Controle segmentado no estilo iOS: o "polegar" desliza com mola até a opção escolhida. */
export default function Segmentado<T extends string>({ opcoes, valor, aoMudar, rotulo, papel = 'radio', className = '' }: Props<T>) {
  const i = Math.max(0, opcoes.findIndex((o) => o.valor === valor))
  const estilo = { '--i': i, '--n': opcoes.length } as CSSProperties

  return (
    <div className={`segmentado ${className}`} role={papel === 'tab' ? 'tablist' : 'radiogroup'} aria-label={rotulo} style={estilo}>
      <span className="segmentado-polegar" aria-hidden="true" />
      {opcoes.map((o) => {
        const ativo = o.valor === valor
        return (
          <button
            key={o.valor}
            type="button"
            role={papel}
            aria-checked={papel === 'radio' ? ativo : undefined}
            aria-selected={papel === 'tab' ? ativo : undefined}
            className={ativo ? 'ativo' : ''}
            onClick={() => aoMudar(o.valor)}
          >
            {o.rotulo}
          </button>
        )
      })}
    </div>
  )
}
