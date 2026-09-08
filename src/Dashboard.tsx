import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

export function Dashboard() {
  const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking')
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ error }) => {
      if (error) {
        setStatus('error')
        setMessage(error.message)
      } else {
        setStatus('ok')
      }
    })
  }, [])

  return (
    <div>
      <h1>Painel de Uso — Controle de Ponto</h1>
      <p>Conexão com Supabase: {status === 'checking' ? 'verificando...' : status === 'ok' ? 'conectado' : `erro (${message})`}</p>
    </div>
  )
}
