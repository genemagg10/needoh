import { sfx } from "./sfx.js";

const STORAGE_KEY = "squishymania.collection.v1";
const SECRET_KEY = "squishymania.secret.v1";
const RARE = new Set(["Rare", "Super Rare", "Legendary"]);
const RARE_ORDER = { Legendary: 0, "Super Rare": 1, Rare: 2, Uncommon: 3, Common: 4 };
const PER_SHELF = 4;

const state = {
  items: [],
  collection: loadCollection(),
  secret: localStorage.getItem(SECRET_KEY) === "yes",
  taps: 0,
  tapTimer: 0,
  query: "",
  category: "",
  have: false,
  want: false,
  rare: false,
  tab: "shelf",
};

const els = {
  grid: document.getElementById("grid"),
  rare: document.getElementById("rare"),
  counter: document.getElementById("counter"),
  showing: document.getElementById("showing"),
  empty: document.getElementById("empty"),
  search: document.getElementById("search"),
  category: document.getElementById("category"),
  logo: document.getElementById("logo"),
  confetti: document.getElementById("confetti"),
  shelf: document.getElementById("shelf"),
  shelfEmpty: document.getElementById("shelf-empty"),
  shelfCount: document.getElementById("shelf-count"),
  wishes: document.getElementById("wishes"),
  wishEmpty: document.getElementById("wish-empty"),
  wishCount: document.getElementById("wish-count"),
  secretPerch: document.getElementById("secret-perch"),
};

const ID_ALIASES = {
  "cool-kittens": "teenie-cool-cats-multipack",
  "teenie-dohnut-holes-6": "dohnut-holes",
  "rainboh": "rainbow-teenie",
};

function loadCollection() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const clean = {};
    for (const [id, status] of Object.entries(raw)) {
      if (status === "have" || status === "want") clean[id] = status;
    }
    let changed = false;
    for (const [oldId, newId] of Object.entries(ID_ALIASES)) {
      if (!(oldId in clean)) continue;
      const oldStatus = clean[oldId];
      const kept = clean[newId];
      if (!kept || (kept !== "have" && oldStatus === "have")) clean[newId] = oldStatus;
      delete clean[oldId];
      changed = true;
    }
    if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    return clean;
  } catch {
    return {};
  }
}

function saveCollection() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.collection));
}

function realItems() {
  return state.items.filter((item) => !item.fictional);
}

function owned() {
  return realItems()
    .filter((item) => state.collection[item.id] === "have")
    .sort((a, b) => a.name.localeCompare(b.name));
}

function wished() {
  return realItems()
    .filter((item) => state.collection[item.id] === "want")
    .sort((a, b) => a.name.localeCompare(b.name));
}

function rarityClass(rarity) {
  if (rarity === "Super Rare") return "super";
  return String(rarity || "").toLowerCase();
}

