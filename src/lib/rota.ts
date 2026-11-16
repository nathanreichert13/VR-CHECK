import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

export type Rota =
  | { pagina: 'lista' }
  | { pagina: 'vistoria'; id: string }
  | { pagina: 'config' }
  | { pagina: 'historico' }

function lerRota(): Rota {
  const h = window.location.hash.replace(/^#\/?/, '')
  const [p, id] = h.split('/')
  if (p === 'v' && id) return { pagina: 'vistoria', id }
  if (p === 'config') return { pagina: 'config' }
  if (p === 'historico') return { pagina: 'historico' }
  return { pagina: 'lista' }
}

export function irPara(caminho: string) {
  window.location.hash = caminho
}

/** Nível na pilha de navegação: abrir uma vistoria "empurra" uma tela, voltar "tira". */
const nivel = (r: Rota) => (r.pagina === 'vistoria' ? 1 : 0)

type DocComTransicao = Document & { startViewTransition?: (atualizar: () => void) => unknown }

/**
 * Roteamento simples por hash (#/, #/v/:id, #/config, #/historico).
 * Ao entrar ou sair de uma vistoria usa a View Transitions API para a animação
 * de "push"/"pop" do iOS; entre abas a troca é feita sem transição de página.
 */
export function useRota(): Rota {
  const [rota, setRota] = useState(lerRota)
  const atual = useRef(rota)

  useEffect(() => {
    const f = () => {
      const nova = lerRota()
      const de = nivel(atual.current)
      const para = nivel(nova)
      atual.current = nova
      const doc = document as DocComTransicao
      const semAnimacao = matchMedia('(prefers-reduced-motion: reduce)').matches
      if (de === para || !doc.startViewTransition || semAnimacao) {
        setRota(nova)
        return
      }
      document.documentElement.dataset.transicao = para > de ? 'avancar' : 'voltar'
      doc.startViewTransition(() => {
        flushSync(() => setRota(nova))
        window.scrollTo(0, 0)
      })
    }
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])

  return rota
}
