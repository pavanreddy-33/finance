let transactions = [];
let working = [];
let currentPage = 1;
let sortState = { field: null, dir: null };
let filters = { from: null, to: null, category: "" };

const els = {
  navTransactions: document.getElementById("nav-transactions"),
  navDashboard: document.getElementById("nav-dashboard"),
  pageTransactions: document.getElementById("page-transactions"),
  totalIncome: document.getElementById("total-income"),
  totalExpense: document.getElementById("total-expense"),
  netBalance: document.getElementById("net-balance"),
  ratio: document.getElementById("ratio"),
  addBtn: document.getElementById("add-transaction"),
  filterFrom: document.getElementById("filter-from"),
  filterTo: document.getElementById("filter-to"),
  filterCategory: document.getElementById("filter-category"),
  applyFilters: document.getElementById("apply-filters"),
  resetFilters: document.getElementById("reset-filters"),
  resetSeed: document.getElementById("reset-seed"),
  tableBody: document.querySelector("#transactions-table tbody"),
  sortDate: document.getElementById("sort-date"),
  sortAmount: document.getElementById("sort-amount"),
  prevPage: document.getElementById("prev-page"),
  pageNumbers: document.getElementById("page-numbers"),
  nextPage: document.getElementById("next-page"),
  noData: document.getElementById("no-data"),
  modal: document.getElementById("modal"),
  modalTitle: document.getElementById("modal-title"),
  form: document.getElementById("tx-form"),
  txId: document.getElementById("tx-id"),
  txDate: document.getElementById("tx-date"),
  txDesc: document.getElementById("tx-desc"),
  txCategory: document.getElementById("tx-category"),
  datalistCategories: document.getElementById("categories"),
  txType: document.getElementById("tx-type"),
  txAmount: document.getElementById("tx-amount"),
  modalCancel: document.getElementById("modal-cancel"),
};

function loadFromLocal() {
  const saved = localStorage.getItem(FMUtils.STORAGE_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

if (!els.pageTransactions) {
} else {
  (async function init() {
    let saved = loadFromLocal();

    if (saved && Array.isArray(saved)) {
      transactions = saved;
    } else {
      transactions = await FMUtils.loadSeedData();
      FMUtils.saveToLocal(transactions);
    }

    transactions = transactions.map((t) => ({
      ...t,
      amount: Number(t.amount),
    }));
    transactions.sort(
      (a, b) => FMUtils.parseDate(b.date) - FMUtils.parseDate(a.date)
    );

    applyAll();
    attachEvents();
  })();
}

function populateCategoryOptions() {
  if (!els.filterCategory) return;
  const cats = Array.from(
    new Set(transactions.map((t) => t.category).filter(Boolean))
  );
  els.filterCategory.innerHTML = '<option value="">All</option>';
  if (els.datalistCategories) els.datalistCategories.innerHTML = "";
  cats.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    els.filterCategory.appendChild(opt);
    if (els.datalistCategories) {
      const d = document.createElement("option");
      d.value = c;
      d.textContent = c;
      els.datalistCategories.appendChild(d);
    }
  });
}

function updateSummaryCards(data) {
  if (!els.totalIncome) return;
  const income = data
    .filter((t) => t.type === "Credit")
    .reduce((s, t) => s + t.amount, 0);
  const expense = data
    .filter((t) => t.type === "Expense")
    .reduce((s, t) => s + t.amount, 0);
  const net = income - expense;
  els.totalIncome.textContent = FMUtils.fmt(income);
  els.totalExpense.textContent = FMUtils.fmt(expense);
  els.netBalance.textContent = FMUtils.fmt(net);
  els.ratio.textContent =
    income === 0 ? "—" : Math.round((expense / income) * 100) + "%";
}

function updatePaginationButtons(start, total) {
  if (!els.prevPage || !els.nextPage) return;
  els.prevPage.disabled = start === 0;
  els.nextPage.disabled = start + FMUtils.PAGE_SIZE >= total;
}

