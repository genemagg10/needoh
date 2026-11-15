const STORAGE_KEY = "squishymania.collection.v1";
const SECRET_KEY = "squishymania.secret.v1";
const RARE = new Set(["Rare", "Super Rare", "Legendary"]);
const RARE_ORDER = { Legendary: 0, "Super Rare": 1, Rare: 2, Uncommon: 3, Common: 4 };

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
};

function loadCollection() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
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

function rarityClass(rarity) {
  if (rarity === "Super Rare") return "super";
  return rarity.toLowerCase();
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

function cardHtml(item, compact) {
  const status = state.collection[item.id] || "";
  const alt = item.placeholder
    ? `${item.name}. Drawn placeholder, because a real photo was not found.`
    : `${item.name}, a NeeDoh squishy toy`;
  const draw = item.placeholder ? `<span class="badge draw">Drawing, not a photo</span>` : "";
  const fictional = item.fictional ? `<span class="badge legendary">Just for Ella</span>` : "";
  const where = item.where.map(escapeHtml).join(", ");
  const more = [
    item.rarityWhy ? `<p><strong>Why this rarity:</strong> ${escapeHtml(item.rarityWhy)}</p>` : "",
    item.note ? `<p>${escapeHtml(item.note)}</p>` : "",
  ].join("");
  return `
    <article class="card ${status}" data-id="${escapeHtml(item.id)}" ${compact ? 'data-shelf="yes"' : ""}>
      <button type="button" class="photo-btn" data-action="squish" aria-label="Squish ${escapeHtml(item.name)}">
        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(alt)}" width="640" height="640">
      </button>
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

function render() {
  const categories = [...new Set(realItems().map((item) => item.category))].sort();
  const current = els.category.value;
  els.category.innerHTML = `<option value="">All categories</option>` +
    categories.map((cat) => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join("");
  els.category.value = categories.includes(current) ? current : "";

  const visible = state.items.filter(matches);
  const rare = realItems()
    .filter((item) => RARE.has(item.rarity))
    .sort((a, b) => (RARE_ORDER[a.rarity] - RARE_ORDER[b.rarity]) || a.name.localeCompare(b.name));
  if (state.secret) {
    const secret = state.items.find((item) => item.secret);
    if (secret) rare.unshift(secret);
  }
  els.rare.innerHTML = rare.filter(matches).map((item) => cardHtml(item, true)).join("") ||
    `<p class="empty">None of the rare ones match this filter.</p>`;
  els.grid.innerHTML = visible.filter((item) => !item.secret || state.secret).map((item) => cardHtml(item)).join("");
  updateCounter();
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
  const have = realItems().filter((item) => state.collection[item.id] === "have").length;
  const want = realItems().filter((item) => state.collection[item.id] === "want").length;
  const wantText = want ? ` <span class="want-bit">You want ${want}.</span>` : "";
  els.counter.innerHTML = `You have ${have} of ${total}!${wantText}`;
}

function setStatus(id, next, button) {
  const prev = state.collection[id] || "";
  if (prev === next) delete state.collection[id];
  else state.collection[id] = next;
  saveCollection();
  document.querySelectorAll(`[data-id="${CSS.escape(id)}"]`).forEach((card) => {
    const status = state.collection[id] || "";
    card.classList.toggle("have", status === "have");
    card.classList.toggle("want", status === "want");
    card.querySelectorAll("[data-action='have']").forEach((el) => el.setAttribute("aria-pressed", String(status === "have")));
    card.querySelectorAll("[data-action='want']").forEach((el) => el.setAttribute("aria-pressed", String(status === "want")));
  });
  updateCounter();
  applyFilterVisibility();
  if (next === "have" && prev !== "have" && state.collection[id] === "have") {
    celebrate(button);
  }
}

function applyFilterVisibility() {
  const cards = document.querySelectorAll(".card");
  cards.forEach((card) => {
    const item = state.items.find((entry) => entry.id === card.dataset.id);
    const ok = item && matches(item);
    card.hidden = !ok;
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

function squish(button) {
  const photo = button.classList.contains("photo-btn") ? button : button.querySelector(".photo-btn");
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
  const colors = ["#ff4f9a", "#7c4dff", "#12b5a0", "#ffb703", "#7ef0ff", "#fff"];
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
  render();
  toast("You found Ella's secret squish!");
  celebrate(els.logo);
  const secret = document.querySelector('#rare [data-id="ellas-secret-glob"]');
  if (secret) secret.scrollIntoView({ behavior: "smooth", block: "center" });
}

document.body.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const card = button.closest("[data-id]");
  if (!card) return;
  if (button.dataset.action === "squish") {
    squish(button);
    return;
  }
  if (button.dataset.action === "have" || button.dataset.action === "want") {
    setStatus(card.dataset.id, button.dataset.action, button);
  }
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
  }
});

fetch("data/catalogue.json")
  .then((response) => {
    if (!response.ok) throw new Error("catalogue");
    return response.json();
  })
  .then((data) => {
    state.items = data.items;
    render();
  })
  .catch(() => {
    els.grid.innerHTML = `<p class="empty">The catalogue file did not load. If you opened this page as a file, use a simple web server instead.</p>`;
  });
