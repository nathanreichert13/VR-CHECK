import { useEffect, useState } from 'react'

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

/** Roteamento simples por hash (#/, #/v/:id, #/config). */
export function useRota(): Rota {
  const [rota, setRota] = useState(lerRota)
  useEffect(() => {
    const f = () => setRota(lerRota())
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return rota
}
