const STORAGE_KEY = "jornada_supporters_v1";

const state = {
  supporters: JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
};

const views = {
  dashboard: document.getElementById("dashboard-view"),
  cadastro: document.getElementById("cadastro-view"),
  lista: document.getElementById("lista-view")
};

const titles = {
  dashboard: "Painel principal",
  cadastro: "Cadastro de apoiador",
  lista: "Apoiadores cadastrados"
};

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.supporters));
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function switchView(viewName) {
  Object.entries(views).forEach(([name, el]) => {
    el.classList.toggle("active", name === viewName);
  });

  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === viewName);
  });

  document.getElementById("page-title").textContent = titles[viewName];
  if (viewName === "lista") renderTable();
  if (viewName === "dashboard") renderDashboard();
}

function formatDate(iso) {
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function isToday(iso) {
  const date = new Date(iso);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function renderDashboard() {
  document.getElementById("total-supporters").textContent = state.supporters.length;
  document.getElementById("today-supporters").textContent =
    state.supporters.filter(s => isToday(s.createdAt)).length;

  const neighborhoods = [...new Set(
    state.supporters
      .map(s => s.neighborhood.trim().toLowerCase())
      .filter(Boolean)
  )];
  document.getElementById("neighborhood-count").textContent = neighborhoods.length;

  const recent = [...state.supporters]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const recentList = document.getElementById("recent-list");
  if (!recent.length) {
    recentList.className = "empty-state";
    recentList.textContent = "Nenhum apoiador cadastrado ainda.";
  } else {
    recentList.className = "";
    recentList.innerHTML = recent.map(item => `
      <div class="recent-item">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.neighborhood)} · ${escapeHtml(item.phone)}</span>
        </div>
        <span>${formatDate(item.createdAt)}</span>
      </div>
    `).join("");
  }

  const counts = {};
  state.supporters.forEach(item => {
    const key = item.neighborhood.trim() || "Não informado";
    counts[key] = (counts[key] || 0) + 1;
  });

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const chart = document.getElementById("neighborhood-chart");

  if (!entries.length) {
    chart.className = "empty-state";
    chart.textContent = "Os bairros aparecerão aqui após os cadastros.";
  } else {
    chart.className = "";
    const max = Math.max(...entries.map(([, count]) => count));
    chart.innerHTML = entries.map(([name, count]) => `
      <div class="bar-row">
        <div class="bar-meta">
          <span>${escapeHtml(name)}</span>
          <strong>${count}</strong>
        </div>
        <div class="bar"><div style="width:${(count / max) * 100}%"></div></div>
      </div>
    `).join("");
  }
}

function renderTable() {
  const query = document.getElementById("search").value.trim().toLowerCase();
  const filtered = state.supporters.filter(item =>
    [item.name, item.phone, item.neighborhood]
      .some(value => (value || "").toLowerCase().includes(query))
  );

  const tbody = document.getElementById("supporters-table");
  const empty = document.getElementById("table-empty");

  tbody.innerHTML = filtered.map(item => `
    <tr>
      <td><strong>${escapeHtml(item.name)}</strong></td>
      <td>${escapeHtml(item.phone)}</td>
      <td>${escapeHtml(item.neighborhood)}</td>
      <td>${escapeHtml(item.status)}</td>
      <td>${formatDate(item.createdAt)}</td>
      <td><button class="delete-btn" data-delete="${item.id}">Excluir</button></td>
    </tr>
  `).join("");

  empty.style.display = filtered.length ? "none" : "block";
}

function escapeHtml(value = "") {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => switchView(button.dataset.view));
});

document.getElementById("quick-add").addEventListener("click", () => switchView("cadastro"));

document.getElementById("supporter-form").addEventListener("submit", event => {
  event.preventDefault();

  const supporter = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    name: document.getElementById("name").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    neighborhood: document.getElementById("neighborhood").value.trim(),
    zone: document.getElementById("zone").value,
    community: document.getElementById("community").value.trim(),
    email: document.getElementById("email").value.trim(),
    owner: document.getElementById("owner").value.trim(),
    status: document.getElementById("status").value,
    notes: document.getElementById("notes").value.trim(),
    createdAt: new Date().toISOString()
  };

  state.supporters.push(supporter);
  save();
  event.target.reset();
  renderDashboard();
  showToast("Apoiador salvo com sucesso.");
  switchView("dashboard");
});

document.getElementById("search").addEventListener("input", renderTable);

document.getElementById("supporters-table").addEventListener("click", event => {
  const id = event.target.dataset.delete;
  if (!id) return;

  const supporter = state.supporters.find(item => item.id === id);
  if (!supporter) return;

  const confirmed = confirm(`Excluir o cadastro de ${supporter.name}?`);
  if (!confirmed) return;

  state.supporters = state.supporters.filter(item => item.id !== id);
  save();
  renderTable();
  renderDashboard();
  showToast("Cadastro excluído.");
});

document.getElementById("export-csv").addEventListener("click", () => {
  if (!state.supporters.length) {
    showToast("Não há dados para exportar.");
    return;
  }

  const headers = [
    "Nome", "Telefone", "Bairro", "Zona", "Comunidade",
    "E-mail", "Responsável", "Status", "Observações", "Cadastro"
  ];

  const rows = state.supporters.map(item => [
    item.name, item.phone, item.neighborhood, item.zone, item.community,
    item.email, item.owner, item.status, item.notes, formatDate(item.createdAt)
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(value => `"${String(value || "").replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `apoiadores-jornada-${new Date().toISOString().slice(0,10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
});

renderDashboard();
renderTable();
