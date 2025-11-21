let transactions = [];
let barChart, pieChart, lineChart;

const els = {
  dTotalIncome: document.getElementById("d-total-income"),
  dTotalExpense: document.getElementById("d-total-expense"),
  dNetBalance: document.getElementById("d-net-balance"),
  dAvgSavings: document.getElementById("d-avg-savings"),
  highestCategory: document.getElementById("highest-category"),
  insTotalTrans: document.getElementById("ins-total-trans"),
  insAvgSaving: document.getElementById("ins-avg-saving"),
};

function loadFromLocal() {
  const saved = localStorage.getItem(FMUtils.STORAGE_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch (e) {
    console.error("Failed to parse local data:", e);
    return null;
  }
}

if (document.getElementById("page-dashboard")) {
  (async function init() {
    const saved = loadFromLocal();

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
    renderAll();

    // update when transactions page writes to local storage
    window.addEventListener("storage", (e) => {
      if (e.key === FMUtils.STORAGE_KEY) {
        const updated = loadFromLocal();
        if (updated) {
          transactions = updated;
          renderAll();
        }
      }
    });
  })();
}

function renderAll() {
  renderSummaryCards();
  renderCharts();
}

function renderSummaryCards() {
  const data = transactions;
  const income = data
    .filter((t) => t.type === "Credit")
    .reduce((s, t) => s + t.amount, 0);
  const expense = data
    .filter((t) => t.type === "Expense")
    .reduce((s, t) => s + t.amount, 0);
  const net = income - expense;
  if (els.dTotalIncome) els.dTotalIncome.textContent = FMUtils.fmt(income);
  if (els.dTotalExpense) els.dTotalExpense.textContent = FMUtils.fmt(expense);
  if (els.dNetBalance) els.dNetBalance.textContent = FMUtils.fmt(net);

  const months = FMUtils.getMonthBuckets(data);
  const monthlySavings = Object.values(months).map((m) => m.income - m.expense);
  const avgMonthly = monthlySavings.length
    ? monthlySavings.reduce((s, x) => s + x, 0) / monthlySavings.length
    : 0;
  if (els.dAvgSavings) els.dAvgSavings.textContent = FMUtils.fmt(avgMonthly);

  const byCat = {};
  data
    .filter((t) => t.type === "Expense")
    .forEach((t) => (byCat[t.category] = (byCat[t.category] || 0) + t.amount));
  const highest = Object.keys(byCat).length
    ? Object.entries(byCat).sort((a, b) => b[1] - a[1])[0][0]
    : "-";
  if (els.highestCategory) els.highestCategory.textContent = highest;
  if (els.insAvgSaving) els.insAvgSaving.textContent = FMUtils.fmt(avgMonthly);
  if (els.insTotalTrans) els.insTotalTrans.textContent = data.length;
}

function renderCharts() {
  const data = transactions;
  const monthsBuckets = FMUtils.getMonthBuckets(data);
  const labels = Object.keys(monthsBuckets).sort();
  const incomes = labels.map((l) => monthsBuckets[l].income);
  const expenses = labels.map((l) => monthsBuckets[l].expense);

  // BAR CHART
  const barCtx = document.getElementById("barChart");
  if (!barCtx) return;
  const barCtx2d = barCtx.getContext("2d");
  if (barChart) barChart.destroy();
  barChart = new Chart(barCtx2d, {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Income", data: incomes, backgroundColor: "#3b82f6" },
        { label: "Expense", data: expenses, backgroundColor: "#ef4444" },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { tooltip: { mode: "index" }, legend: { position: "top" } },
    },
  });

  // PIE
  const byCat = {};
  data
    .filter((t) => t.type === "Expense")
    .forEach((t) => (byCat[t.category] = (byCat[t.category] || 0) + t.amount));
  const pLabels = Object.keys(byCat);
  const pData = pLabels.map((k) => byCat[k]);
  const pieEl = document.getElementById("pieChart");
  if (pieEl) {
    const pieCtx = pieEl.getContext("2d");
    if (pieChart) pieChart.destroy();
    pieChart = new Chart(pieCtx, {
      type: "pie",
      data: {
        labels: pLabels,
        datasets: [
          {
            data: pData,
            backgroundColor: [
              "#f59e0b",
              "#10b981",
              "#6366f1",
              "#e11d48",
              "#0ea5e9",
              "#f97316",
              "#a855f7",
            ],
          },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });
  }

  // LINE (cumulative)
  const cum = [];
  let running = 0;
  labels.forEach((l, i) => {
    running += incomes[i] - expenses[i];
    cum.push(running);
  });
  const lineEl = document.getElementById("lineChart");
  if (lineEl) {
    const lineCtx = lineEl.getContext("2d");
    if (lineChart) lineChart.destroy();
    lineChart = new Chart(lineCtx, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Balance", data: cum, fill: true, borderColor: "#14b8a6" },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });
  }
}
