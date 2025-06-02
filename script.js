import { Chart } from "@/components/ui/chart"
// Dados armazenados localmente
let registros = JSON.parse(localStorage.getItem("registrosPeso")) || []
let chart = null

// Mapeamento de tipos de treino
const tiposTreino = {
  peito: { emoji: "🏋️", nome: "Peito", cor: "#1976d2" },
  costas: { emoji: "💪", nome: "Costas", cor: "#7b1fa2" },
  pernas: { emoji: "🦵", nome: "Pernas", cor: "#388e3c" },
  ombros: { emoji: "🤲", nome: "Ombros", cor: "#f57c00" },
  bracos: { emoji: "💪", nome: "Braços", cor: "#c2185b" },
  abdomen: { emoji: "🔥", nome: "Abdômen", cor: "#d32f2f" },
  cardio: { emoji: "🏃", nome: "Cardio", cor: "#00796b" },
  funcional: { emoji: "⚡", nome: "Funcional", cor: "#689f38" },
  yoga: { emoji: "🧘", nome: "Yoga", cor: "#3f51b5" },
  pilates: { emoji: "🤸", nome: "Pilates", cor: "#827717" },
  crossfit: { emoji: "🏋️", nome: "CrossFit", cor: "#5d4037" },
  natacao: { emoji: "🏊", nome: "Natação", cor: "#0277bd" },
  ciclismo: { emoji: "🚴", nome: "Ciclismo", cor: "#7b1fa2" },
  corrida: { emoji: "🏃", nome: "Corrida", cor: "#2e7d32" },
  descanso: { emoji: "😴", nome: "Descanso", cor: "#616161" },
  outro: { emoji: "📝", nome: "Outro", cor: "#424242" },
}

// Mapeamento de humores
const humores = {
  "muito-ruim": { emoji: "😫", nome: "Muito Ruim" },
  ruim: { emoji: "😞", nome: "Ruim" },
  neutro: { emoji: "😐", nome: "Neutro" },
  bom: { emoji: "😊", nome: "Bom" },
  "muito-bom": { emoji: "😄", nome: "Muito Bom" },
}

// Elementos DOM
const form = document.getElementById("peso-form")
const editForm = document.getElementById("edit-form")
const editModal = document.getElementById("edit-modal")
const historicoBody = document.getElementById("historico-body")
const semRegistros = document.getElementById("sem-registros")
const toast = document.getElementById("toast")
const filtroTipo = document.getElementById("filtro-tipo")
const filtroMes = document.getElementById("filtro-mes")
const limparFiltros = document.getElementById("limpar-filtros")

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  // Definir data atual
  const hoje = new Date().toISOString().split("T")[0]
  document.getElementById("data").value = hoje

  // Carregar dados
  carregarHistorico()
  atualizarGrafico()
  atualizarEstatisticas()
  atualizarEstatisticasTreino()
  preencherFiltroMeses()

  // Event listeners para seleção de humor
  setupMoodSelectors()

  // Event listeners para formulários
  form.addEventListener("submit", adicionarRegistro)
  editForm.addEventListener("submit", salvarEdicao)

  // Event listeners para filtros
  filtroTipo.addEventListener("change", aplicarFiltros)
  filtroMes.addEventListener("change", aplicarFiltros)
  limparFiltros.addEventListener("click", limparTodosFiltros)

  // Event listeners para modal
  document.querySelector(".close-modal").addEventListener("click", fecharModal)
  document.getElementById("cancel-edit").addEventListener("click", fecharModal)

  // Fechar modal clicando fora
  editModal.addEventListener("click", (e) => {
    if (e.target === editModal) {
      fecharModal()
    }
  })
})

