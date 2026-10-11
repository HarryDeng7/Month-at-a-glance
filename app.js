const STORE_KEY = "plan-calendar.v1";
const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PREVIEWS = 2;

const gridEl = document.getElementById("grid");
const dowEl = document.getElementById("dow");
const titleEl = document.getElementById("title");
const panelTitleEl = document.getElementById("panelTitle");
const tasksEl = document.getElementById("tasks");
const addForm = document.getElementById("addForm");
const inputEl = document.getElementById("taskInput");

const today = new Date();
let view = { y: today.getFullYear(), m: today.getMonth() };
let selected = keyOf(today);
let store = load();

function keyOf(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY));
    return raw && typeof raw === "object" ? raw : {};
  } catch (e) {
    return {};
  }
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch (e) {}
}

function renderHead() {
  dowEl.innerHTML = DOW.map(function (d) { return "<div>" + d + "</div>"; }).join("");
  titleEl.textContent = MONTHS[view.m] + " " + view.y;
}

function renderGrid() {
  const first = new Date(view.y, view.m, 1);
  const start = new Date(view.y, view.m, 1 - first.getDay());
  const todayKey = keyOf(today);
  let html = "";

  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = keyOf(d);
    const list = store[key] || [];
    const cls = ["day"];
    if (d.getMonth() !== view.m) cls.push("other");
    if (key === todayKey) cls.push("today");
    if (key === selected) cls.push("selected");

    let inner = '<div class="num">' + d.getDate() + "</div>";
    list.slice(0, PREVIEWS).forEach(function (t) {
      inner += '<div class="preview' + (t.done ? " done" : "") + '">' + escapeHtml(t.text) + "</div>";
    });
    if (list.length > PREVIEWS) inner += '<div class="more">+' + (list.length - PREVIEWS) + " more</div>";

    html += '<div class="' + cls.join(" ") + '" data-key="' + key + '">' + inner + "</div>";
  }

  gridEl.innerHTML = html;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}

function renderPanel() {
  const parts = selected.split("-");
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  panelTitleEl.textContent = DOW[d.getDay()] + ", " + MONTHS[d.getMonth()].slice(0, 3) + " " + d.getDate();

  const list = store[selected] || [];
  if (!list.length) {
    tasksEl.innerHTML = '<li class="empty">Nothing planned.</li>';
    return;
  }

  tasksEl.innerHTML = list.map(function (t, i) {
    return '<li class="' + (t.done ? "done" : "") + '" data-i="' + i + '">' +
      '<input type="checkbox"' + (t.done ? " checked" : "") + ' aria-label="Done">' +
      '<span class="text">' + escapeHtml(t.text) + "</span>" +
      '<button class="del" type="button" aria-label="Delete">&#215;</button></li>';
  }).join("");
}

function render() {
  renderHead();
  renderGrid();
  renderPanel();
}

function selectDay(key) {
  const parts = key.split("-");
  const m = Number(parts[1]) - 1;
  if (m !== view.m || Number(parts[0]) !== view.y) {
    view = { y: Number(parts[0]), m: m };
  }
  selected = key;
  render();
}

document.getElementById("prev").addEventListener("click", function () {
  view = view.m === 0 ? { y: view.y - 1, m: 11 } : { y: view.y, m: view.m - 1 };
  render();
});

document.getElementById("next").addEventListener("click", function () {
  view = view.m === 11 ? { y: view.y + 1, m: 0 } : { y: view.y, m: view.m + 1 };
  render();
});

document.getElementById("today").addEventListener("click", function () {
  view = { y: today.getFullYear(), m: today.getMonth() };
  selected = keyOf(today);
  render();
});

gridEl.addEventListener("click", function (e) {
  const cell = e.target.closest(".day");
  if (cell) selectDay(cell.dataset.key);
});

addForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const text = inputEl.value.trim();
  if (!text) return;
  if (!store[selected]) store[selected] = [];
  store[selected].push({ text: text, done: false });
  inputEl.value = "";
  save();
  renderGrid();
  renderPanel();
  inputEl.focus();
});

tasksEl.addEventListener("change", function (e) {
  if (e.target.tagName !== "INPUT") return;
  const li = e.target.closest("li");
  const item = (store[selected] || [])[Number(li.dataset.i)];
  if (!item) return;
  item.done = e.target.checked;
  save();
  renderGrid();
  renderPanel();
});

tasksEl.addEventListener("click", function (e) {
  if (!e.target.classList.contains("del")) return;
  const li = e.target.closest("li");
  store[selected].splice(Number(li.dataset.i), 1);
  if (!store[selected].length) delete store[selected];
  save();
  renderGrid();
  renderPanel();
});

document.addEventListener("keydown", function (e) {
  if (e.target === inputEl) return;
  const step = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1
    : e.key === "ArrowUp" ? -7 : e.key === "ArrowDown" ? 7 : 0;
  if (!step) return;
  e.preventDefault();
  const parts = selected.split("-");
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]) + step);
  selectDay(keyOf(d));
});

render();
inputEl.focus();

const THEME_KEY = "plan-calendar.theme";
const themeBtn = document.getElementById("themeBtn");

function applyTheme(theme) {
  if (theme === "light") {
    document.documentElement.dataset.theme = "light";
    themeBtn.textContent = "\u263E Dark";
  } else {
    delete document.documentElement.dataset.theme;
    themeBtn.textContent = "\u2600 Light";
  }
}

themeBtn.addEventListener("click", function () {
  const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (e) {}
  applyTheme(next);
});

applyTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
