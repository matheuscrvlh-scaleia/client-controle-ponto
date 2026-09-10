import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import bannerLogin from '../assets/banners/banner-login.avif'
import logo from '../assets/logos/logo.avif'

const MENSAGEM_CREDENCIAIS_INVALIDAS = 'Usuário, email, CPF ou senha incorretos. Confira os dados e tente novamente.'

function mensagemErroAmigavel(mensagem: string): string {
  const normalizada = mensagem.toLowerCase()

  if (normalizada.includes('invalid login credentials')) {
    return MENSAGEM_CREDENCIAIS_INVALIDAS
  }
  if (normalizada.includes('email not confirmed')) {
    return 'Este e-mail ainda não foi confirmado. Verifique sua caixa de entrada.'
  }
  if (normalizada.includes('too many requests')) {
    return 'Muitas tentativas seguidas. Aguarde um momento e tente novamente.'
  }

  return 'Não foi possível entrar. Tente novamente em instantes.'
}

export function Login() {
  const { session, loading } = useAuth()
  const [identificador, setIdentificador] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (!loading && session) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setErro('')
    setEnviando(true)

    const valor = identificador.trim()
    let email = valor

    if (!valor.includes('@')) {
      const { data, error: erroResolucao } = await supabase.rpc('login_email_de', {
        p_identificador: valor,
      })
      if (erroResolucao || !data) {
        setErro(MENSAGEM_CREDENCIAIS_INVALIDAS)
        setEnviando(false)
        return
      }
      email = data
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    setEnviando(false)
    if (error) setErro(mensagemErroAmigavel(error.message))
  }

  return (
    <div className="login-page" style={{ backgroundImage: `url(${bannerLogin})` }}>
      <div className="login-card">
        <div className="login-brand">
          <img src={logo} alt="Transcouto" className="login-logo" />
          <span className="login-wordmark">Copiloto de Ponto</span>
        </div>
        <div className="login-body">
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="identificador">Usuário, email ou CPF</label>
              <input
                id="identificador"
                type="text"
                value={identificador}
                onChange={(event) => setIdentificador(event.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="senha">Senha</label>
              <input
                id="senha"
                type="password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {erro && <p className="form-erro">{erro}</p>}
            <button className="btn-primary" type="submit" disabled={enviando}>
              {enviando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
