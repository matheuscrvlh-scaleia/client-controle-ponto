import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import type { Cargo } from '../../../types/database'
import { Modal } from '../../../components/Modal'

type FormularioCargo = {
  nome: string
  pode_ver_todas_filiais: boolean
  pode_gerenciar_extracao: boolean
  pode_gerenciar_usuarios: boolean
  pode_gerenciar_cargos_filiais: boolean
  pode_gerenciar_configuracoes: boolean
}

type FlagCargo = Exclude<keyof FormularioCargo, 'nome'>

const FLAGS: { chave: FlagCargo; label: string }[] = [
  { chave: 'pode_ver_todas_filiais', label: 'Ver todas as filiais' },
  { chave: 'pode_gerenciar_extracao', label: 'Gerenciar extração' },
  { chave: 'pode_gerenciar_usuarios', label: 'Gerenciar usuários' },
  { chave: 'pode_gerenciar_cargos_filiais', label: 'Gerenciar cargos e filiais' },
  { chave: 'pode_gerenciar_configuracoes', label: 'Gerenciar configurações' },
]

const FORM_VAZIO: FormularioCargo = {
  nome: '',
  pode_ver_todas_filiais: false,
  pode_gerenciar_extracao: false,
  pode_gerenciar_usuarios: false,
  pode_gerenciar_cargos_filiais: false,
  pode_gerenciar_configuracoes: false,
}

export function CargosPanel() {
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState<Cargo | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState<FormularioCargo>(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState('')

  async function carregar() {
    setCarregando(true)
    setErro('')
    const { data, error } = await supabase.from('cargos').select('*').order('nome')
    if (error) setErro(error.message)
    setCargos(data ?? [])
    setCarregando(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  function abrirNovo() {
    setEditando(null)
    setForm(FORM_VAZIO)
    setErroForm('')
    setModalAberto(true)
  }

  function abrirEdicao(cargo: Cargo) {
    setEditando(cargo)
    setForm({
      nome: cargo.nome,
      pode_ver_todas_filiais: cargo.pode_ver_todas_filiais,
      pode_gerenciar_extracao: cargo.pode_gerenciar_extracao,
      pode_gerenciar_usuarios: cargo.pode_gerenciar_usuarios,
      pode_gerenciar_cargos_filiais: cargo.pode_gerenciar_cargos_filiais,
      pode_gerenciar_configuracoes: cargo.pode_gerenciar_configuracoes,
    })
    setErroForm('')
    setModalAberto(true)
  }

  async function salvar(event: FormEvent) {
    event.preventDefault()
    setErroForm('')
    setSalvando(true)

    const payload = { ...form, nome: form.nome.trim() }
    const { error } = editando
      ? await supabase.from('cargos').update(payload).eq('id', editando.id)
      : await supabase.from('cargos').insert(payload)

    setSalvando(false)
    if (error) {
      setErroForm(error.message.includes('duplicate') ? 'Já existe um cargo com esse nome.' : error.message)
      return
    }
    setModalAberto(false)
    carregar()
  }

  async function excluir(cargo: Cargo) {
    if (!confirm(`Excluir o cargo "${cargo.nome}"? Usuários vinculados perdem esse cargo.`)) return
    const { error } = await supabase.from('cargos').delete().eq('id', cargo.id)
    if (error) {
      alert(error.message)
      return
    }
    carregar()
  }

  return (
    <div className="card">
      <div className="card-toolbar">
        <h2>Cargos</h2>
        <button type="button" className="btn-primary btn-compact" onClick={abrirNovo}>
          Novo cargo
        </button>
      </div>

      {erro && <p className="form-erro">{erro}</p>}

      {carregando ? (
        <p>Carregando...</p>
      ) : cargos.length === 0 ? (
        <p>Nenhum cargo cadastrado ainda.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Permissões</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cargos.map((cargo) => (
                <tr key={cargo.id}>
                  <td>{cargo.nome}</td>
                  <td>
                    {FLAGS.filter((flag) => cargo[flag.chave]).map((flag) => (
                      <span key={flag.chave} className="badge">
                        {flag.label}
                      </span>
                    ))}
                  </td>
                  <td className="table-actions">
                    <button type="button" className="btn-link" onClick={() => abrirEdicao(cargo)}>
                      Editar
                    </button>
                    <button type="button" className="btn-link btn-link-danger" onClick={() => excluir(cargo)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <Modal titulo={editando ? 'Editar cargo' : 'Novo cargo'} onFechar={() => setModalAberto(false)}>
          <form className="modal-form" onSubmit={salvar}>
            <div className="field">
              <label htmlFor="cargo-nome">Nome</label>
              <input
                id="cargo-nome"
                type="text"
                value={form.nome}
                onChange={(event) => setForm({ ...form, nome: event.target.value })}
                required
              />
            </div>
            <div className="field">
              <span>Permissões</span>
              <div className="checkbox-list">
                {FLAGS.map((flag) => (
                  <label key={flag.chave} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={form[flag.chave] as boolean}
                      onChange={(event) => setForm({ ...form, [flag.chave]: event.target.checked })}
                    />
                    {flag.label}
                  </label>
                ))}
              </div>
            </div>
            {erroForm && <p className="form-erro">{erroForm}</p>}
            <button className="btn-primary" type="submit" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
