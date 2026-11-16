import type { CSSProperties, ReactNode } from 'react'
import Icone, { type NomeIcone } from './Icone'

export type Aba = 'lista' | 'historico' | 'config'

interface Props {
  aba: Aba
  usuario: string | null
  aoSair?: () => void
  children: ReactNode
}

const ABAS: { id: Aba; href: string; rotulo: string; icone: NomeIcone }[] = [
  { id: 'lista', href: '#/', rotulo: 'Vistorias', icone: 'casa' },
  { id: 'historico', href: '#/historico', rotulo: 'Histórico', icone: 'historico' },
  { id: 'config', href: '#/config', rotulo: 'Ajustes', icone: 'config' },
]

/** Barra superior (abas no computador) e barra de abas inferior no celular. */
export default function Shell({ aba, usuario, aoSair, children }: Props) {
  // posição da "lente" de vidro que desliza até a aba ativa
  const posicao = { '--i': ABAS.findIndex((a) => a.id === aba), '--n': ABAS.length } as CSSProperties

  return (
    <div className="app">
      <header className="navbar">
        <div className="navbar-inner">
          <a className="marca" href="#/">
            <img className="logo-imob" src="/logo-vera-reichert.png" alt="Vera Reichert Negócios Imobiliários" />
          </a>

          <nav className="nav-topo vidro" aria-label="Navegação principal" style={posicao}>
            <span className="lente" aria-hidden="true" />
            {ABAS.map((a) => (
              <a key={a.id} href={a.href} className={aba === a.id ? 'ativo' : ''} aria-current={aba === a.id ? 'page' : undefined}>
                {a.rotulo}
              </a>
            ))}
          </nav>

          <div className="navbar-direita">
            {usuario && <span className="usuario">{usuario}</span>}
            {aoSair && (
              <button type="button" className="btn fantasma pequeno" onClick={aoSair}>
                Sair
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="pagina entrar" key={aba}>
        {children}
      </main>

      <nav className="tabbar vidro" aria-label="Navegação principal" style={posicao}>
        <span className="lente" aria-hidden="true" />
        {ABAS.map((a) => (
          <a key={a.id} href={a.href} className={aba === a.id ? 'ativo' : ''} aria-current={aba === a.id ? 'page' : undefined}>
            <Icone nome={a.icone} tamanho={24} />
            <span>{a.rotulo}</span>
          </a>
        ))}
      </nav>
    </div>
  )
}
