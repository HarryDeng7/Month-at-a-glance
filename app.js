const STORE_KEY = "plan-calendar.v1";
const THEME_KEY = "plan-calendar.theme";
const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PREVIEWS = 2;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

const gridEl = document.getElementById("grid");
const dowEl = document.getElementById("dow");
const titleEl = document.getElementById("title");
const panelTitleEl = document.getElementById("panelTitle");
const tasksEl = document.getElementById("tasks");
const addForm = document.getElementById("addForm");
const inputEl = document.getElementById("taskInput");
const themeBtn = document.getElementById("themeBtn");
const shareBtn = document.getElementById("shareBtn");
const cancelShareBtn = document.getElementById("cancelShareBtn");
const shareHintEl = document.getElementById("shareHint");
const shareDialog = document.getElementById("shareDialog");
const shareUrlEl = document.getElementById("shareUrl");
const dialogTextEl = document.getElementById("dialogText");
const copyBtn = document.getElementById("copyBtn");
const closeDialogBtn = document.getElementById("closeDialogBtn");
const contentEl = document.querySelector(".content");
const sharedViewEl = document.getElementById("sharedView");
const sharedSubEl = document.getElementById("sharedSub");
const sharedDaysEl = document.getElementById("sharedDays");
const backBtn = document.getElementById("backBtn");
const openBtn = document.getElementById("openBtn");
const openDialog = document.getElementById("openDialog");
const openForm = document.getElementById("openForm");
const openInput = document.getElementById("openUrlInput");
const openErrorEl = document.getElementById("openError");
const closeOpenBtn = document.getElementById("closeOpenBtn");

const today = new Date();
let view = { y: today.getFullYear(), m: today.getMonth() };
let selected = keyOf(today);
let store = load();
let shareMode = false;
const picked = new Set();

function keyOf(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function load() {
  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem(STORE_KEY));
  } catch (e) {
    raw = null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  Object.keys(raw).forEach(function (key) {
    const list = Array.isArray(raw[key]) ? raw[key] : [];
    raw[key] = list.filter(function (t) { return t && typeof t.text === "string"; });
    raw[key].forEach(function (t) { if (!t.id) t.id = newId(); });
    if (!raw[key].length) delete raw[key];
  });
  return raw;
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch (e) {}
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}

