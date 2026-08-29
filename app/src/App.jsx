import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase } from './supabase'
import './App.css'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'

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
function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erroLogin, setErroLogin] = useState('')

  async function entrar(e) {
    e.preventDefault()
    setErroLogin('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    })

    if (error) {
      setErroLogin(error.message)
      return
    }

    onLogin(data.session)
  }

  return (
    <main className="pagina-login">
      <form className="card-login" onSubmit={entrar}>
        <h1>
  Plataforma
  <br />
  Jornada
</h1>
        <p>Entre com seu e-mail e senha</p>

        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />

        {erroLogin && <div className="mensagem erro">{erroLogin}</div>}

        <button type="submit" className="botao-principal">
          Entrar
        </button>
      </form>
    </main>
  )
}
function App() {
  const [formulario, setFormulario] = useState(formularioVazio)
  const [apoiadores, setApoiadores] = useState([])
  const [busca, setBusca] = useState('')
  const [responsavelSelecionado, setResponsavelSelecionado] = useState('')
  const [mostrarCadastro, setMostrarCadastro] = useState(true)
  const [indiceWhatsApp, setIndiceWhatsApp] = useState(0)
  const [editandoId, setEditandoId] = useState(null)
  const [sessao, setSessao] = useState(null)
  const usuario = sessao?.user
  const [perfil, setPerfil] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
  buscarApoiadores()

  supabase.auth.getSession().then(({ data }) => {
    setSessao(data.session)
  })

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setSessao(session)
  })

  return () => {
    subscription.unsubscribe()
  }
}, [])
useEffect(() => {
  async function buscarPerfil() {
    if (!sessao?.user?.id) {
      setPerfil(null)
      return
    }

    const { data, error } = await supabase
      .from('perfis')
      .select('id, nome, role')
      .eq('id', sessao.user.id)
      .single()

    if (error) {
      console.error('Erro ao carregar perfil:', error.message)
      setPerfil(null)
      return
    }

    setPerfil(data)
  }

  buscarPerfil()
}, [sessao])
async function buscarApoiadores() {
  setCarregando(true)
  setErro('')

  let data = []
let error = null
let inicio = 0
const tamanhoPagina = 1000

while (true) {
  const { data: pagina, error: paginaErro } = await supabase
    .from('apoiadores')
    .select('*')
    .order('created_at', { ascending: false })
    .range(inicio, inicio + tamanhoPagina - 1)

  if (paginaErro) {
    error = paginaErro
    break
  }

  data = [...data, ...(pagina || [])]

  if (!pagina || pagina.length < tamanhoPagina) {
    break
  }

  inicio += tamanhoPagina
}
  if (error) {
    setErro(`Erro ao carregar apoiadores: ${error.message}`)
  } else {
    setApoiadores(data || [])
  }

  setCarregando(false)
}
const dadosPorBairro = useMemo(() => {
  const contagem = {}

  apoiadores.forEach((apoiador) => {
    const bairro =
  apoiador.bairro?.trim().toLowerCase() || 'não informado'
    contagem[bairro] = (contagem[bairro] || 0) + 1
  })

 return Object.entries(contagem).map(([bairro, quantidade]) => ({
  bairro:
    bairro === 'não informado'
      ? 'Não informado'
      : bairro
          .split(' ')
          .map((palavra) =>
            palavra.charAt(0).toUpperCase() + palavra.slice(1)
          )
          .join(' '),
  quantidade,
}))
}, [apoiadores])
const dadosPorZona = useMemo(() => {
  const contagem = {}

  apoiadores.forEach((apoiador) => {
    const zona =
      apoiador.zona?.trim().toLowerCase() || 'não informado'

    contagem[zona] = (contagem[zona] || 0) + 1
  })

  return Object.entries(contagem).map(([zona, quantidade]) => ({
    zona:
      zona === 'não informado'
        ? 'Não informado'
        : zona
            .split(' ')
            .map(
              (palavra) =>
                palavra.charAt(0).toUpperCase() + palavra.slice(1)
            )
            .join(' '),
    quantidade,
  }))
}, [apoiadores])
const apoiadoresFiltrados = useMemo(() => {
  if (responsavelSelecionado) {
    return apoiadores.filter((a) => {
      const responsavel = a.responsavel?.trim() || "Sem responsável"

      return (
        responsavel.toLowerCase() ===
        responsavelSelecionado.trim().toLowerCase()
      )
    })
  }

  if (!busca.trim()) return apoiadores

  const termo = busca.trim().toLowerCase()

  return apoiadores.filter((a) => {
    const texto = [
      a.nome,
      a.telefone,
      a.bairro,
      a.zona,
      a.comunidade,
      a.responsavel
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    return texto.includes(termo)
  })
}, [apoiadores, busca, responsavelSelecionado])
const contatosDuplicados = useMemo(() => {
  const grupos = {}

  apoiadores.forEach((a) => {
    const telefone = (a.telefone || "").replace(/\D/g, "")

    if (!telefone) return

    const telefoneNormalizado = telefone.startsWith("55")
      ? telefone.slice(2)
      : telefone

    if (!grupos[telefoneNormalizado]) {
      grupos[telefoneNormalizado] = []
    }

    grupos[telefoneNormalizado].push(a)
  })

  return Object.entries(grupos)
    .filter(([, registros]) => registros.length > 1)
    .map(([telefone, registros]) => ({
      telefone,
      quantidade: registros.length,
      registros,
    }))
    .sort((a, b) => b.quantidade - a.quantidade)
}, [apoiadores])
const quantidadePorResponsavel = useMemo(() => {
  const contagem = {}

  apoiadores.forEach((a) => {
    const responsavel = a.responsavel?.trim() || "Sem responsável"

    if (!contagem[responsavel]) {
      contagem[responsavel] = 0
    }

    contagem[responsavel]++
  })

  return Object.entries(contagem)
    .map(([responsavel, quantidade]) => ({
      responsavel,
      quantidade
    }))
    .sort((a, b) => b.quantidade - a.quantidade)
}, [apoiadores])
const cadastroPublico = window.location.pathname === '/cadastro'
if (!sessao && !cadastroPublico) {
  return <Login onLogin={setSessao} />
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
let telefoneCorrigido = formulario.telefone.replace(/\D/g, "")
if (telefoneCorrigido.length === 10) {
  telefoneCorrigido =
    telefoneCorrigido.slice(0, 2) + "9" + telefoneCorrigido.slice(2)
}
if (telefoneCorrigido.length !== 11) {
  setErro("Digite um telefone completo com DDD.")
  return 
}
   const dados = {
      nome: formulario.nome,
      telefone: telefoneCorrigido,
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
  async function editarResponsavel(nomeAtual) {
  if (!nomeAtual || nomeAtual === "Sem responsável") return

  const novoNome = window.prompt(
    "Digite o novo nome do responsável:",
    nomeAtual
  )

  if (!novoNome || novoNome.trim() === nomeAtual.trim()) return

  const confirmar = window.confirm(
    `Alterar todos os apoiadores de "${nomeAtual}" para "${novoNome.trim()}"?`
  )

  if (!confirmar) return

  const { error } = await supabase
    .from("apoiadores")
    .update({ responsavel: novoNome.trim() })
    .eq("responsavel", nomeAtual)

  if (error) {
    setErro(error.message)
    return
  }

  setResponsavelSelecionado("")
  setBusca("")
  await buscarApoiadores()
}

 function abrirWhatsApp(telefone, nome) {
  const numero = telefone.replace(/\D/g, '')

const mensagem = encodeURIComponent(
  `Oi! Tudo bem? Passando para te pedir uma força nessa caminhada. Sou *Jornada, candidato a Deputado Federal, número 1233*, e quero contar com o seu voto e a sua confiança.

Se você acredita que podemos fazer mais pelo nosso Amazonas, peço também que compartilhe meu nome com seus familiares, amigos e pessoas que confiam em você.

Cada voto, cada mensagem e cada apoio fazem a diferença. Vamos juntos construir um Amazonas melhor! 🙏💙

*Jornada 1233. Conto com você!*`
)

  window.open(`https://wa.me/55${numero}?text=${mensagem}`)
}
  
function exportarExcel() {
  const dados = apoiadores.map((apoiador) => ({
    Nome: apoiador.nome,
    Telefone: apoiador.telefone,
    Bairro: apoiador.bairro,
    Zona: apoiador.zona,
    Comunidade: apoiador.comunidade,
    Email: apoiador.email,
    Responsável: apoiador.responsavel,
    Status: apoiador.status,
    Observações: apoiador.observacoes,
  }))

  const planilha = XLSX.utils.json_to_sheet(dados)
  const arquivo = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(arquivo, planilha, 'Apoiadores')
  XLSX.writeFile(arquivo, 'apoiadores.xlsx')
}
function exportarPDF() {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  })

  doc.setFontSize(16)
  doc.text('Relatório de apoiadores', 14, 15)

  const linhas = apoiadores.map((apoiador) => [
    apoiador.nome || '',
    apoiador.telefone || '',
    apoiador.bairro || '',
    apoiador.zona || '',
    apoiador.responsavel || '',
    apoiador.status || '',
  ])

  autoTable(doc, {
    startY: 22,
    head: [
      ['Nome', 'Telefone', 'Bairro', 'Zona', 'Responsável', 'Status'],
    ],
    body: linhas,
    styles: {
      fontSize: 8,
    },
  })

  doc.save('apoiadores.pdf')
}
if (!sessao && !cadastroPublico) {
  return <Login onLogin={setSessao} />
}
  return (
    <main className="pagina">

    
      <header className="cabecalho">

        <div className="cabecalho-conteudo">

          <div>

           

            <h1>Plataforma JORNADA
              
            </h1>

            <p>Gestão de apoiadores</p>

          </div>
{!cadastroPublico && (
          <div className="resumo">

            <strong>{apoiadores.length}</strong>

            <span>Apoiadores cadastrados</span>

          </div>
)}
 <div className="usuario-logado">
  <span>{usuario?.email}</span>
{perfil && <small>Perfil: {perfil.role}</small>}
  <button
    type="button"
    className="botao-secundario"
    onClick={() => supabase.auth.signOut()}
  >
    Sair
  </button>
</div>



        </div>

      </header>      <section className="container">
        {(cadastroPublico || ['admin', 'coordenador'].includes(perfil?.role)) && (
        <article className="card">
          <div className="titulo-card">
            <div>
             <h2 onClick={() => setMostrarCadastro(!mostrarCadastro)} style={{ cursor: "pointer" }}>
                {editandoId ? "Editar apoiador" : "Novo cadastro"} {mostrarCadastro ? "▼" : "►"}
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

          <form onSubmit={salvarApoiador} style={{ display: mostrarCadastro ? "block" : "none" }}>
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
        )}
        <article className="card">
          <div className="titulo-lista">
            <div>
              <h2>Apoiadores cadastrados</h2>

              <p>
  {apoiadores.length} registros encontrados
</p>
            </div>
            {!cadastroPublico && perfil?.role !== 'consulta' && (
  <>
    <button
      type="button"
      className="botao-secundario"
      onClick={exportarExcel}
    >
      Exportar Excel
    </button>

    <button
      type="button"
      className="botao-secundario"
      onClick={exportarPDF}
    >
      Exportar PDF
    </button>
  </>
)}
            <input
              type="search"
              className="campo-busca"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, telefone ou bairro"
            />
            
            <div style={{ width: '100%', height: 320, margin: '20px 0' }}>
              <h3 style={{ textAlign: 'center', margin: '20px 0 0' }}>
  Bairro
</h3>
  <ResponsiveContainer>
    <BarChart data={dadosPorBairro}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="bairro" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="quantidade" fill="#2563eb" />
    </BarChart>
  </ResponsiveContainer>
</div>
<h3 style={{ textAlign: 'center', margin: '20px 0 0' }}>
  Apoiadores por zona
</h3>
<div style={{ width: '100%', height: 320, margin: '20px 0' }}>
  <ResponsiveContainer>
    <BarChart data={dadosPorZona}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="zona" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="quantidade" fill="#16a34a" />
    </BarChart>
  </ResponsiveContainer>
</div>
{!cadastroPublico && (
<div style={{ margin: '30px 0' }}>
  <h3 style={{ textAlign: 'center', marginBottom: '15px' }}>
    QUANTIDADE POR RESPONSÁVEL
  </h3>

  <div className="tabela-container">
    <table>
      <thead>
        <tr>
          <th>Responsável</th>
          <th>Quantidade</th>
          <th>Ações</th>
        </tr>
      </thead>

      <tbody>
        {quantidadePorResponsavel.map((item) => (
          <tr
  key={item.responsavel}
onClick={() => {
  setResponsavelSelecionado(item.responsavel)
  setBusca("")
}}
  style={{ cursor: "pointer" }}
>
            <td>{item.responsavel}</td>
            <td>{item.quantidade}</td>
            <td>
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation()
      editarResponsavel(item.responsavel)
    }}
  >
    Editar
  </button>
  <button
  type="button"
  onClick={(e) => {
    e.stopPropagation()
    setResponsavelSelecionado(item.responsavel)
    const contatosDoResponsavel = apoiadores.filter((a) => a.responsavel === item.responsavel && a.telefone)
const contatoAtual = contatosDoResponsavel[indiceWhatsApp]
if (contatoAtual) abrirWhatsApp(contatoAtual.telefone, contatoAtual.nome)
  setIndiceWhatsApp((indiceWhatsApp + 1) % contatosDoResponsavel.length)
    setBusca("")
  }}
>
  WhatsApp
</button>
</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
)}
{!cadastroPublico && (
<div style={{ margin: "30px 0" }}>
  <h3 style={{ textAlign: "center", marginBottom: "15px" }}>
    CONTATOS DUPLICADOS — {contatosDuplicados.length}
  </h3>

  <div className="tabela-container">
    <table>
      <thead>
        <tr>
          <th>Telefone</th>
          <th>Quantidade</th>
          <th>Nomes cadastrados</th>
        </tr>
      </thead>

      <tbody>
        {contatosDuplicados.map((grupo) => (
          <tr key={grupo.telefone}>
            <td>{grupo.telefone}</td>
            <td>{grupo.quantidade}</td>
            <td>
              {grupo.registros.map((registro) => (
  <div key={registro.id} style={{ marginBottom: "8px" }}>
    <span>{registro.nome || "Sem nome"}</span>

    <button
      type="button"
      onClick={() => editarApoiador(registro)}
      style={{ marginLeft: "10px" }}
    >
      Editar
    </button>
<button
  type="button"
  onClick={() => excluirApoiador(registro)}
  style={{ marginLeft: "10px" }}
>
  Excluir
</button>
  </div>
))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
)}
{busca && (
  <h3 style={{ textAlign: "center", margin: "20px 0" }}>
    {busca.toUpperCase()} — {apoiadoresFiltrados.length} APOIADORES
  </h3>
)}
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
                 {apoiadoresFiltrados
  .filter((apoiador) => {
    if (!responsavelSelecionado) return true

    const responsavel = apoiador.responsavel?.trim() || "Sem responsável"

    return (
      responsavel.toLowerCase() ===
      responsavelSelecionado.trim().toLowerCase()
    )
  })
  .map((apoiador) => (
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
  onClick={() => abrirWhatsApp(apoiador.telefone, apoiador.nome)}
>
  WhatsApp
</button>

{['admin', 'coordenador'].includes(perfil?.role) && (
  <>                         <button
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
                          </>
)}
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