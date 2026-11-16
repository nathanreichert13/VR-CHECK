import { useEffect, useState } from 'react'

/** "sistema" segue o claro/escuro do aparelho. */
export type Tema = 'sistema' | 'claro' | 'escuro'

const CHAVE = 'vr-check:tema'
const consulta = window.matchMedia('(prefers-color-scheme: dark)')

function lerTema(): Tema {
  try {
    const t = localStorage.getItem(CHAVE)
    if (t === 'claro' || t === 'escuro') return t
  } catch {
    // sem acesso ao armazenamento: segue o sistema
  }
  return 'sistema'
}

/** Aplica o tema no <html> e na cor da barra do navegador do celular. */
function aplicar(t: Tema) {
  const raiz = document.documentElement
  if (t === 'sistema') raiz.removeAttribute('data-tema')
  else raiz.setAttribute('data-tema', t)
  const escuro = t === 'escuro' || (t === 'sistema' && consulta.matches)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', escuro ? '#000000' : '#f2f2f7')
}

const ouvintes = new Set<(t: Tema) => void>()
let atual = lerTema()
aplicar(atual)
consulta.addEventListener('change', () => aplicar(atual))

export function definirTema(t: Tema) {
  atual = t
  try {
    if (t === 'sistema') localStorage.removeItem(CHAVE)
    else localStorage.setItem(CHAVE, t)
  } catch {
    // ignora: o tema vale só nesta sessão
  }
  aplicar(t)
  ouvintes.forEach((f) => f(t))
}

/** Tema escolhido + se a tela está escura agora (resolvendo "sistema"). */
export function useTema(): { tema: Tema; escuro: boolean } {
  const [tema, setTema] = useState(atual)
  const [sistemaEscuro, setSistemaEscuro] = useState(consulta.matches)
  useEffect(() => {
    ouvintes.add(setTema)
    const f = () => setSistemaEscuro(consulta.matches)
    consulta.addEventListener('change', f)
    return () => {
      ouvintes.delete(setTema)
      consulta.removeEventListener('change', f)
    }
  }, [])
  return { tema, escuro: tema === 'escuro' || (tema === 'sistema' && sistemaEscuro) }
}