// Configurar seletores de humor
function setupMoodSelectors() {
  // Seletor principal
  document.querySelectorAll(".mood-btn:not(.edit-mood)").forEach((btn) => {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".mood-btn:not(.edit-mood)").forEach((b) => b.classList.remove("selected"))
      this.classList.add("selected")
      document.getElementById("humor").value = this.dataset.mood
    })
  })

  // Seletor do modal de edição
  document.querySelectorAll(".edit-mood").forEach((btn) => {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".edit-mood").forEach((b) => b.classList.remove("selected"))
      this.classList.add("selected")
      document.getElementById("edit-humor").value = this.dataset.mood
    })
  })
}

// Adicionar novo registro
function adicionarRegistro(e) {
  e.preventDefault()

  const data = document.getElementById("data").value
  const peso = Number.parseFloat(document.getElementById("peso").value)
  const tipoTreino = document.getElementById("tipo-treino").value
  const anotacoes = document.getElementById("anotacoes").value
  const humor = document.getElementById("humor").value

  // Validações
  if (!data) {
    mostrarToast("Por favor, selecione uma data!", "error")
    return
  }

  if (!peso || peso <= 0) {
    mostrarToast("Por favor, informe um peso válido!", "error")
    return
  }

  if (!tipoTreino) {
    mostrarToast("Por favor, selecione o tipo de treino!", "error")
    return
  }

  if (!humor) {
    mostrarToast("Por favor, selecione como você se sentiu hoje!", "warning")
    return
  }

  // Verificar se já existe registro para esta data
  const registroExistente = registros.find((r) => r.data === data)
  if (registroExistente) {
    if (!confirm("Já existe um registro para esta data. Deseja substituí-lo?")) {
      return
    }
    // Remover registro existente
    registros = registros.filter((r) => r.data !== data)
  }

  const novoRegistro = {
    id: Date.now(),
    data,
    peso,
    tipoTreino,
    anotacoes: anotacoes || "",
    humor,
    timestamp: new Date().toISOString(),
  }

  registros.push(novoRegistro)
  registros.sort((a, b) => new Date(b.data) - new Date(a.data))

  salvarDados()
  carregarHistorico()
  atualizarGrafico()
  atualizarEstatisticas()
  atualizarEstatisticasTreino()
  preencherFiltroMeses()

  // Limpar formulário
  form.reset()
  document.getElementById("data").value = new Date().toISOString().split("T")[0]
  document.querySelectorAll(".mood-btn:not(.edit-mood)").forEach((btn) => btn.classList.remove("selected"))
  document.getElementById("humor").value = ""

  mostrarToast("Registro adicionado com sucesso!", "success")
}

// Carregar histórico na tabela
function carregarHistorico() {
  const registrosFiltrados = aplicarFiltrosAtivos()

  if (registrosFiltrados.length === 0) {
    historicoBody.innerHTML = ""
    semRegistros.classList.remove("hidden")
    return
  }

  semRegistros.classList.add("hidden")

  historicoBody.innerHTML = registrosFiltrados
    .map((registro, index) => {
      const registroAnterior = registrosFiltrados[index + 1]
      let variacao = ""
      let classeVariacao = "variacao-neutra"

      if (registroAnterior) {
        const diff = registro.peso - registroAnterior.peso
        if (diff > 0) {
          variacao = `+${diff.toFixed(1)} kg`
          classeVariacao = "variacao-positiva"
        } else if (diff < 0) {
          variacao = `${diff.toFixed(1)} kg`
          classeVariacao = "variacao-negativa"
        } else {
          variacao = "0.0 kg"
        }
      } else {
        variacao = "Primeiro registro"
      }

      const tipoInfo = tiposTreino[registro.tipoTreino] || tiposTreino.outro
      const humorInfo = humores[registro.humor] || humores.neutro

      return `
            <tr>
                <td>${formatarData(registro.data)}</td>
                <td>${registro.peso.toFixed(1)} kg</td>
                <td class="${classeVariacao}">${variacao}</td>
                <td>
                    <span class="tipo-treino-badge tipo-${registro.tipoTreino}">
                        ${tipoInfo.emoji} ${tipoInfo.nome}
                    </span>
                </td>
                <td>
                    <span class="humor-emoji" title="${humorInfo.nome}">
                        ${humorInfo.emoji}
                    </span>
                </td>
                <td class="anotacoes-cell" title="${registro.anotacoes || "Sem anotações"}">
                    ${registro.anotacoes || "<em>Sem anotações</em>"}
                </td>
                <td>
                    <button class="btn btn-edit" onclick="editarRegistro(${registro.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-danger" onclick="excluirRegistro(${registro.id})" style="margin-left: 5px;">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `
    })
    .join("")
}

