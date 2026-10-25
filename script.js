
"use strict";

/* ==================================================
   FILHOS DA ALÉM
   IMEA DE PEREGRINOS
   Sistema de gestão — versão melhorada
   ================================================== */

const CHAVE_DADOS = "filhos-da-alem-v1";

const ESTRUTURA_INICIAL = {
  membros: [],
  acompanhamentos: [],
  atividades: [],
  financas: []
};

const MAPA_TIPOS = {
  membro: "membros",
  acompanhamento: "acompanhamentos",
  atividade: "atividades",
  financeiro: "financas"
};

let dados = carregarDados();
let tipoFormulario = "";
let idEdicao = null;

/* ELEMENTOS */

const menu = document.getElementById("menu");
const menuBtn = document.getElementById("menuBtn");
const modal = document.getElementById("modal");
const formulario = document.getElementById("formulario");
const camposFormulario = document.getElementById("camposFormulario");
const tituloModal = document.getElementById("tituloModal");
const importarInput = document.getElementById("importar");
const pesquisaMembro = document.getElementById("pesquisaMembro");

/* FERRAMENTAS GERAIS */

function criarId() {
  return Date.now().toString(36) +
    Math.random().toString(36).slice(2, 9);
}

function clonarEstruturaInicial() {
  return {
    membros: [],
    acompanhamentos: [],
    atividades: [],
    financas: []
  };
}

function carregarDados() {
  try {
    const texto = localStorage.getItem(CHAVE_DADOS);

    if (!texto) return clonarEstruturaInicial();

    const guardados = JSON.parse(texto);

    return {
      membros: Array.isArray(guardados.membros) ? guardados.membros : [],
      acompanhamentos: Array.isArray(guardados.acompanhamentos)
        ? guardados.acompanhamentos : [],
      atividades: Array.isArray(guardados.atividades)
        ? guardados.atividades : [],
      financas: Array.isArray(guardados.financas)
        ? guardados.financas : []
    };
  } catch (erro) {
    console.error("Erro ao carregar os dados:", erro);

    alert(
      "Não foi possível ler os dados guardados. " +
      "Não limpes os dados do navegador. Verifica se tens um backup."
    );

    return clonarEstruturaInicial();
  }
}

function guardarDados() {
  try {
    localStorage.setItem(CHAVE_DADOS, JSON.stringify(dados));
    atualizarTudo();
    return true;
  } catch (erro) {
    console.error("Erro ao guardar os dados:", erro);

    alert(
      "Não foi possível guardar os dados. " +
      "Verifica o espaço disponível e faz um backup."
    );

    return false;
  }
}

function escapar(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, letra => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[letra]);
}

function formatarKz(valor) {
  return new Intl.NumberFormat("pt-AO", {
    style: "currency",
    currency: "AOA",
    maximumFractionDigits: 2
  }).format(Number(valor) || 0);
}