function renderTable() {
  if (!els.tableBody) return;
  const total = working.length;
  const pages = Math.max(1, Math.ceil(total / FMUtils.PAGE_SIZE));
  if (currentPage > pages) currentPage = 1;
  const start = (currentPage - 1) * FMUtils.PAGE_SIZE;
  const pageSlice = working.slice(start, start + FMUtils.PAGE_SIZE);

  els.tableBody.innerHTML = "";
  if (total === 0) {
    if (els.noData) els.noData.classList.remove("hidden");
  } else {
    if (els.noData) els.noData.classList.add("hidden");
    pageSlice.forEach((tx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${tx.date}</td>
        <td>${FMUtils.escapeHTML(tx.description)}</td>
        <td>${FMUtils.escapeHTML(tx.category)}</td>
        <td>${tx.type}</td>
        <td>${FMUtils.fmt(tx.amount)}</td>
        <td>
          <button class="edit" data-id="${tx.id}">Edit</button>
          <button class="delete" data-id="${tx.id}">Delete</button>
        </td>
      `;
      els.tableBody.appendChild(tr);
    });
    updatePaginationButtons(start, total);
  }

  if (els.pageNumbers) {
    els.pageNumbers.innerHTML = "";
    for (let i = 1; i <= pages; i++) {
      const b = document.createElement("button");
      b.textContent = i;
      if (i === currentPage) b.disabled = true;
      b.addEventListener("click", () => {
        currentPage = i;
        renderTable();
      });
      els.pageNumbers.appendChild(b);
    }
  }
}

function applyAll() {
  updateSummaryCards(transactions);

  working = transactions.slice();

  if (filters.from)
    working = working.filter(
      (t) => FMUtils.parseDate(t.date) >= FMUtils.parseDate(filters.from)
    );
  if (filters.to)
    working = working.filter(
      (t) => FMUtils.parseDate(t.date) <= FMUtils.parseDate(filters.to)
    );
  if (filters.category)
    working = working.filter((t) => t.category === filters.category);

  if (sortState.field) {
    working.sort((a, b) => {
      if (sortState.field === "date") {
        return sortState.dir === "asc"
          ? FMUtils.parseDate(a.date) - FMUtils.parseDate(b.date)
          : FMUtils.parseDate(b.date) - FMUtils.parseDate(a.date);
      } else if (sortState.field === "amount") {
        return sortState.dir === "asc"
          ? a.amount - b.amount
          : b.amount - a.amount;
      }
      return 0;
    });
  }

  populateCategoryOptions();
  renderTable();
}

// Sorting helper
function cycleSort(field) {
  if (sortState.field !== field) {
    sortState.field = field;
    sortState.dir = "asc";
  } else if (sortState.dir === "asc") sortState.dir = "desc";
  else {
    sortState.field = null;
    sortState.dir = null;
  }
  updateSortIcons();
  currentPage = 1;
  applyAll();
}

function updateSortIcons() {
  if (!els.sortDate || !els.sortAmount) return;
  const mapping = { date: els.sortDate, amount: els.sortAmount };
  Object.keys(mapping).forEach((k) => {
    const el = mapping[k];
    if (sortState.field === k)
      el.textContent = sortState.dir === "asc" ? "↑" : "↓";
    else el.textContent = "⬍";
  });
}

function openModal(tx) {
  if (!els.modal) return;
  els.modal.classList.remove("hidden");
  if (tx) {
    els.modalTitle.textContent = "Edit Transaction";
    els.txId.value = tx.id;
    els.txDate.value = tx.date;
    els.txDesc.value = tx.description;
    els.txCategory.value = tx.category;
    els.txType.value = tx.type;
    els.txAmount.value = tx.amount;
  } else {
    els.modalTitle.textContent = "Add Transaction";
    els.form.reset();
    els.txId.value = "";
  }
}
function closeModal() {
  if (!els.modal) return;
  els.modal.classList.add("hidden");
}

function addOrUpdateTx(e) {
  e.preventDefault();
  if (!els.txDate.value || !els.txDesc.value || !els.txAmount.value) {
    console.error("Please fill date, description and amount.");
    return;
  }
  const id = els.txId.value ? Number(els.txId.value) : Date.now();
  const rawAmount = Number(els.txAmount.value);
  if (rawAmount <= 0) {
    alert("Amount must be a positive number.");
    return;
  }

  const tx = {
    id,
    date: els.txDate.value,
    description: els.txDesc.value.trim(),
    category: els.txCategory.value.trim() || "Others",
    type: els.txType.value,
    amount: rawAmount,
  };
  const idx = transactions.findIndex((t) => t.id === id);
  if (idx >= 0) transactions[idx] = tx;
  else transactions.unshift(tx);
  FMUtils.saveToLocal(transactions);
  closeModal();
  applyAll();
}

function deleteTx(id) {
  if (!window.confirm("Delete this transaction?")) return;
  transactions = transactions.filter((t) => t.id !== id);
  FMUtils.saveToLocal(transactions);
  applyAll();
}

function attachEvents() {
  if (els.addBtn) els.addBtn.addEventListener("click", () => openModal(null));
  if (els.modalCancel) els.modalCancel.addEventListener("click", closeModal);
  if (els.form) els.form.addEventListener("submit", addOrUpdateTx);

  if (els.prevPage)
    els.prevPage.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        renderTable();
      }
    });
  if (els.nextPage)
    els.nextPage.addEventListener("click", () => {
      const pages = Math.ceil(working.length / FMUtils.PAGE_SIZE);
      if (currentPage < pages) {
        currentPage++;
        renderTable();
      }
    });

  if (els.applyFilters)
    els.applyFilters.addEventListener("click", () => {
      filters.from = els.filterFrom.value || null;
      filters.to = els.filterTo.value || null;
      filters.category = els.filterCategory.value || "";
      currentPage = 1;
      applyAll();
    });

  if (els.resetFilters)
    els.resetFilters.addEventListener("click", () => {
      filters = { from: null, to: null, category: "" };
      if (els.filterFrom) els.filterFrom.value = "";
      if (els.filterTo) els.filterTo.value = "";
      if (els.filterCategory) els.filterCategory.value = "";
      sortState = { field: null, dir: null };
      updateSortIcons();
      currentPage = 1;
      applyAll();
    });

  if (els.sortDate)
    els.sortDate.addEventListener("click", () => cycleSort("date"));
  if (els.sortAmount)
    els.sortAmount.addEventListener("click", () => cycleSort("amount"));

  if (els.tableBody)
    els.tableBody.addEventListener("click", (e) => {
      if (e.target.matches(".edit")) {
        const id = Number(e.target.dataset.id);
        const tx = transactions.find((t) => t.id === id);
        openModal(tx);
      } else if (e.target.matches(".delete")) {
        const id = Number(e.target.dataset.id);
        deleteTx(id);
      }
    });

  if (els.resetSeed)
    els.resetSeed.addEventListener("click", async () => {
      if (
        !window.confirm(
          "Reset to default seed? This will overwrite local changes."
        )
      )
        return;
      localStorage.removeItem(FMUtils.STORAGE_KEY);
      transactions = await FMUtils.loadSeedData();
      applyAll();
    });
}
