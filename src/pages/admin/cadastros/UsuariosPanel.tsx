import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import type { Cargo, Filial, Usuario } from '../../../types/database'
import { Modal } from '../../../components/Modal'

interface UsuarioComVinculos extends Usuario {
  usuario_cargos: { cargos: Cargo | Cargo[] | null }[]
  usuario_filiais: { filiais: Filial | Filial[] | null }[]
}

function achatar<T>(itens: (T | T[] | null)[]): T[] {
  return itens.flatMap((item) => (item ? (Array.isArray(item) ? item : [item]) : []))
}

type FormularioUsuario = {
  nome: string
  email: string
  senha: string
  usuario: string
  cpf: string
  ativo: boolean
  cargoIds: string[]
  filialIds: string[]
}

const FORM_VAZIO: FormularioUsuario = {
  nome: '',
  email: '',
  senha: '',
  usuario: '',
  cpf: '',
  ativo: true,
  cargoIds: [],
  filialIds: [],
}

export function UsuariosPanel() {
  const [usuarios, setUsuarios] = useState<UsuarioComVinculos[]>([])
  const [cargosDisponiveis, setCargosDisponiveis] = useState<Cargo[]>([])
  const [filiaisDisponiveis, setFiliaisDisponiveis] = useState<Filial[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState<UsuarioComVinculos | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState<FormularioUsuario>(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState('')

  async function carregar() {
    setCarregando(true)
    setErro('')
    const [usuariosResp, cargosResp, filiaisResp] = await Promise.all([
      supabase
        .from('usuarios')
        .select('*, usuario_cargos(cargos(*)), usuario_filiais(filiais(*))')
        .order('nome'),
      supabase.from('cargos').select('*').order('nome'),
      supabase.from('filiais').select('*').order('nome_interno'),
    ])

    if (usuariosResp.error) setErro(usuariosResp.error.message)
    setUsuarios((usuariosResp.data as UsuarioComVinculos[]) ?? [])
    setCargosDisponiveis(cargosResp.data ?? [])
    setFiliaisDisponiveis(filiaisResp.data ?? [])
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

  function abrirEdicao(usuario: UsuarioComVinculos) {
    setEditando(usuario)
    setForm({
      nome: usuario.nome,
      email: usuario.email,
      senha: '',
      usuario: usuario.usuario ?? '',
      cpf: usuario.cpf ?? '',
      ativo: usuario.ativo,
      cargoIds: achatar(usuario.usuario_cargos.map((v) => v.cargos)).map((c) => c.id),
      filialIds: achatar(usuario.usuario_filiais.map((v) => v.filiais)).map((f) => f.id),
    })
    setErroForm('')
    setModalAberto(true)
  }

  function alternarSelecao(lista: string[], id: string): string[] {
    return lista.includes(id) ? lista.filter((item) => item !== id) : [...lista, id]
  }

  async function salvar(event: FormEvent) {
    event.preventDefault()
    setErroForm('')
    setSalvando(true)

    if (editando) {
      const { error: erroUpdate } = await supabase
        .from('usuarios')
        .update({
          nome: form.nome.trim(),
          usuario: form.usuario.trim() || null,
          cpf: form.cpf.trim() ? form.cpf.replace(/\D/g, '') : null,
          ativo: form.ativo,
        })
        .eq('id', editando.id)

      if (erroUpdate) {
        setSalvando(false)
        setErroForm(erroUpdate.message.includes('duplicate') ? 'Usuário ou CPF já usado por outra conta.' : erroUpdate.message)
        return
      }

      await supabase.from('usuario_cargos').delete().eq('usuario_id', editando.id)
      if (form.cargoIds.length) {
        await supabase
          .from('usuario_cargos')
          .insert(form.cargoIds.map((cargo_id) => ({ usuario_id: editando.id, cargo_id })))
      }

      await supabase.from('usuario_filiais').delete().eq('usuario_id', editando.id)
      if (form.filialIds.length) {
        await supabase
          .from('usuario_filiais')
          .insert(form.filialIds.map((filial_id) => ({ usuario_id: editando.id, filial_id })))
      }
    } else {
      const { data, error: erroFuncao } = await supabase.functions.invoke('admin-criar-usuario', {
        body: {
          nome: form.nome.trim(),
          email: form.email.trim(),
          senha: form.senha,
          usuario: form.usuario.trim() || null,
          cpf: form.cpf.trim() || null,
          cargo_ids: form.cargoIds,
          filial_ids: form.filialIds,
        },
      })

      if (erroFuncao || data?.error) {
        setSalvando(false)
        setErroForm(data?.error ?? erroFuncao?.message ?? 'Não foi possível criar o usuário.')
        return
      }
    }

    setSalvando(false)
    setModalAberto(false)
    carregar()
  }

  async function alternarAtivo(usuario: UsuarioComVinculos) {
    const { error } = await supabase.from('usuarios').update({ ativo: !usuario.ativo }).eq('id', usuario.id)
    if (error) {
      alert(error.message)
      return
    }
    carregar()
  }

  return (
    <div className="card">
      <div className="card-toolbar">
        <h2>Usuários</h2>
        <button type="button" className="btn-primary btn-compact" onClick={abrirNovo}>
          Novo usuário
        </button>
      </div>

      {erro && <p className="form-erro">{erro}</p>}

      {carregando ? (
        <p>Carregando...</p>
      ) : usuarios.length === 0 ? (
        <p>Nenhum usuário cadastrado ainda.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Cargos</th>
                <th>Filiais</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>{usuario.nome}</td>
                  <td>{usuario.email}</td>
                  <td>
                    {achatar(usuario.usuario_cargos.map((v) => v.cargos)).map((cargo) => (
                      <span key={cargo.id} className="badge">
                        {cargo.nome}
                      </span>
                    ))}
                  </td>
                  <td>
                    {achatar(usuario.usuario_filiais.map((v) => v.filiais)).map((filial) => (
                      <span key={filial.id} className="badge">
                        {filial.nome_interno}
                      </span>
                    ))}
                  </td>
                  <td>
                    <span className={usuario.ativo ? 'badge badge-success' : 'badge badge-neutral'}>
                      {usuario.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="table-actions">
                    <button type="button" className="btn-link" onClick={() => abrirEdicao(usuario)}>
                      Editar
                    </button>
                    <button type="button" className="btn-link" onClick={() => alternarAtivo(usuario)}>
                      {usuario.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <Modal titulo={editando ? 'Editar usuário' : 'Novo usuário'} onFechar={() => setModalAberto(false)}>
          <form className="modal-form" onSubmit={salvar}>
            <div className="field">
              <label htmlFor="usuario-nome">Nome</label>
              <input
                id="usuario-nome"
                type="text"
                value={form.nome}
                onChange={(event) => setForm({ ...form, nome: event.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="usuario-email">E-mail</label>
              <input
                id="usuario-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                disabled={Boolean(editando)}
                required
              />
            </div>
            {!editando && (
              <div className="field">
                <label htmlFor="usuario-senha">Senha</label>
                <input
                  id="usuario-senha"
                  type="password"
                  value={form.senha}
                  onChange={(event) => setForm({ ...form, senha: event.target.value })}
                  minLength={6}
                  required
                />
              </div>
            )}
            <div className="field">
              <label htmlFor="usuario-usuario">Usuário (opcional)</label>
              <input
                id="usuario-usuario"
                type="text"
                value={form.usuario}
                onChange={(event) => setForm({ ...form, usuario: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="usuario-cpf">CPF (opcional)</label>
              <input
                id="usuario-cpf"
                type="text"
                value={form.cpf}
                onChange={(event) => setForm({ ...form, cpf: event.target.value })}
              />
            </div>
            <div className="field">
              <span>Cargos</span>
              <div className="checkbox-list">
                {cargosDisponiveis.map((cargo) => (
                  <label key={cargo.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={form.cargoIds.includes(cargo.id)}
                      onChange={() => setForm({ ...form, cargoIds: alternarSelecao(form.cargoIds, cargo.id) })}
                    />
                    {cargo.nome}
                  </label>
                ))}
              </div>
            </div>
            <div className="field">
              <span>Filiais</span>
              <div className="checkbox-list">
                {filiaisDisponiveis.map((filial) => (
                  <label key={filial.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={form.filialIds.includes(filial.id)}
                      onChange={() => setForm({ ...form, filialIds: alternarSelecao(form.filialIds, filial.id) })}
                    />
                    {filial.nome_interno}
                  </label>
                ))}
              </div>
            </div>
            {editando && (
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(event) => setForm({ ...form, ativo: event.target.checked })}
                />
                Usuário ativo
              </label>
            )}
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