function dataHoje() {
  const data = new Date();
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function formatarData(valor) {
  if (!valor) return "Não indicada";

  const partes = String(valor).split("-");

  if (partes.length !== 3) return escapar(valor);

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function procurarRegisto(tipo, id) {
  const lista = dados[MAPA_TIPOS[tipo]];

  if (!lista) return null;

  return lista.find(item => item.id === id) || null;
}

function mostrarMensagem(mensagem) {
  const toast = document.getElementById("toast");

  if (!toast) return;

  toast.textContent = mensagem;
  toast.classList.add("visivel");

  clearTimeout(mostrarMensagem.temporizador);

  mostrarMensagem.temporizador = setTimeout(() => {
    toast.classList.remove("visivel");
  }, 3000);
}

function mostrarVazio(mensagem) {
  return `<div class="vazio">${escapar(mensagem)}</div>`;
}

/* CAMPOS DOS FORMULÁRIOS */

function campo(rotulo, nome, tipo = "text", valor = "", obrigatorio = false) {
  const seguro = escapar(valor);

  if (tipo === "textarea") {
    return `
      <label for="${nome}">${rotulo}${obrigatorio ? " *" : ""}</label>
      <textarea id="${nome}" name="${nome}"
        ${obrigatorio ? "required" : ""}>${seguro}</textarea>
    `;
  }

  const minimo = tipo === "number" ? 'min="0" step="any"' : "";

  return `
    <label for="${nome}">${rotulo}${obrigatorio ? " *" : ""}</label>
    <input id="${nome}" name="${nome}" type="${tipo}"
      value="${seguro}" ${minimo}
      ${obrigatorio ? "required" : ""}>
  `;
}

function campoSelect(rotulo, nome, opcoes, valorAtual = "") {
  return `
    <label for="${nome}">${rotulo}</label>
    <select id="${nome}" name="${nome}">
      ${opcoes.map(opcao => `
        <option value="${escapar(opcao.valor)}"
          ${String(opcao.valor) === String(valorAtual) ? "selected" : ""}>
          ${escapar(opcao.texto)}
        </option>
      `).join("")}
    </select>
  `;
}

function opcoesMembros(nomeAtual = "") {
  const nomes = dados.membros
    .filter(m => m.estado === "Activo" || m.nome === nomeAtual)
    .map(m => m.nome);

  const unicos = [...new Set(nomes)];

  return [
    { valor: "", texto: "Seleccionar membro" },
    ...unicos.map(nome => ({ valor: nome, texto: nome }))
  ];
}

/* NAVEGAÇÃO */

function abrirPagina(nome) {
  document.querySelectorAll(".pagina").forEach(pagina => {
    pagina.classList.toggle("ativa", pagina.id === nome);
  });

  document.querySelectorAll("#menu button[data-pagina]").forEach(botao => {
    botao.classList.toggle("ativo", botao.dataset.pagina === nome);
  });

  menu.classList.remove("aberto");
  menuBtn.setAttribute("aria-expanded", "false");
}

document.querySelectorAll("#menu button[data-pagina]").forEach(botao => {
  botao.addEventListener("click", () => abrirPagina(botao.dataset.pagina));
});

menuBtn.addEventListener("click", () => {
  const aberto = menu.classList.toggle("aberto");
  menuBtn.setAttribute("aria-expanded", String(aberto));
});

/* ABRIR FORMULÁRIOS */

function abrirFormulario(tipo, id = null) {
  const chave = MAPA_TIPOS[tipo];

  if (!chave) {
    mostrarMensagem("Tipo de formulário inválido.");
    return;
  }

  tipoFormulario = tipo;
  idEdicao = id;

  const existente = id
    ? dados[chave].find(item => item.id === id)
    : null;

  if (id && !existente) {
    mostrarMensagem("Registo não encontrado.");
    return;
  }

  let html = "";

  if (tipo === "membro") {
    tituloModal.textContent = existente ? "Editar membro" : "Novo membro";

    html = `
      ${campo("Nome completo", "nome", "text", existente?.nome || "", true)}
      ${campo("Telefone", "telefone", "tel", existente?.telefone || "")}
      ${campo("Data de nascimento", "nascimento", "date", existente?.nascimento || "")}
      ${campo("Morada / Bairro", "morada", "text", existente?.morada || "")}
      ${campo("Data de entrada", "entrada", "date", existente?.entrada || dataHoje())}
      ${campoSelect("Estado", "estado", [
        { valor: "Activo", texto: "Activo" },
        { valor: "Inactivo", texto: "Inactivo" }
      ], existente?.estado || "Activo")}
      ${campo("Função na organização", "funcao", "text", existente?.funcao || "")}
      ${campo("Observações", "observacoes", "textarea", existente?.observacoes || "")}
    `;
  }

  if (tipo === "acompanhamento") {
    tituloModal.textContent = existente
      ? "Editar acompanhamento"
      : "Novo acompanhamento";

    html = `
      ${campoSelect("Membro", "membro",
        opcoesMembros(existente?.membro || ""), existente?.membro || "")}
      ${campoSelect("Tipo de contacto", "tipo", [
        { valor: "Visita", texto: "Visita" },
        { valor: "Chamada telefónica", texto: "Chamada telefónica" },
        { valor: "Conversa pessoal", texto: "Conversa pessoal" },
        { valor: "Apoio", texto: "Apoio" },
        { valor: "Outro", texto: "Outro" }
      ], existente?.tipo || "Visita")}
      ${campo("Data", "data", "date", existente?.data || dataHoje(), true)}
      ${campo("Responsável pelo contacto", "responsavel", "text", existente?.responsavel || "")}
      ${campo("Descrição", "descricao", "textarea", existente?.descricao || "", true)}
      ${campoSelect("Estado", "estado", [
        { valor: "Pendente", texto: "Pendente" },
        { valor: "Concluído", texto: "Concluído" }
      ], existente?.estado || "Pendente")}
    `;
  }

  if (tipo === "atividade") {
    tituloModal.textContent = existente ? "Editar actividade" : "Nova actividade";

    html = `
      ${campo("Nome da actividade", "nome", "text", existente?.nome || "", true)}
      ${campoSelect("Categoria", "categoria", [
        { valor: "Reunião", texto: "Reunião" },
        { valor: "Visita", texto: "Visita" },
        { valor: "Acção solidária", texto: "Acção solidária" },
        { valor: "Formação", texto: "Formação" },
        { valor: "Evangelização", texto: "Evangelização" },
        { valor: "Confraternização", texto: "Confraternização" },
        { valor: "Outra", texto: "Outra" }
      ], existente?.categoria || "Reunião")}
      ${campo("Data", "data", "date", existente?.data || dataHoje(), true)}
      ${campo("Hora", "hora", "time", existente?.hora || "")}
      ${campo("Local", "local", "text", existente?.local || "")}
      ${campo("Responsável", "responsavel", "text", existente?.responsavel || "")}
      ${campo("Número de participantes", "participantes", "number", existente?.participantes ?? 0)}
      ${campo("Descrição / Objectivo", "descricao", "textarea", existente?.descricao || "")}
      ${campoSelect("Estado", "estado", [
        { valor: "Planeada", texto: "Planeada" },
        { valor: "Concluída", texto: "Concluída" },
        { valor: "Cancelada", texto: "Cancelada" }
      ], existente?.estado || "Planeada")}
    `;
  }

  if (tipo === "financeiro") {
    tituloModal.textContent = existente
      ? "Editar movimento financeiro"
      : "Novo movimento financeiro";

    html = `
      ${campoSelect("Tipo de movimento", "tipo", [
        { valor: "Entrada", texto: "Entrada" },
        { valor: "Despesa", texto: "Despesa" }
      ], existente?.tipo || "Entrada")}
      ${campo("Descrição", "descricao", "text", existente?.descricao || "", true)}
      ${campo("Valor em Kz", "valor", "number", existente?.valor ?? "", true)}
      ${campo("Data", "data", "date", existente?.data || dataHoje(), true)}
      ${campoSelect("Categoria", "categoria", [
        { valor: "Contribuição", texto: "Contribuição" },
        { valor: "Doação", texto: "Doação" },
        { valor: "Quota", texto: "Quota" },
        { valor: "Transporte", texto: "Transporte" },
        { valor: "Alimentação", texto: "Alimentação" },
        { valor: "Material", texto: "Material" },
        { valor: "Apoio social", texto: "Apoio social" },
        { valor: "Outra", texto: "Outra" }
      ], existente?.categoria || "Contribuição")}
      ${campo("Responsável / Origem", "responsavel", "text", existente?.responsavel || "")}
      ${campo("Observações", "observacoes", "textarea", existente?.observacoes || "")}
    `;
  }

  camposFormulario.innerHTML = html;
  modal.classList.remove("escondido");
  document.body.style.overflow = "hidden";

  const primeiroCampo = camposFormulario.querySelector("input, select, textarea");
  if (primeiroCampo) primeiroCampo.focus();
}

function fecharModal() {
  modal.classList.add("escondido");
  document.body.style.overflow = "";
  formulario.reset();
  camposFormulario.innerHTML = "";
  idEdicao = null;
}

window.abrirFormulario = abrirFormulario;
window.fecharModal = fecharModal;

modal.addEventListener("click", evento => {
  if (evento.target === modal) fecharModal();
});

document.addEventListener("keydown", evento => {
  if (evento.key === "Escape") fecharModal();
});

/* GUARDAR E EDITAR REGISTOS */

formulario.addEventListener("submit", evento => {
  evento.preventDefault();

  const chave = MAPA_TIPOS[tipoFormulario];

  if (!chave) {
    mostrarMensagem("Não foi possível identificar o formulário.");
    return;
  }

  const registo = Object.fromEntries(new FormData(formulario).entries());

  if (tipoFormulario === "membro") {
    registo.nome = (registo.nome || "").trim();

    if (!registo.nome) {
      mostrarMensagem("Introduz o nome do membro.");
      return;
    }

    const duplicado = dados.membros.some(m =>
      m.id !== idEdicao &&
      m.nome.trim().toLowerCase() === registo.nome.toLowerCase()
    );

    if (duplicado) {
      mostrarMensagem("Já existe um membro com esse nome.");
      return;
    }
  }

  if (tipoFormulario === "acompanhamento") {
    registo.descricao = (registo.descricao || "").trim();

    if (!registo.membro || !registo.data || !registo.descricao) {
      mostrarMensagem("Selecciona o membro e preenche a data e descrição.");
      return;
    }
  }

  if (tipoFormulario === "atividade") {
    registo.nome = (registo.nome || "").trim();

    if (!registo.nome || !registo.data) {
      mostrarMensagem("Preenche o nome e a data da actividade.");
      return;
    }

    registo.participantes = Math.max(0, Number(registo.participantes) || 0);
  }

  if (tipoFormulario === "financeiro") {
    registo.descricao = (registo.descricao || "").trim();
    registo.valor = Number(registo.valor);

    if (!registo.descricao || !registo.data) {
      mostrarMensagem("Preenche a descrição e a data.");
      return;
    }

    if (!Number.isFinite(registo.valor) || registo.valor <= 0) {
      mostrarMensagem("O valor deve ser superior a zero.");
      return;
    }
  }

  const lista = dados[chave];

  if (idEdicao) {
    const indice = lista.findIndex(item => item.id === idEdicao);

    if (indice === -1) {
      mostrarMensagem("O registo já não existe.");
      return;
    }

    lista[indice] = {
      ...lista[indice],
      ...registo,
      atualizadoEm: new Date().toISOString()
    };
  } else {
    lista.push({
      ...registo,
      id: criarId(),
      criadoEm: new Date().toISOString()
    });
  }

  const foiEdicao = Boolean(idEdicao);

  if (guardarDados()) {
    fecharModal();
    mostrarMensagem(foiEdicao ? "Registo actualizado!" : "Registo guardado!");
  }
});

/* MEMBROS */

function renderizarMembros() {
  const recipiente = document.getElementById("listaMembros");
  const pesquisa = (pesquisaMembro?.value || "").trim().toLowerCase();

  const lista = dados.membros
    .filter(m => [
      m.nome, m.telefone, m.morada, m.funcao
    ].join(" ").toLowerCase().includes(pesquisa))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt"));

  if (!lista.length) {
    recipiente.innerHTML = mostrarVazio(
      pesquisa ? "Nenhum membro encontrado." : "Ainda não há membros registados."
    );
    return;
  }

  recipiente.innerHTML = lista.map(m => `
    <article class="item">
      <h3>${escapar(m.nome)}</h3>
      <span class="estado ${m.estado === "Inactivo" ? "inativo" : ""}">
        ${escapar(m.estado || "Activo")}
      </span>
      <p>Telefone: ${escapar(m.telefone || "Não indicado")}</p>
      <p>Morada: ${escapar(m.morada || "Não indicada")}</p>
      <p>Função: ${escapar(m.funcao || "Não indicada")}</p>
      <p>Data de entrada: ${formatarData(m.entrada)}</p>
      ${m.observacoes ? `<p>Observações: ${escapar(m.observacoes)}</p>` : ""}
      <button data-acao="editar" data-tipo="membro" data-id="${escapar(m.id)}">Editar</button>
      <button data-acao="acompanhar" data-id="${escapar(m.id)}">Acompanhar</button>
      <button data-acao="estado" data-id="${escapar(m.id)}">
        ${m.estado === "Inactivo" ? "Activar" : "Inactivar"}
      </button>
      <button class="apagar" data-acao="apagar" data-tipo="membro" data-id="${escapar(m.id)}">Apagar</button>
    </article>
  `).join("");
}

pesquisaMembro?.addEventListener("input", renderizarMembros);

/* ACOMPANHAMENTOS */

function renderizarAcompanhamentos() {
  const recipiente = document.getElementById("listaAcompanhamentos");

  const lista = [...dados.acompanhamentos].sort((a, b) =>
    String(b.data).localeCompare(String(a.data))
  );

  if (!lista.length) {
    recipiente.innerHTML = mostrarVazio("Ainda não há acompanhamentos.");
    return;
  }

  recipiente.innerHTML = lista.map(item => `
    <article class="item">
      <h3>${escapar(item.membro)}</h3>
      <span class="estado ${item.estado === "Pendente" ? "pendente" : ""}">
        ${escapar(item.estado)}
      </span>
      <p>Tipo: ${escapar(item.tipo)}</p>
      <p>Data: ${formatarData(item.data)}</p>
      <p>Responsável: ${escapar(item.responsavel || "Não indicado")}</p>
      <p>${escapar(item.descricao)}</p>
      <button data-acao="editar" data-tipo="acompanhamento" data-id="${escapar(item.id)}">Editar</button>
      ${item.estado === "Pendente" ? `
        <button data-acao="concluir-acompanhamento" data-id="${escapar(item.id)}">Marcar concluído</button>
      ` : ""}
      <button class="apagar" data-acao="apagar" data-tipo="acompanhamento" data-id="${escapar(item.id)}">Apagar</button>
    </article>
  `).join("");
}

/* ACTIVIDADES */

function renderizarAtividades() {
  const recipiente = document.getElementById("listaAtividades");

  const lista = [...dados.atividades].sort((a, b) =>
    String(a.data).localeCompare(String(b.data))
  );

  if (!lista.length) {
    recipiente.innerHTML = mostrarVazio("Ainda não há actividades.");
    return;
  }

  recipiente.innerHTML = lista.map(item => `
    <article class="item">
      <h3>${escapar(item.nome)}</h3>
      <span class="estado ${
        item.estado === "Planeada" ? "pendente" :
        item.estado === "Cancelada" ? "inativo" : ""
      }">${escapar(item.estado)}</span>
      <p>Categoria: ${escapar(item.categoria)}</p>
      <p>Data: ${formatarData(item.data)}${item.hora ? " · " + escapar(item.hora) : ""}</p>
      <p>Local: ${escapar(item.local || "Não indicado")}</p>
      <p>Responsável: ${escapar(item.responsavel || "Não indicado")}</p>
      <p>Participantes: ${Number(item.participantes) || 0}</p>
      ${item.descricao ? `<p>${escapar(item.descricao)}</p>` : ""}
      <button data-acao="editar" data-tipo="atividade" data-id="${escapar(item.id)}">Editar</button>
      ${item.estado !== "Concluída" ? `
        <button data-acao="concluir-atividade" data-id="${escapar(item.id)}">Marcar concluída</button>
      ` : ""}
      <button class="apagar" data-acao="apagar" data-tipo="atividade" data-id="${escapar(item.id)}">Apagar</button>
    </article>
  `).join("");
}

/* FINANÇAS */

function calcularFinancas() {
  const entradas = dados.financas
    .filter(item => item.tipo === "Entrada")
    .reduce((soma, item) => soma + (Number(item.valor) || 0), 0);

  const despesas = dados.financas
    .filter(item => item.tipo === "Despesa")
    .reduce((soma, item) => soma + (Number(item.valor) || 0), 0);

  return { entradas, despesas, saldo: entradas - despesas };
}

function renderizarFinancas() {
  const recipiente = document.getElementById("listaFinanceiro");
  const totais = calcularFinancas();

  document.getElementById("entradaTotal").textContent = formatarKz(totais.entradas);
  document.getElementById("despesaTotal").textContent = formatarKz(totais.despesas);

  const lista = [...dados.financas].sort((a, b) =>
    String(b.data).localeCompare(String(a.data))
  );

  if (!lista.length) {
    recipiente.innerHTML = mostrarVazio("Ainda não há movimentos financeiros.");
    return;
  }

  recipiente.innerHTML = lista.map(item => `
    <article class="item">
      <h3>${escapar(item.descricao)}</h3>
      <span class="estado ${item.tipo === "Despesa" ? "pendente" : ""}">
        ${escapar(item.tipo)}
      </span>
      <p>Valor: ${formatarKz(item.valor)}</p>
      <p>Data: ${formatarData(item.data)}</p>
      <p>Categoria: ${escapar(item.categoria)}</p>
      <p>Responsável / Origem: ${escapar(item.responsavel || "Não indicado")}</p>
      ${item.observacoes ? `<p>${escapar(item.observacoes)}</p>` : ""}
      <button data-acao="editar" data-tipo="financeiro" data-id="${escapar(item.id)}">Editar</button>
      <button class="apagar" data-acao="apagar" data-tipo="financeiro" data-id="${escapar(item.id)}">Apagar</button>
    </article>
  `).join("");
}

/* PAINEL PRINCIPAL */

function renderizarDashboard() {
  const ativos = dados.membros.filter(m => m.estado === "Activo").length;
  const pendentes = dados.acompanhamentos.filter(a => a.estado === "Pendente").length;
  const totais = calcularFinancas();

  document.getElementById("totalMembros").textContent = ativos;
  document.getElementById("totalAtividades").textContent = dados.atividades.length;
  document.getElementById("totalPendentes").textContent = pendentes;
  document.getElementById("saldoAtual").textContent = formatarKz(totais.saldo);

  const recipiente = document.getElementById("listaDashboardAtividades");

  const proximas = dados.atividades
    .filter(a => a.estado === "Planeada" && a.data >= dataHoje())
    .sort((a, b) => String(a.data).localeCompare(String(b.data)))
    .slice(0, 5);

  recipiente.innerHTML = proximas.length
    ? proximas.map(a => `
        <article class="item">
          <h3>${escapar(a.nome)}</h3>
          <p>${formatarData(a.data)}${a.hora ? " · " + escapar(a.hora) : ""}</p>
          <p>Local: ${escapar(a.local || "Não indicado")}</p>
        </article>
      `).join("")
    : mostrarVazio("Não há actividades futuras planeadas.");
}

/* RELATÓRIOS */

function renderizarRelatorios() {
  const totais = calcularFinancas();

  document.getElementById("rMembros").textContent = dados.membros.length;

  document.getElementById("rAtividades").textContent =
    dados.atividades.filter(a => a.estado === "Concluída").length;

  document.getElementById("rSaldo").textContent = formatarKz(totais.saldo);
}

function atualizarTudo() {
  renderizarMembros();
  renderizarAcompanhamentos();
  renderizarAtividades();
  renderizarFinancas();
  renderizarDashboard();
  renderizarRelatorios();
}

/* BOTÕES DE ACÇÃO */

document.addEventListener("click", evento => {
  const botao = evento.target.closest("button[data-acao]");

  if (!botao) return;

  const acao = botao.dataset.acao;
  const tipo = botao.dataset.tipo;
  const id = botao.dataset.id;

  if (acao === "editar") {
    abrirFormulario(tipo, id);
    return;
  }

  if (acao === "acompanhar") {
    const membro = dados.membros.find(m => m.id === id);

    if (!membro) return;

    abrirFormulario("acompanhamento");

    const select = document.getElementById("membro");
    if (select) select.value = membro.nome;

    return;
  }

  if (acao === "estado") {
    const membro = dados.membros.find(m => m.id === id);

    if (!membro) return;

    membro.estado = membro.estado === "Inactivo" ? "Activo" : "Inactivo";

    if (guardarDados()) mostrarMensagem("Estado actualizado.");
    return;
  }

  if (acao === "concluir-acompanhamento") {
    const item = dados.acompanhamentos.find(a => a.id === id);

    if (!item) return;

    item.estado = "Concluído";

    if (guardarDados()) mostrarMensagem("Acompanhamento concluído.");
    return;
  }

  if (acao === "concluir-atividade") {
    const item = dados.atividades.find(a => a.id === id);

    if (!item) return;

    item.estado = "Concluída";

    if (guardarDados()) mostrarMensagem("Actividade concluída.");
    return;
  }

  if (acao === "apagar") {
    const chave = MAPA_TIPOS[tipo];
    if (!chave) return;

    const registo = dados[chave].find(item => item.id === id);
    if (!registo) return;

    if (!confirm("Tens a certeza de que pretendes apagar este registo? Esta acção não pode ser desfeita.")) {
      return;
    }

    dados[chave] = dados[chave].filter(item => item.id !== id);

    if (guardarDados()) mostrarMensagem("Registo apagado.");
  }
});

/* EXPORTAR BACKUP */

function exportarJSON() {
  const conteudo = JSON.stringify({
    aplicacao: "Filhos da Além",
    versao: 1,
    exportadoEm: new Date().toISOString(),
    dados
  }, null, 2);

  const blob = new Blob([conteudo], {
    type: "application/json;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `backup-filhos-da-alem-${dataHoje()}.json`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);

  mostrarMensagem("Backup exportado. Guarda o ficheiro num local seguro.");
}

window.exportarJSON = exportarJSON;

/* RESTAURAR BACKUP */

importarInput.addEventListener("change", async evento => {
  const ficheiro = evento.target.files?.[0];

  if (!ficheiro) return;

  try {
    const conteudo = JSON.parse(await ficheiro.text());
    const origem = conteudo.dados || conteudo;

    const chaves = ["membros", "acompanhamentos", "atividades", "financas"];

    if (!origem || !chaves.every(chave => Array.isArray(origem[chave]))) {
      throw new Error("Formato de backup inválido.");
    }

    if (!confirm(
      "A restauração substituirá os dados actuais. " +
      "Faz primeiro um backup dos dados actuais. Queres continuar?"
    )) return;

    const dadosAnteriores = dados;

    dados = {
      membros: origem.membros,
      acompanhamentos: origem.acompanhamentos,
      atividades: origem.atividades,
      financas: origem.financas
    };

    if (guardarDados()) {
      mostrarMensagem("Backup restaurado com sucesso!");
    } else {
      dados = dadosAnteriores;
      atualizarTudo();
    }
  } catch (erro) {
    console.error("Erro na restauração:", erro);
    alert("Não foi possível restaurar este backup. Verifica se o ficheiro é válido.");
  } finally {
    importarInput.value = "";
  }
});

/* EFEITO DECORATIVO: LETRAS E BRILHOS FLUTUANTES */

function adicionarEfeitosFlutuantes() {
  const hero = document.querySelector(".hero");

  if (!hero || hero.querySelector(".efeitos-flutuantes")) return;

  const camada = document.createElement("div");
  camada.className = "efeitos-flutuantes";
  camada.setAttribute("aria-hidden", "true");

  ["✦", "F", "A", "✧", "✦", "·"].forEach((simbolo, indice) => {
    const elemento = document.createElement("span");

    elemento.className = "flutuante";
    elemento.textContent = simbolo;
    elemento.style.setProperty("--i", indice);
    elemento.style.left = `${12 + indice * 14}%`;
    elemento.style.animationDelay = `${indice * -1.7}s`;

    camada.appendChild(elemento);
  });

  hero.appendChild(camada);
}

/* INICIALIZAÇÃO */

atualizarTudo();
abrirPagina("dashboard");
adicionarEfeitosFlutuantes();

console.log("Filhos da Além — sistema iniciado.");