function field(value) {
  if (!value) return `<span class="missing">not listed yet</span>`;
  return escapeHtml(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function cardHtml(item) {
  const status = state.collection[item.id] || "";
  const alt = item.placeholder
    ? `${item.name}. Drawn placeholder, because a real photo was not found.`
    : `${item.name}, a NeeDoh squishy toy`;
  const draw = item.placeholder ? `<span class="badge draw">Drawing, not a photo</span>` : "";
  const shopPhoto = !item.placeholder && item.imageCredit === "other"
    ? `<p class="photo-credit">Photo from a collector/shop</p>` : "";
  const fictional = item.fictional ? `<span class="badge legendary">Just for Ella</span>` : "";
  const where = (item.where || []).map(escapeHtml).join(", ");
  const more = [
    item.rarityWhy ? `<p><strong>Why this rarity:</strong> ${escapeHtml(item.rarityWhy)}</p>` : "",
    item.imageNote ? `<p><strong>Photo:</strong> ${escapeHtml(item.imageNote)}</p>` : "",
    item.note ? `<p>${escapeHtml(item.note)}</p>` : "",
  ].join("");
  return `
    <article class="card ${status}" data-id="${escapeHtml(item.id)}">
      <button type="button" class="photo-btn" data-action="squish" aria-label="Squish ${escapeHtml(item.name)}">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(alt)}">
      </button>
      ${shopPhoto}
      <div class="card-top">
        <span class="badge ${rarityClass(item.rarity)}">${escapeHtml(item.rarity)}</span>
        <span class="badge cat">${escapeHtml(item.category)}</span>
        ${draw}${fictional}
      </div>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.description)}</p>
      <dl class="meta">
        <div><dt>Size</dt><dd>${field(item.size)}</dd></div>
        <div><dt>Texture</dt><dd>${field(item.texture)}</dd></div>
        <div><dt>Special</dt><dd>${field(item.feature)}</dd></div>
        <div><dt>Year</dt><dd>${field(item.year)}</dd></div>
        <div><dt>Colors</dt><dd>${field(item.colors)}</dd></div>
        <div><dt>Find it</dt><dd>${where || `<span class="missing">not listed yet</span>`}</dd></div>
      </dl>
      ${more ? `<details class="more"><summary>More about this one</summary>${more}</details>` : ""}
      <div class="actions">
        <button type="button" class="action have" data-action="have" aria-pressed="${status === "have"}">Have it</button>
        <button type="button" class="action want" data-action="want" aria-pressed="${status === "want"}">Want it</button>
      </div>
    </article>`;
}

function toyHtml(item) {
  const alt = item.placeholder
    ? `${item.name}. Drawn placeholder, because a real photo was not found.`
    : `${item.name}, a NeeDoh on the shelf`;
  return `
    <div class="toy-slot" data-id="${escapeHtml(item.id)}">
      <button type="button" class="toy" data-action="squish" aria-label="Squish ${escapeHtml(item.name)}">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(alt)}">
      </button>
    </div>`;
}

function captionHtml(item, mode) {
  const action = mode === "have" ? "have" : "want";
  const label = mode === "have" ? "Take off shelf" : "Remove wish";
  return `
    <div class="caption" data-id="${escapeHtml(item.id)}">
      <span class="toy-name">${escapeHtml(item.name)}</span>
      ${!item.placeholder && item.imageCredit === "other" ? `<span class="photo-credit">Photo from a collector/shop</span>` : ""}
      <button type="button" class="action ${action}" data-action="${action}" aria-pressed="true">${label}</button>
    </div>`;
}

function shelvesHtml(items, mode) {
  if (!items.length) return "";
  const chunks = [];
  for (let i = 0; i < items.length; i += PER_SHELF) chunks.push(items.slice(i, i + PER_SHELF));
  return chunks.map((chunk) => `
    <div class="plank">
      <div class="toys">${chunk.map((item) => toyHtml(item)).join("")}</div>
      <div class="board" aria-hidden="true"></div>
      <div class="captions">${chunk.map((item) => captionHtml(item, mode)).join("")}</div>
    </div>`).join("");
}

function renderShelves() {
  const mine = owned();
  const wants = wished();
  els.shelf.innerHTML = shelvesHtml(mine, "have");
  els.shelf.hidden = mine.length === 0;
  els.shelfEmpty.hidden = mine.length !== 0;
  els.shelfCount.textContent = mine.length
    ? `${mine.length} ${mine.length === 1 ? "squishy sits" : "squishies sit"} on your shelf.`
    : "Your shelf is empty. It is waiting for you.";
  els.wishes.innerHTML = shelvesHtml(wants, "want");
  els.wishes.hidden = wants.length === 0;
  els.wishEmpty.hidden = wants.length !== 0;
  els.wishCount.textContent = wants.length
    ? `${wants.length} ${wants.length === 1 ? "wish" : "wishes"} on the list.`
    : "No wishes yet.";
  const secret = state.items.find((item) => item.secret);
  if (state.secret && secret) {
    els.secretPerch.hidden = false;
    els.secretPerch.innerHTML = `
      <div class="secret-card" data-id="${escapeHtml(secret.id)}">
        <button type="button" class="toy" data-action="squish" aria-label="Squish Ella's secret star glob">
          <img src="${escapeHtml(secret.image)}" alt="Ella's secret star glob, a drawing just for her">
        </button>
        <div>
          <strong>Ella's Secret Star Glob</strong>
          <p>A drawing just for you. It is not a real NeeDoh, so it is not counted.</p>
        </div>
      </div>`;
  } else {
    els.secretPerch.hidden = true;
    els.secretPerch.innerHTML = "";
  }
}

function renderCatalogue() {
  const categories = [...new Set(realItems().map((item) => item.category))].sort();
  const current = els.category.value;
  els.category.innerHTML = `<option value="">All categories</option>` +
    categories.map((cat) => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join("");
  els.category.value = categories.includes(current) ? current : "";

  const rare = realItems()
    .filter((item) => RARE.has(item.rarity))
    .sort((a, b) => (RARE_ORDER[a.rarity] - RARE_ORDER[b.rarity]) || a.name.localeCompare(b.name));
  if (state.secret) {
    const secret = state.items.find((item) => item.secret);
    if (secret) rare.unshift(secret);
  }
  els.rare.innerHTML = rare.map((item) => cardHtml(item)).join("");
  els.grid.innerHTML = state.items
    .filter((item) => !item.secret || state.secret)
    .map((item) => cardHtml(item))
    .join("");
  applyFilterVisibility();
}

function matches(item) {
  if (item.secret && !state.secret) return false;
  if (item.fictional && !state.secret) return false;
  if (state.have && state.collection[item.id] !== "have") return false;
  if (state.want && state.collection[item.id] !== "want") return false;
  if (state.rare && !RARE.has(item.rarity)) return false;
  if (state.category && item.category !== state.category) return false;
  if (state.query) {
    const hay = [item.name, item.description, item.category, item.feature, item.texture, item.colors, item.rarity, ...(item.where || [])]
      .join(" ")
      .toLowerCase();
    if (!hay.includes(state.query)) return false;
  }
  return true;
}

function updateCounter() {
  const total = realItems().length;
  const have = owned().length;
  const want = wished().length;
  const wantText = want ? ` <span class="want-bit">You want ${want}.</span>` : "";
  els.counter.innerHTML = `You have ${have} of ${total}!${wantText}`;
}

function paintCard(card, status) {
  card.classList.toggle("have", status === "have");
  card.classList.toggle("want", status === "want");
  card.querySelectorAll("[data-action='have']").forEach((el) => {
    el.setAttribute("aria-pressed", String(status === "have"));
  });
  card.querySelectorAll("[data-action='want']").forEach((el) => {
    el.setAttribute("aria-pressed", String(status === "want"));
  });
}

function setStatus(id, next, button) {
  const prev = state.collection[id] || "";
  if (prev === next) delete state.collection[id];
  else state.collection[id] = next;
  saveCollection();
  const status = state.collection[id] || "";
  document.querySelectorAll(`#panel-all [data-id="${CSS.escape(id)}"]`).forEach((card) => paintCard(card, status));
  updateCounter();
  renderShelves();
  applyFilterVisibility();
  if (status === "have" && prev !== "have") {
    sfx.have();
    celebrate(button);
  } else if (status === "want" && prev !== "want") {
    sfx.want();
  } else if (prev === "have" && status !== "have") {
    sfx.pop();
  }
}

function applyFilterVisibility() {
  document.querySelectorAll("#panel-all .card").forEach((card) => {
    const item = state.items.find((entry) => entry.id === card.dataset.id);
    card.hidden = !(item && matches(item));
  });
  const gridShown = [...els.grid.querySelectorAll(".card")].filter((card) => !card.hidden && !state.items.find((item) => item.id === card.dataset.id)?.fictional).length;
  els.empty.hidden = gridShown !== 0;
  els.showing.textContent = `Showing ${gridShown} of ${realItems().length}`;
  const rareShown = [...els.rare.querySelectorAll(".card")].filter((card) => !card.hidden).length;
  let rareEmpty = document.getElementById("rare-empty");
  if (!rareEmpty) {
    rareEmpty = document.createElement("p");
    rareEmpty.id = "rare-empty";
    rareEmpty.className = "empty";
    rareEmpty.textContent = "None of the rare ones match this filter.";
    document.querySelector(".rare-shelf").appendChild(rareEmpty);
  }
  rareEmpty.hidden = rareShown !== 0;
}

function showTab(name, options = {}) {
  const changed = name !== state.tab;
  state.tab = name;
  const tabs = [
    ["shelf", "tab-shelf", "panel-shelf"],
    ["wish", "tab-wish", "panel-wish"],
    ["all", "tab-all", "panel-all"],
  ];
  tabs.forEach(([key, tabId, panelId]) => {
    const selected = key === name;
    const tab = document.getElementById(tabId);
    const panel = document.getElementById(panelId);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    panel.hidden = !selected;
  });
  if (changed && options.sound !== false) sfx.whoosh();
}

function squish(button) {
  const photo = button.classList.contains("photo-btn") || button.classList.contains("toy") || button.classList.contains("logo-btn")
    ? button
    : button.querySelector(".photo-btn, .toy");
  const target = photo || button;
  target.classList.remove("squish");
  void target.offsetWidth;
  target.classList.add("squish");
}

function celebrate(origin) {
  const canvas = els.confetti;
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  const from = origin ? origin.getBoundingClientRect() : { left: rect.width / 2, top: rect.height / 2, width: 0, height: 0 };
  const x = from.left + from.width / 2;
  const y = from.top + from.height / 2;
  const colors = ["#ffb3d9", "#e7d4ff", "#b8f3e6", "#ffd6b8", "#c7e7ff", "#fff6fb"];
  const bits = Array.from({ length: 70 }, () => ({
    x, y,
    vx: (Math.random() - 0.5) * 11,
    vy: Math.random() * -10 - 2,
    g: 0.28 + Math.random() * 0.08,
    s: 6 + Math.random() * 7,
    c: colors[Math.floor(Math.random() * colors.length)],
    r: Math.random() * Math.PI,
    spin: (Math.random() - 0.5) * 0.3,
  }));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    toast("You have it! Nice squish.");
    return;
  }
  let frame = 0;
  function tick() {
    ctx.clearRect(0, 0, rect.width, rect.height);
    bits.forEach((bit) => {
      bit.vy += bit.g;
      bit.x += bit.vx;
      bit.y += bit.vy;
      bit.r += bit.spin;
      ctx.save();
      ctx.translate(bit.x, bit.y);
      ctx.rotate(bit.r);
      ctx.fillStyle = bit.c;
      ctx.fillRect(-bit.s / 2, -bit.s / 4, bit.s, bit.s / 2);
      ctx.restore();
    });
    frame += 1;
    if (frame < 70) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, rect.width, rect.height);
  }
  tick();
  toast("You have it!");
}

let toastTimer = 0;
function toast(message) {
  let node = document.getElementById("toast");
  if (!node) {
    node = document.createElement("p");
    node.id = "toast";
    node.className = "toast";
    node.setAttribute("role", "status");
    document.body.appendChild(node);
  }
  node.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.remove(), 1600);
}

