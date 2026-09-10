import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import type { Filial } from '../../../types/database'
import { Modal } from '../../../components/Modal'

type FormularioFilial = {
  nome_interno: string
  razao_social_friponto: string
  cnpj: string
  ativo: boolean
}

const FORM_VAZIO: FormularioFilial = {
  nome_interno: '',
  razao_social_friponto: '',
  cnpj: '',
  ativo: true,
}

export function FiliaisPanel() {
  const [filiais, setFiliais] = useState<Filial[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState<Filial | null>(null)
  const [modalAberto, setModalAberto] = useState(false)
  const [form, setForm] = useState<FormularioFilial>(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState('')

  async function carregar() {
    setCarregando(true)
    setErro('')
    const { data, error } = await supabase.from('filiais').select('*').order('nome_interno')
    if (error) setErro(error.message)
    setFiliais(data ?? [])
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

  function abrirEdicao(filial: Filial) {
    setEditando(filial)
    setForm({
      nome_interno: filial.nome_interno,
      razao_social_friponto: filial.razao_social_friponto,
      cnpj: filial.cnpj ?? '',
      ativo: filial.ativo,
    })
    setErroForm('')
    setModalAberto(true)
  }

  async function salvar(event: FormEvent) {
    event.preventDefault()
    setErroForm('')
    setSalvando(true)

    const payload = {
      nome_interno: form.nome_interno.trim(),
      razao_social_friponto: form.razao_social_friponto.trim(),
      cnpj: form.cnpj.trim() || null,
      ativo: form.ativo,
    }
    const { error } = editando
      ? await supabase.from('filiais').update(payload).eq('id', editando.id)
      : await supabase.from('filiais').insert(payload)

    setSalvando(false)
    if (error) {
      setErroForm(error.message.includes('duplicate') ? 'Já existe uma filial com esse nome interno.' : error.message)
      return
    }
    setModalAberto(false)
    carregar()
  }

  async function excluir(filial: Filial) {
    if (!confirm(`Excluir a filial "${filial.nome_interno}"? Funcionários e fechamentos vinculados também serão removidos.`)) return
    const { error } = await supabase.from('filiais').delete().eq('id', filial.id)
    if (error) {
      alert(error.message)
      return
    }
    carregar()
  }

  return (
    <div className="card">
      <div className="card-toolbar">
        <h2>Filiais</h2>
        <button type="button" className="btn-primary btn-compact" onClick={abrirNovo}>
          Nova filial
        </button>
      </div>

      {erro && <p className="form-erro">{erro}</p>}

      {carregando ? (
        <p>Carregando...</p>
      ) : filiais.length === 0 ? (
        <p>Nenhuma filial cadastrada ainda.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome interno</th>
                <th>Razão social (FriPonto)</th>
                <th>CNPJ</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filiais.map((filial) => (
                <tr key={filial.id}>
                  <td>{filial.nome_interno}</td>
                  <td>{filial.razao_social_friponto}</td>
                  <td>{filial.cnpj ?? '—'}</td>
                  <td>
                    <span className={filial.ativo ? 'badge badge-success' : 'badge badge-neutral'}>
                      {filial.ativo ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="table-actions">
                    <button type="button" className="btn-link" onClick={() => abrirEdicao(filial)}>
                      Editar
                    </button>
                    <button type="button" className="btn-link btn-link-danger" onClick={() => excluir(filial)}>
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
        <Modal titulo={editando ? 'Editar filial' : 'Nova filial'} onFechar={() => setModalAberto(false)}>
          <form className="modal-form" onSubmit={salvar}>
            <div className="field">
              <label htmlFor="filial-nome-interno">Nome interno</label>
              <input
                id="filial-nome-interno"
                type="text"
                placeholder="Ex: GDR"
                value={form.nome_interno}
                onChange={(event) => setForm({ ...form, nome_interno: event.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="filial-razao-social">Razão social (como está no FriPonto)</label>
              <input
                id="filial-razao-social"
                type="text"
                placeholder="Ex: TC GDR TRANSPORTE E LOGISTICA LTDA"
                value={form.razao_social_friponto}
                onChange={(event) => setForm({ ...form, razao_social_friponto: event.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="filial-cnpj">CNPJ</label>
              <input
                id="filial-cnpj"
                type="text"
                value={form.cnpj}
                onChange={(event) => setForm({ ...form, cnpj: event.target.value })}
              />
            </div>
            <label className="checkbox-item">
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(event) => setForm({ ...form, ativo: event.target.checked })}
              />
              Filial ativa
            </label>
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
