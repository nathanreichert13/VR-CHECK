import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useRota } from './lib/rota'
import { repositorioLocal } from './storage/local'
import { criarRepositorioSupabase } from './storage/supabase'
import { supabase } from './storage/supabaseClient'
import Login from './pages/Login'
import Lista from './pages/Lista'
import Editor from './pages/Editor'
import Configuracoes from './pages/Configuracoes'
import Historico from './pages/Historico'

export default function App() {
  const rota = useRota()
  const [sessao, setSessao] = useState<Session | null>(null)
  const [carregandoSessao, setCarregandoSessao] = useState(supabase !== null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setCarregandoSessao(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSessao(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const repo = useMemo(() => (supabase ? criarRepositorioSupabase(supabase) : repositorioLocal), [])

  if (carregandoSessao) return <div className="centro">Carregando…</div>
  if (supabase && !sessao) return <Login />

  const sair = supabase ? () => supabase!.auth.signOut() : undefined

  switch (rota.pagina) {
    case 'vistoria':
      return <Editor key={rota.id} id={rota.id} repo={repo} />
    case 'config':
      return <Configuracoes />
    case 'historico':
      return <Historico repo={repo} />
    default:
      return <Lista repo={repo} usuario={sessao?.user.email ?? null} aoSair={sair} />
  }
}