function unlockSecret() {
  state.secret = true;
  localStorage.setItem(SECRET_KEY, "yes");
  renderCatalogue();
  renderShelves();
  showTab("shelf", { sound: false });
  sfx.secret();
  toast("You found Ella's secret squish!");
  celebrate(els.logo);
  els.secretPerch.scrollIntoView({ behavior: "smooth", block: "center" });
}

document.body.addEventListener("click", (event) => {
  const goto = event.target.closest("[data-goto]");
  if (goto) {
    showTab(goto.dataset.goto);
    document.getElementById("tab-all").focus();
    return;
  }
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const card = button.closest("[data-id]");
  if (!card) return;
  if (button.dataset.action === "squish") {
    squish(button);
    sfx.squish();
    return;
  }
  if (button.dataset.action === "have" || button.dataset.action === "want") {
    setStatus(card.dataset.id, button.dataset.action, button);
  }
});

document.querySelectorAll("[role='tab']").forEach((tab, index, tabs) => {
  tab.addEventListener("click", () => {
    showTab(tab.id.replace("tab-", ""));
  });
  tab.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const shift = event.key === "ArrowRight" ? 1 : -1;
    const next = tabs[(index + shift + tabs.length) % tabs.length];
    next.focus();
    showTab(next.id.replace("tab-", ""));
  });
});