// Aplicar filtros ativos
function aplicarFiltrosAtivos() {
  let registrosFiltrados = [...registros]

  // Filtro por tipo de treino
  const tipoSelecionado = filtroTipo.value
  if (tipoSelecionado) {
    registrosFiltrados = registrosFiltrados.filter((r) => r.tipoTreino === tipoSelecionado)
  }

  // Filtro por mês
  const mesSelecionado = filtroMes.value
  if (mesSelecionado) {
    registrosFiltrados = registrosFiltrados.filter((r) => {
      const dataRegistro = new Date(r.data)
      const anoMes = `${dataRegistro.getFullYear()}-${String(dataRegistro.getMonth() + 1).padStart(2, "0")}`
      return anoMes === mesSelecionado
    })
  }

  return registrosFiltrados
}

// Aplicar filtros
function aplicarFiltros() {
  carregarHistorico()
}

// Limpar todos os filtros
function limparTodosFiltros() {
  filtroTipo.value = ""
  filtroMes.value = ""
  carregarHistorico()
}

// Preencher filtro de meses
function preencherFiltroMeses() {
  const meses = new Set()

  registros.forEach((registro) => {
    const data = new Date(registro.data)
    const anoMes = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`
    meses.add(anoMes)
  })

  const mesesArray = Array.from(meses).sort().reverse()

  filtroMes.innerHTML = '<option value="">Todos os meses</option>'

  mesesArray.forEach((anoMes) => {
    const [ano, mes] = anoMes.split("-")
    const data = new Date(ano, mes - 1)
    const nomeCompleto = data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })

    const option = document.createElement("option")
    option.value = anoMes
    option.textContent = nomeCompleto.charAt(0).toUpperCase() + nomeCompleto.slice(1)
    filtroMes.appendChild(option)
  })
}

// Editar registro
function editarRegistro(id) {
  const registro = registros.find((r) => r.id === id)
  if (!registro) return

  // Preencher formulário de edição
  document.getElementById("edit-id").value = registro.id
  document.getElementById("edit-data").value = registro.data
  document.getElementById("edit-peso").value = registro.peso
  document.getElementById("edit-tipo-treino").value = registro.tipoTreino
  document.getElementById("edit-anotacoes").value = registro.anotacoes
  document.getElementById("edit-humor").value = registro.humor

  // Selecionar humor
  document.querySelectorAll(".edit-mood").forEach((btn) => {
    btn.classList.remove("selected")
    if (btn.dataset.mood === registro.humor) {
      btn.classList.add("selected")
    }
  })

  // Mostrar modal
  editModal.classList.add("show")
}

// Salvar edição
function salvarEdicao(e) {
  e.preventDefault()

  const id = Number.parseInt(document.getElementById("edit-id").value)
  const data = document.getElementById("edit-data").value
  const peso = Number.parseFloat(document.getElementById("edit-peso").value)
  const tipoTreino = document.getElementById("edit-tipo-treino").value
  const anotacoes = document.getElementById("edit-anotacoes").value
  const humor = document.getElementById("edit-humor").value

  if (!humor) {
    mostrarToast("Por favor, selecione como você se sentiu!", "warning")
    return
  }

  // Verificar se a nova data já existe em outro registro
  const registroComMesmaData = registros.find((r) => r.data === data && r.id !== id)
  if (registroComMesmaData) {
    mostrarToast("Já existe um registro para esta data!", "error")
    return
  }

  // Atualizar registro
  const index = registros.findIndex((r) => r.id === id)
  if (index !== -1) {
    registros[index] = {
      ...registros[index],
      data,
      peso,
      tipoTreino,
      anotacoes: anotacoes || "",
      humor,
    }

    registros.sort((a, b) => new Date(b.data) - new Date(a.data))

    salvarDados()
    carregarHistorico()
    atualizarGrafico()
    atualizarEstatisticas()
    atualizarEstatisticasTreino()
    preencherFiltroMeses()

    fecharModal()
    mostrarToast("Registro atualizado com sucesso!", "success")
  }
}

// Excluir registro
function excluirRegistro(id) {
  if (!confirm("Tem certeza que deseja excluir este registro?")) {
    return
  }

  registros = registros.filter((r) => r.id !== id)

  salvarDados()
  carregarHistorico()
  atualizarGrafico()
  atualizarEstatisticas()
  atualizarEstatisticasTreino()
  preencherFiltroMeses()

  mostrarToast("Registro excluído com sucesso!", "info")
}

// Fechar modal
function fecharModal() {
  editModal.classList.remove("show")
  editForm.reset()
  document.querySelectorAll(".edit-mood").forEach((btn) => btn.classList.remove("selected"))
}

// Atualizar gráfico
function atualizarGrafico() {
  const ctx = document.getElementById("peso-chart").getContext("2d")

  if (chart) {
    chart.destroy()
  }

  if (registros.length === 0) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.font = "16px Arial"
    ctx.fillStyle = "#666"
    ctx.textAlign = "center"
    ctx.fillText("Nenhum dado para exibir", ctx.canvas.width / 2, ctx.canvas.height / 2)
    return
  }

  // Ordenar por data para o gráfico
  const dadosOrdenados = [...registros].sort((a, b) => new Date(a.data) - new Date(b.data))

  const labels = dadosOrdenados.map((r) => formatarData(r.data))
  const dados = dadosOrdenados.map((r) => r.peso)

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Peso (kg)",
          data: dados,
          borderColor: "#667eea",
          backgroundColor: "rgba(102, 126, 234, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "#667eea",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(0,0,0,0.8)",
          titleColor: "#fff",
          bodyColor: "#fff",
          borderColor: "#667eea",
          borderWidth: 1,
          callbacks: {
            afterBody: (context) => {
              const index = context[0].dataIndex
              const registro = dadosOrdenados[index]
              const tipoInfo = tiposTreino[registro.tipoTreino] || tiposTreino.outro
              const humorInfo = humores[registro.humor] || humores.neutro

              return [
                `Treino: ${tipoInfo.emoji} ${tipoInfo.nome}`,
                `Humor: ${humorInfo.emoji} ${humorInfo.nome}`,
                registro.anotacoes
                  ? `Nota: ${registro.anotacoes.substring(0, 50)}${registro.anotacoes.length > 50 ? "..." : ""}`
                  : "",
              ].filter(Boolean)
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          grid: {
            color: "rgba(0,0,0,0.1)",
          },
          ticks: {
            callback: (value) => value.toFixed(1) + " kg",
          },
        },
        x: {
          grid: {
            color: "rgba(0,0,0,0.1)",
          },
        },
      },
    },
  })
}

// Atualizar estatísticas
function atualizarEstatisticas() {
  if (registros.length === 0) {
    document.getElementById("peso-inicial").textContent = "--"
    document.getElementById("peso-atual").textContent = "--"
    document.getElementById("peso-diferenca").textContent = "--"
    document.getElementById("total-registros").textContent = "0"
    return
  }

  // Ordenar por data
  const dadosOrdenados = [...registros].sort((a, b) => new Date(a.data) - new Date(b.data))

  const pesoInicial = dadosOrdenados[0].peso
  const pesoAtual = dadosOrdenados[dadosOrdenados.length - 1].peso
  const diferenca = pesoAtual - pesoInicial

  document.getElementById("peso-inicial").textContent = `${pesoInicial.toFixed(1)} kg`
  document.getElementById("peso-atual").textContent = `${pesoAtual.toFixed(1)} kg`
  document.getElementById("total-registros").textContent = registros.length

  const elementoDiferenca = document.getElementById("peso-diferenca")
  if (diferenca > 0) {
    elementoDiferenca.textContent = `+${diferenca.toFixed(1)} kg`
    elementoDiferenca.className = "stat-value text-success"
  } else if (diferenca < 0) {
    elementoDiferenca.textContent = `${diferenca.toFixed(1)} kg`
    elementoDiferenca.className = "stat-value text-danger"
  } else {
    elementoDiferenca.textContent = "0.0 kg"
    elementoDiferenca.className = "stat-value"
  }
}

// Atualizar estatísticas de treino
function atualizarEstatisticasTreino() {
  if (registros.length === 0) {
    document.getElementById("treinos-mes").textContent = "0"
    document.getElementById("sequencia").textContent = "0"
    document.getElementById("tipo-favorito").textContent = "--"
    return
  }

  // Treinos deste mês
  const agora = new Date()
  const mesAtual = agora.getMonth()
  const anoAtual = agora.getFullYear()

  const treinosEsteMes = registros.filter((r) => {
    const dataRegistro = new Date(r.data)
    return (
      dataRegistro.getMonth() === mesAtual && dataRegistro.getFullYear() === anoAtual && r.tipoTreino !== "descanso"
    )
  }).length

  // Sequência de dias consecutivos (últimos dias)
  const dadosOrdenados = [...registros].sort((a, b) => new Date(b.data) - new Date(a.data))
  let sequencia = 0
  let dataAnterior = null

  for (const registro of dadosOrdenados) {
    const dataAtual = new Date(registro.data)

    if (dataAnterior === null) {
      // Primeiro registro, verificar se é de hoje ou ontem
      const hoje = new Date()
      const ontem = new Date(hoje)
      ontem.setDate(ontem.getDate() - 1)

      if (dataAtual.toDateString() === hoje.toDateString() || dataAtual.toDateString() === ontem.toDateString()) {
        if (registro.tipoTreino !== "descanso") {
          sequencia = 1
        }
        dataAnterior = dataAtual
      } else {
        break
      }
    } else {
      // Verificar se é o dia anterior
      const diaAnterior = new Date(dataAnterior)
      diaAnterior.setDate(diaAnterior.getDate() - 1)

      if (dataAtual.toDateString() === diaAnterior.toDateString()) {
        if (registro.tipoTreino !== "descanso") {
          sequencia++
        }
        dataAnterior = dataAtual
      } else {
        break
      }
    }
  }

  // Tipo de treino favorito
  const contagemTipos = {}
  registros.forEach((r) => {
    if (r.tipoTreino !== "descanso") {
      contagemTipos[r.tipoTreino] = (contagemTipos[r.tipoTreino] || 0) + 1
    }
  })

  let tipoFavorito = "--"
  let maxCount = 0

  for (const [tipo, count] of Object.entries(contagemTipos)) {
    if (count > maxCount) {
      maxCount = count
      tipoFavorito = tiposTreino[tipo]?.nome || tipo
    }
  }

  document.getElementById("treinos-mes").textContent = treinosEsteMes
  document.getElementById("sequencia").textContent = sequencia
  document.getElementById("tipo-favorito").textContent = tipoFavorito
}

// Salvar dados no localStorage
function salvarDados() {
  try {
    localStorage.setItem("registrosPeso", JSON.stringify(registros))
    console.log("Dados salvos com sucesso:", registros)
  } catch (error) {
    console.error("Erro ao salvar dados:", error)
    mostrarToast("Erro ao salvar dados!", "error")
  }
}

// Formatar data para exibição
function formatarData(dataString) {
  const data = new Date(dataString + "T00:00:00")
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

// Mostrar toast de notificação
function mostrarToast(mensagem, tipo = "success") {
  const toastIcon = toast.querySelector(".toast-icon i")
  const toastMessage = toast.querySelector(".toast-message")
  const toastProgress = toast.querySelector(".toast-progress")

  // Definir ícone e cor baseado no tipo
  switch (tipo) {
    case "success":
      toastIcon.className = "fas fa-check-circle"
      toastIcon.style.color = "#28a745"
      toastProgress.style.background = "#28a745"
      break
    case "error":
      toastIcon.className = "fas fa-exclamation-circle"
      toastIcon.style.color = "#dc3545"
      toastProgress.style.background = "#dc3545"
      break
    case "warning":
      toastIcon.className = "fas fa-exclamation-triangle"
      toastIcon.style.color = "#ffc107"
      toastProgress.style.background = "#ffc107"
      break
    case "info":
      toastIcon.className = "fas fa-info-circle"
      toastIcon.style.color = "#17a2b8"
      toastProgress.style.background = "#17a2b8"
      break
  }

  toastMessage.textContent = mensagem

  // Mostrar toast
  toast.classList.add("show")

  // Esconder após 3 segundos
  setTimeout(() => {
    toast.classList.remove("show")
  }, 3000)
}

// Frases motivacionais
const frasesMotivacionais = [
  "O sucesso não é dado. É conquistado. Na pista, no campo, na academia. Com sangue, suor e o trabalho ocasional de uma lágrima.",
  "Não é sobre ser perfeito. É sobre ser melhor do que você era ontem.",
  "A dor que você sente hoje será a força que você sentirá amanhã.",
  "Seus únicos limites são aqueles que você define para si mesmo.",
  "O corpo alcança o que a mente acredita.",
  "Cada treino é um passo mais próximo do seu objetivo.",
  "A disciplina é a ponte entre objetivos e conquistas.",
  "Não desista. Sofra agora e viva o resto da sua vida como um campeão.",
  "A transformação acontece fora da sua zona de conforto.",
  "Você é mais forte do que suas desculpas.",
]

// Alterar frase motivacional aleatoriamente
function alterarFraseMotivacional() {
  const quoteElement = document.getElementById("quote-text")
  if (quoteElement) {
    const fraseAleatoria = frasesMotivacionais[Math.floor(Math.random() * frasesMotivacionais.length)]
    quoteElement.textContent = fraseAleatoria
  }
}

// Alterar frase a cada 10 segundos
setInterval(alterarFraseMotivacional, 10000)

// Função para exportar dados (funcionalidade extra)
function exportarDados() {
  if (registros.length === 0) {
    mostrarToast("Não há dados para exportar!", "warning")
    return
  }

  const dadosCSV = [
    ["Data", "Peso (kg)", "Tipo de Treino", "Humor", "Anotações"],
    ...registros.map((r) => [
      r.data,
      r.peso,
      tiposTreino[r.tipoTreino]?.nome || r.tipoTreino,
      humores[r.humor]?.nome || r.humor,
      r.anotacoes || "",
    ]),
  ]

  const csvContent = dadosCSV.map((row) => row.map((field) => `"${field}"`).join(",")).join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", `rastreador_peso_${new Date().toISOString().split("T")[0]}.csv`)
  link.style.visibility = "hidden"

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  mostrarToast("Dados exportados com sucesso!", "success")
}

// Tornar funções globais para uso nos botões HTML
window.editarRegistro = editarRegistro
window.excluirRegistro = excluirRegistro
window.exportarDados = exportarDados

// Adicionar botão de exportação (pode ser chamado via console ou adicionado à interface)
console.log("💡 Dica: Digite exportarDados() no console para exportar seus dados!")
