// utils.js - shared helpers used by transactions.js and dashboard.js

const transactionURL = "./data/transactions.json";
const STORAGE_KEY = "transactions_data";
const PAGE_SIZE = 10;

// Safe DOM getter
function $id(id) {
  return document.getElementById(id);
}

function fmt(v) {
  return Number(v).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseDate(s) {
  return new Date(s + "T00:00:00");
}

function escapeHTML(s) {
  return (s || "").replace(
    /[&<>\"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ])
  );
}

async function loadSeedData() {
  try {
    const res = await fetch("data/transactions.json");
    if (!res.ok) throw new Error("JSON file not found");

    const json = await res.json();
    json.sort((a, b) => parseDate(b.date) - parseDate(a.date));
    return json; // always return seed data only
  } catch (e) {
    console.error("Failed to load seed JSON:", e);
    return [];
  }
}

function saveToLocal(transactions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function getMonthKey(dt) {
  const d = new Date(dt);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthBuckets(data) {
  const buckets = {};
  data.forEach((t) => {
    const key = getMonthKey(t.date);
    buckets[key] = buckets[key] || { income: 0, expense: 0 };
    if (t.type === "Credit") buckets[key].income += t.amount;
    else buckets[key].expense += t.amount;
  });
  return buckets;
}

// Export for ES module style if needed (but files are plain scripts)
window.FMUtils = {
  fmt,
  parseDate,
  escapeHTML,
  loadSeedData,
  saveToLocal,
  getMonthKey,
  getMonthBuckets,
  PAGE_SIZE,
};