els.search.addEventListener("input", () => {
  state.query = els.search.value.trim().toLowerCase();
  applyFilterVisibility();
});
els.category.addEventListener("change", () => {
  state.category = els.category.value;
  applyFilterVisibility();
});
document.getElementById("filter-have").addEventListener("click", (event) => {
  state.have = !state.have;
  if (state.have) state.want = false;
  event.currentTarget.setAttribute("aria-pressed", String(state.have));
  document.getElementById("filter-want").setAttribute("aria-pressed", String(state.want));
  applyFilterVisibility();
});
document.getElementById("filter-want").addEventListener("click", (event) => {
  state.want = !state.want;
  if (state.want) state.have = false;
  event.currentTarget.setAttribute("aria-pressed", String(state.want));
  document.getElementById("filter-have").setAttribute("aria-pressed", String(state.have));
  applyFilterVisibility();
});
document.getElementById("filter-rare").addEventListener("click", (event) => {
  state.rare = !state.rare;
  event.currentTarget.setAttribute("aria-pressed", String(state.rare));
  applyFilterVisibility();
});
document.getElementById("controls").addEventListener("submit", (event) => event.preventDefault());

els.logo.addEventListener("click", () => {
  squish(els.logo);
  state.taps += 1;
  clearTimeout(state.tapTimer);
  state.tapTimer = setTimeout(() => { state.taps = 0; }, 4000);
  if (state.taps >= 5) {
    state.taps = 0;
    unlockSecret();
  } else {
    sfx.squish();
  }
});

