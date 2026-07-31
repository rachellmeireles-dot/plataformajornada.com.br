import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import './App.css'

const formularioVazio = {
  nome: '',
  telefone: '',
  bairro: '',
  zona: '',
  comunidade: '',
  email: '',
  responsavel: '',
  status: 'Apoiador',
  observacoes: '',
}

function App() {
  const [formulario, setFormulario] = useState(formularioVazio)
  const [apoiadores, setApoiadores] = useState([])
  const [busca, setBusca] = useState('')
  const [editandoId, setEditandoId] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    buscarApoiadores()
  }, [])

  async function buscarApoiadores() {
    setCarregando(true)
    setErro('')

    const { data, error } = await supabase
      .from('apoiadores')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setErro(`Erro ao carregar apoiadores: ${error.message}`)
    } else {
      setApoiadores(data || [])
    }

    setCarregando(false)
  }

  function alterarCampo(e) {
    const { name, value } = e.target
    setFormulario((f) => ({
      ...f,
      [name]: value,
    }))
  }

  function limparFormulario() {
    setFormulario(formularioVazio)
    setEditandoId(null)
    setErro('')
    setMensagem('')
  }

  async function salvarApoiador(e) {
    e.preventDefault()

    const dados = {
      nome: formulario.nome,
      telefone: formulario.telefone,
      bairro: formulario.bairro,
      zona: formulario.zona,
      comunidade: formulario.comunidade,
      email: formulario.email,
      responsavel: formulario.responsavel,
      status: formulario.status,
      observacoes: formulario.observacoes,
    }

    let resultado

    if (editandoId) {
      resultado = await supabase
        .from('apoiadores')
        .update(dados)
        .eq('id', editandoId)
        .select()
    } else {
      resultado = await supabase
        .from('apoiadores')
        .insert([dados])
    }

    if (resultado.error) {
      setErro(resultado.error.message)
    } else {
      setMensagem('Cadastro salvo com sucesso!')
      limparFormulario()
      buscarApoiadores()
    }
  }

  function editarApoiador(apoiador) {
    setFormulario({
      nome: apoiador.nome || '',
      telefone: apoiador.telefone || '',
      bairro: apoiador.bairro || '',
      zona: apoiador.zona || '',
      comunidade: apoiador.comunidade || '',
      email: apoiador.email || '',
      responsavel: apoiador.responsavel || '',
      status: apoiador.status || 'Apoiador',
      observacoes: apoiador.observacoes || '',
    })

    setEditandoId(apoiador.id)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  async function excluirApoiador(apoiador) {
    if (!window.confirm(`Excluir ${apoiador.nome}?`)) return

    await supabase
      .from('apoiadores')
      .delete()
      .eq('id', apoiador.id)

    buscarApoiadores()
  }

  function abrirWhatsApp(telefone) {
    const numero = telefone.replace(/\D/g, '')
    window.open(`https://wa.me/55${numero}`)
  }

  const apoiadoresFiltrados = useMemo(() => {
    if (!busca) return apoiadores

    return apoiadores.filter((a) =>
      (
        a.nome +
        a.telefone +
        a.bairro +
        a.zona
      )
        .toLowerCase()
        .includes(busca.toLowerCase())
    )
  }, [apoiadores, busca])

  return (
    <main className="pagina">

      <header className="cabecalho">

        <div className="cabecalho-conteudo">

          <div>

            <p className="marca">JORNADA</p>

            <h1>Plataforma JORNADA
              
            </h1>

            <p>Gestão de apoiadores</p>

          </div>

          <div className="resumo">

            <strong>{apoiadores.length}</strong>

            <span>Apoiadores cadastrados</span>

          </div>

        </div>

      </header>      <section className="container">
        <article className="card">
          <div className="titulo-card">
            <div>
              <h2>
                {editandoId ? 'Editar apoiador' : 'Novo cadastro'}
              </h2>

              <p>Preencha os dados abaixo.</p>
            </div>

            {editandoId && (
              <button
                type="button"
                className="botao-secundario"
                onClick={limparFormulario}
              >
                Cancelar edição
              </button>
            )}
          </div>

          {mensagem && (
            <div className="mensagem sucesso">
              {mensagem}
            </div>
          )}

          {erro && (
            <div className="mensagem erro">
              {erro}
            </div>
          )}

          <form onSubmit={salvarApoiador}>
            <div className="grade-formulario">
              <label>
                Nome completo *
                <input
                  type="text"
                  name="nome"
                  value={formulario.nome}
                  onChange={alterarCampo}
                  placeholder="Nome completo"
                  required
                />
              </label>

              <label>
                Telefone *
                <input
                  type="tel"
                  name="telefone"
                  value={formulario.telefone}
                  onChange={alterarCampo}
                  placeholder="(92) 99999-9999"
                  required
                />
              </label>

              <label>
                Bairro
                <input
                  type="text"
                  name="bairro"
                  value={formulario.bairro}
                  onChange={alterarCampo}
                  placeholder="Bairro"
                />
              </label>

              <label>
                Zona
                <select
                  name="zona"
                  value={formulario.zona}
                  onChange={alterarCampo}
                >
                  <option value="">Selecione</option>
                  <option value="Norte">Norte</option>
                  <option value="Sul">Sul</option>
                  <option value="Leste">Leste</option>
                  <option value="Oeste">Oeste</option>
                  <option value="Centro-Sul">Centro-Sul</option>
                  <option value="Centro-Oeste">Centro-Oeste</option>
                  <option value="Rural">Rural</option>
                </select>
              </label>

              <label>
                Comunidade
                <input
                  type="text"
                  name="comunidade"
                  value={formulario.comunidade}
                  onChange={alterarCampo}
                  placeholder="Comunidade"
                />
              </label>

              <label>
                E-mail
                <input
                  type="email"
                  name="email"
                  value={formulario.email}
                  onChange={alterarCampo}
                  placeholder="email@exemplo.com"
                />
              </label>

              <label>
                Responsável
                <input
                  type="text"
                  name="responsavel"
                  value={formulario.responsavel}
                  onChange={alterarCampo}
                  placeholder="Responsável pelo cadastro"
                />
              </label>

              <label>
                Status
                <select
                  name="status"
                  value={formulario.status}
                  onChange={alterarCampo}
                >
                  <option value="Apoiador">Apoiador</option>
                  <option value="Liderança">Liderança</option>
                  <option value="Voluntário">Voluntário</option>
                  <option value="Indeciso">Indeciso</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </label>
            </div>

            <label>
              Observações
              <textarea
                name="observacoes"
                value={formulario.observacoes}
                onChange={alterarCampo}
                placeholder="Digite informações importantes sobre o apoiador"
                rows="4"
              />
            </label>

            <div className="acoes-formulario">
              <button
                type="submit"
                className="botao-principal"
              >
                {editandoId
                  ? 'Salvar alterações'
                  : 'Cadastrar'}
              </button>

              <button
                type="button"
                className="botao-limpar"
                onClick={limparFormulario}
              >
                Limpar formulário
              </button>
            </div>
          </form>
        </article>

        <article className="card">
          <div className="titulo-lista">
            <div>
              <h2>Apoiadores cadastrados</h2>

              <p>
                {apoiadoresFiltrados.length} registros encontrados
              </p>
            </div>

            <input
              type="search"
              className="campo-busca"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, telefone ou bairro"
            />
          </div>          {apoiadoresFiltrados.length === 0 ? (
            <p className="estado-lista">
              Nenhum apoiador encontrado.
            </p>
          ) : (
            <div className="tabela-container">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Telefone</th>
                    <th>Bairro</th>
                    <th>Zona</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  {apoiadoresFiltrados.map((apoiador) => (
                    <tr key={apoiador.id}>
                      <td>
                        <strong>{apoiador.nome}</strong>

                        {apoiador.responsavel && (
                          <small>
                            Responsável: {apoiador.responsavel}
                          </small>
                        )}
                      </td>

                      <td>{apoiador.telefone || '-'}</td>
                      <td>{apoiador.bairro || '-'}</td>
                      <td>{apoiador.zona || '-'}</td>

                      <td>
                        <span className="status">
                          {apoiador.status || 'Apoiador'}
                        </span>
                      </td>

                      <td>
                        <div className="acoes-tabela">
                          <button
                            type="button"
                            className="botao-whatsapp"
                            onClick={() =>
                              abrirWhatsApp(apoiador.telefone)
                            }
                          >
                            WhatsApp
                          </button>

                          <button
                            type="button"
                            className="botao-editar"
                            onClick={() => editarApoiador(apoiador)}
                          >
                            Editar
                          </button>

                          <button
                            type="button"
                            className="botao-excluir"
                            onClick={() => excluirApoiador(apoiador)}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>

      <footer className="rodape">
        <p>Plataforma Jornada — Gestão de apoiadores</p>
      </footer>
    </main>
  )
}

export default App