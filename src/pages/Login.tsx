import { useState, type FormEvent } from 'react'
import Icone from '../components/Icone'
import { supabase } from '../storage/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [verSenha, setVerSenha] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    if (!supabase) return
    setEnviando(true)
    setErro(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    setEnviando(false)
    if (error) {
      setErro(
        error.message.toLowerCase().includes('fetch')
          ? 'Sem conexão com o servidor. Verifique a internet e tente de novo.'
          : 'E-mail ou senha incorretos.',
      )
    }
  }

  return (
    <div className="login">
      <form className="login-caixa" onSubmit={entrar}>
        <img className="login-logo" src="/logo-vera-reichert.png" alt="Vera Reichert Negócios Imobiliários" />
        <h1>Entrar no VR-CHECK</h1>
        <p className="login-sub">Use o e-mail e a senha cadastrados pela imobiliária.</p>

        <div className="grupo grupo-campos">
          <input
            type="email"
            autoComplete="username"
            placeholder="E-mail"
            aria-label="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <div className="campo-senha">
            <input
              type={verSenha ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Senha"
              aria-label="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
            <button
              type="button"
              className="mostrar-senha"
              onClick={() => setVerSenha(!verSenha)}
              aria-label={verSenha ? 'Esconder senha' : 'Mostrar senha'}
            >
              <Icone nome={verSenha ? 'olhoFechado' : 'olho'} />
            </button>
          </div>
        </div>

        {erro && (
          <p className="texto-erro" role="alert">
            {erro}
          </p>
        )}

        <button className="btn primario grande largo" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="nota centralizada">
          Acesso restrito à equipe. Para criar um acesso ou trocar a senha, fale com o administrador do sistema.
        </p>
      </form>
    </div>
  )
}