const soundButton = document.getElementById("sound-toggle");
function paintSoundButton() {
  const on = sfx.isOn();
  soundButton.setAttribute("aria-pressed", String(on));
  soundButton.setAttribute("aria-label", on ? "Sound is on" : "Sound is off");
  soundButton.querySelector(".sound-label").textContent = on ? "Sound on" : "Sound off";
  soundButton.classList.toggle("is-off", !on);
}
paintSoundButton();
soundButton.addEventListener("click", () => {
  const next = !sfx.isOn();
  sfx.setOn(next);
  paintSoundButton();
  if (next) sfx.squish();
});

document.getElementById("blob-btn").addEventListener("click", () => {
  const blob = document.querySelector("#blob-btn .blob");
  blob.classList.remove("squish");
  void blob.offsetWidth;
  blob.classList.add("squish");
  blob.addEventListener("animationend", () => blob.classList.remove("squish"), { once: true });
  sfx.giggle();
});

fetch("data/catalogue.json")
  .then((response) => {
    if (!response.ok) throw new Error("catalogue");
    return response.json();
  })
  .then((data) => {
    state.items = data.items;
    renderCatalogue();
    renderShelves();
    updateCounter();
    showTab("shelf");
  })
  .catch(() => {
    els.shelfEmpty.hidden = false;
    els.shelfEmpty.querySelector(".invite").innerHTML = "<p>The catalogue file did not load.</p>";
  });