function formatDay(key) {
  const p = key.split("-");
  const d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  return DOW[d.getDay()] + ", " + MONTHS[d.getMonth()].slice(0, 3) + " " + d.getDate();
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

function renderPanel() {
  panelTitleEl.textContent = formatDay(selected);

  const list = store[selected] || [];
  if (!list.length) {
    tasksEl.innerHTML = '<li class="empty">Nothing planned.</li>';
    return;
  }

  tasksEl.innerHTML = list.map(function (t, i) {
    const isPicked = picked.has(selected + ":" + t.id);
    return '<li class="' + (t.done ? "done" : "") + (isPicked ? " picked" : "") + '" data-i="' + i + '">' +
      (shareMode
        ? '<button class="pick" type="button" aria-pressed="' + isPicked + '" aria-label="Select for sharing">' + (isPicked ? "\u2713" : "") + "</button>"
        : "") +
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

function setShareMode(on) {
  shareMode = on;
  if (!on) picked.clear();
  shareBtn.textContent = on ? "Create link" : "Share";
  cancelShareBtn.hidden = !on;
  shareHintEl.hidden = !on;
  shareHintEl.classList.remove("warn");
  shareHintEl.textContent = "Tap the box in front of each task you want to share, then press Create link.";
  renderPanel();
}

function buildPayload() {
  const out = {};
  Object.keys(store).forEach(function (key) {
    const list = store[key].filter(function (t) { return picked.has(key + ":" + t.id); });
    if (list.length) {
      out[key] = list.map(function (t) { return { t: t.text, d: !!t.done }; });
    }
  });
  return out;
}

function encodeShare(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeShare(str) {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return JSON.parse(new TextDecoder().decode(bytes));
}

function renderShared(payload) {
  const days = Object.keys(payload).sort();
  let count = 0;
  sharedDaysEl.innerHTML = days.map(function (key) {
    const list = payload[key];
    count += list.length;
    return '<div class="shared-day"><h3>' + escapeHtml(formatDay(key)) + "</h3><ul>" +
      list.map(function (t) {
        return '<li class="' + (t.d ? "done" : "") + '">' + escapeHtml(t.t) + "</li>";
      }).join("") + "</ul></div>";
  }).join("");
  sharedSubEl.textContent = count + " task" + (count === 1 ? "" : "s") + " shared with you";
}

function parsePayload(token) {
  let payload = null;
  try {
    payload = decodeShare(token);
  } catch (e) {
    return null;
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;

  const clean = {};
  Object.keys(payload).forEach(function (key) {
    if (!DATE_KEY.test(key) || !Array.isArray(payload[key])) return;
    const list = payload[key].filter(function (t) { return t && typeof t.t === "string"; });
    if (list.length) clean[key] = list;
  });
  return Object.keys(clean).length ? clean : null;
}

function extractToken(text) {
  const s = String(text).trim();
  if (!s) return null;
  const withParam = s.match(/[#&?]s=([A-Za-z0-9_-]+)/);
  if (withParam) return withParam[1];
  return /^[A-Za-z0-9_-]+$/.test(s) ? s : null;
}

function startShared(token) {
  const payload = parsePayload(token);
  if (!payload) return false;

  contentEl.hidden = true;
  shareBtn.hidden = true;
  cancelShareBtn.hidden = true;
  openBtn.hidden = true;
  sharedViewEl.hidden = false;
  document.title = "Shared plan - Month at a Glance";
  renderShared(payload);
  return true;
}

function showEditor() {
  try {
    history.replaceState(null, "", location.pathname + location.search);
  } catch (e) {
    location.hash = "";
  }
  contentEl.hidden = false;
  sharedViewEl.hidden = true;
  shareBtn.hidden = false;
  openBtn.hidden = false;
  document.title = "Month at a Glance";
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
  store[selected].push({ id: newId(), text: text, done: false });
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
  const li = e.target.closest("li");
  if (!li || li.classList.contains("empty")) return;
  const item = (store[selected] || [])[Number(li.dataset.i)];
  if (!item) return;

  if (e.target.closest(".pick")) {
    const key = selected + ":" + item.id;
    if (picked.has(key)) picked.delete(key);
    else picked.add(key);
    renderPanel();
    return;
  }

  if (e.target.classList.contains("del")) {
    store[selected].splice(Number(li.dataset.i), 1);
    if (!store[selected].length) delete store[selected];
    save();
    renderGrid();
    renderPanel();
  }
});

shareBtn.addEventListener("click", function () {
  if (!shareMode) {
    setShareMode(true);
    return;
  }

  const payload = buildPayload();
  const days = Object.keys(payload);
  if (!days.length) {
    shareHintEl.textContent = "Select at least one task first.";
    shareHintEl.classList.add("warn");
    return;
  }

  const count = days.reduce(function (n, k) { return n + payload[k].length; }, 0);
  dialogTextEl.textContent = count + " task" + (count === 1 ? "" : "s") + " on " + days.length +
    " day" + (days.length === 1 ? "" : "s") + ". Anyone who opens this link sees only these.";

  shareUrlEl.value = location.href.split("#")[0] + "#s=" + encodeShare(payload);
  setShareMode(false);
  shareDialog.hidden = false;
  shareUrlEl.focus();
  shareUrlEl.select();
});

cancelShareBtn.addEventListener("click", function () {
  setShareMode(false);
});

closeDialogBtn.addEventListener("click", function () {
  shareDialog.hidden = true;
});

copyBtn.addEventListener("click", function () {
  const done = function () {
    copyBtn.textContent = "Copied!";
    setTimeout(function () { copyBtn.textContent = "Copy link"; }, 1400);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(shareUrlEl.value).then(done, function () {
      shareUrlEl.select();
    });
  } else {
    shareUrlEl.select();
    try { document.execCommand("copy"); done(); } catch (e) {}
  }
});

openBtn.addEventListener("click", function () {
  setShareMode(false);
  openErrorEl.hidden = true;
  openInput.value = "";
  openDialog.hidden = false;
  openInput.focus();
});

closeOpenBtn.addEventListener("click", function () {
  openDialog.hidden = true;
});

openForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const token = extractToken(openInput.value);
  if (!token || !parsePayload(token)) {
    openErrorEl.textContent = "That does not look like a share link.";
    openErrorEl.hidden = false;
    return;
  }
  openDialog.hidden = true;
  openInput.value = "";
  openErrorEl.hidden = true;
  if (location.hash === "#s=" + token) startShared(token);
  else location.hash = "#s=" + token;
});

backBtn.addEventListener("click", showEditor);

document.addEventListener("keydown", function (e) {
  if (e.target === inputEl) return;

  if (e.key === "Escape") {
    if (!shareDialog.hidden) shareDialog.hidden = true;
    else if (!openDialog.hidden) openDialog.hidden = true;
    else if (shareMode) setShareMode(false);
    return;
  }

  const step = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1
    : e.key === "ArrowUp" ? -7 : e.key === "ArrowDown" ? 7 : 0;
  if (!step) return;
  e.preventDefault();
  const parts = selected.split("-");
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]) + step);
  selectDay(keyOf(d));
});

const shareHash = location.hash.match(/^#s=(.+)$/);
if (!(shareHash && startShared(shareHash[1]))) {
  render();
  inputEl.focus();
}

window.addEventListener("hashchange", function () {
  const m = location.hash.match(/^#s=(.+)$/);
  if (m) startShared(m[1]);
});

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
