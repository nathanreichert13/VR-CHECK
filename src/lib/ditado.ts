import { useCallback, useEffect, useRef, useState } from 'react'

// Tipos mínimos da Web Speech API (não fazem parte do lib.dom do TypeScript).
interface ResultadoFala {
  isFinal: boolean
  0: { transcript: string }
}
interface EventoFala {
  resultIndex: number
  results: ArrayLike<ResultadoFala>
}
interface Reconhecedor {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: EventoFala) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}
type ConstrutorReconhecedor = new () => Reconhecedor

function obterConstrutor(): ConstrutorReconhecedor | null {
  const w = window as unknown as {
    SpeechRecognition?: ConstrutorReconhecedor
    webkitSpeechRecognition?: ConstrutorReconhecedor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export const ditadoSuportado = typeof window !== 'undefined' && obterConstrutor() !== null

const MENSAGENS_ERRO: Record<string, string> = {
  'not-allowed': 'Permissão do microfone negada. Libere o microfone nas configurações do navegador.',
  'service-not-allowed': 'O ditado não está disponível neste navegador. Use o microfone do teclado do celular.',
  'audio-capture': 'Nenhum microfone encontrado.',
  network: 'O ditado precisa de internet.',
}

/**
 * Ditado por voz em português. Cada trecho final reconhecido é entregue em `aoReceber`.
 * Retoma sozinho se o navegador parar por silêncio (comum no Android).
 */
export function useDitado(aoReceber: (texto: string) => void) {
  const [ouvindo, setOuvindo] = useState(false)
  const [parcial, setParcial] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const rec = useRef<Reconhecedor | null>(null)
  const querOuvir = useRef(false)
  const callback = useRef(aoReceber)
  callback.current = aoReceber

  const parar = useCallback(() => {
    querOuvir.current = false
    rec.current?.stop()
    setOuvindo(false)
    setParcial('')
  }, [])

  const iniciar = useCallback(() => {
    const Construtor = obterConstrutor()
    if (!Construtor) return
    setErro(null)
    const r = new Construtor()
    r.lang = 'pt-BR'
    r.continuous = true
    r.interimResults = true
    r.onresult = (e) => {
      let provisorio = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        const t = res[0].transcript.trim()
        if (res.isFinal) {
          if (t) callback.current(t)
        } else {
          provisorio += ` ${t}`
        }
      }
      setParcial(provisorio.trim())
    }
    r.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return
      setErro(MENSAGENS_ERRO[e.error] ?? `Erro no ditado: ${e.error}`)
      querOuvir.current = false
    }
    r.onend = () => {
      setParcial('')
      if (querOuvir.current) {
        try {
          r.start()
          return
        } catch {
          /* cai para o estado parado */
        }
      }
      setOuvindo(false)
    }
    rec.current = r
    querOuvir.current = true
    try {
      r.start()
      setOuvindo(true)
    } catch {
      setErro('Não foi possível iniciar o ditado.')
    }
  }, [])

  useEffect(() => () => {
    querOuvir.current = false
    rec.current?.stop()
  }, [])

  return { ouvindo, parcial, erro, iniciar, parar }
}

/** Junta o trecho ditado ao texto existente, cuidando de espaço e maiúscula inicial. */
export function juntarTexto(atual: string, trecho: string): string {
  const base = atual.trimEnd()
  if (!base) return trecho.charAt(0).toUpperCase() + trecho.slice(1)
  const fimDeFrase = /[.!?]$/.test(base)
  const t = fimDeFrase ? trecho.charAt(0).toUpperCase() + trecho.slice(1) : trecho
  return `${base} ${t}`
}
