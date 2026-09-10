import { useAuth } from '../context/AuthContext'

export function Dashboard() {
  const { usuario, cargos } = useAuth()

  return (
    <div className="card">
      <h2>Bem-vindo, {usuario?.nome ?? 'usuário'}</h2>
      <p>
        Cargo{cargos.length > 1 ? 's' : ''}:{' '}
        {cargos.length ? cargos.map((cargo) => <span key={cargo.id} className="badge">{cargo.nome}</span>) : 'nenhum cargo atribuído ainda'}
      </p>
      <p>O dashboard de banco de horas por filial será implementado na próxima fase.</p>
    </div>
  )
}
