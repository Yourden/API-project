/* ---------- DOM SELECTORS ---------- */
const minVal = document.querySelector(".min__val");
const maxVal = document.querySelector(".max__val");
const priceInputMin = document.querySelector(".min__input");
const priceInputMax = document.querySelector(".max__input");
const minTooltip = document.querySelector(".min__tooltip");
const maxTooltip = document.querySelector(".max__tooltip");
const range = document.querySelector(".slider__track");

const searchInput = document.getElementById("searchInput");
const listingsContainer = document.getElementById("listings__container");
const landingSearchInput = document.querySelector("#landing-page .input__find");
/* ---------- CONFIG ---------- */
const minGap = 5000;
const sliderMinValue = minVal ? parseInt(minVal.min, 10) : 0;
const sliderMaxValue = maxVal ? parseInt(maxVal.max, 10) : 100000;

const MARKETCHECK_API_KEY = "yUohXNeX1BI8FmO3amUzSvAGUWMH86xX";
const DEFAULT_ROWS = 10;

function debounce(fn, delay) {
  let timeoutId;

  return function (...args) {
    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

const debouncedGetCars = debounce((value) => {
  getCars(value);
}, 750);

/* ---------- INIT ---------- */
window.addEventListener("load", () => {
  slideMin();
  slideMax();

  const urlParams = new URLSearchParams(window.location.search);
  const initialSearch = urlParams.get("search");

  if (initialSearch && searchInput) {
    searchInput.value = initialSearch;
    getCars(initialSearch);
  } else {
    getCars("");
  }
});

/* ---------- SLIDER UI ---------- */
function slideMin() {
  if (!minVal || !maxVal) return;

  let gap = parseInt(maxVal.value, 10) - parseInt(minVal.value, 10);
  if (gap <= minGap) minVal.value = parseInt(maxVal.value, 10) - minGap;

  if (minTooltip)
    minTooltip.innerHTML = "$" + Number(minVal.value).toLocaleString();
  if (priceInputMin) priceInputMin.value = minVal.value;

  setArea();
  debouncedGetCars(searchInput ? searchInput.value : "");
}

function slideMax() {
  if (!minVal || !maxVal) return;

  let gap = parseInt(maxVal.value, 10) - parseInt(minVal.value, 10);
  if (gap <= minGap) maxVal.value = parseInt(minVal.value, 10) + minGap;

  if (maxTooltip)
    maxTooltip.innerHTML = "$" + Number(maxVal.value).toLocaleString();
  if (priceInputMax) priceInputMax.value = maxVal.value;

  setArea();
  debouncedGetCars(searchInput ? searchInput.value : "");
}

function setArea() {
  if (!range || !minVal || !maxVal) return;

  const minPct = (minVal.value / sliderMaxValue) * 100;
  const maxPct = (maxVal.value / sliderMaxValue) * 100;

  range.style.left = minPct + "%";
  range.style.right = 100 - maxPct + "%";

  if (minTooltip) minTooltip.style.left = minPct + "%";
  if (maxTooltip) maxTooltip.style.right = 100 - maxPct + "%";
}

function setMinInput() {
  if (!minVal || !priceInputMin) return;

  let minPrice = parseInt(priceInputMin.value, 10);
  if (Number.isNaN(minPrice) || minPrice < sliderMinValue)
    priceInputMin.value = sliderMinValue;

  minVal.value = priceInputMin.value;
  slideMin();
}

function setMaxInput() {
  if (!maxVal || !priceInputMax) return;

  let maxPrice = parseInt(priceInputMax.value, 10);
  if (Number.isNaN(maxPrice) || maxPrice > sliderMaxValue)
    priceInputMax.value = sliderMaxValue;

  maxVal.value = priceInputMax.value;
  slideMax();
}

/* ---------- API ---------- */

const trimCache = new Map();

async function isTrim(trimQuery, make, model) {
  const key = `${trimQuery}|${make}|${model}`.toLowerCase();
  if (trimCache.has(key)) return trimCache.get(key);

  const params = new URLSearchParams({
    api_key: MARKETCHECK_API_KEY,
    field: "trim",
    input: trimQuery,
    term_counts: "false",
  });

  if (make) params.set("make", make);
  if (model) params.set("model", model);

  const url = `https://api.marketcheck.com/v2/search/car/auto-complete?${params.toString()}`;
console.log("Trim autocomplete URL:", url);
  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();

  const terms = Array.isArray(data) ? data : (data.terms || []);
  const best = terms[0] || null;

  trimCache.set(key, best);
  return best;
}

const makeCache = new Map();

async function isMake(word) {
  word = word.toLowerCase();
  if (makeCache.has(word)) {
    return makeCache.get(word);
  }

  const params = new URLSearchParams({
    api_key: MARKETCHECK_API_KEY,
    input: word,
    field: "make",
  });

  const url = `https://api.marketcheck.com/v2/specs/car/auto-complete?${params.toString()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = await res.json();
    console.log("autocomplete raw repsonse:", data, word);

    const isValidMake = Array.isArray(data.terms) && data.terms.length > 0;
    makeCache.set(word, isValidMake);
    return isValidMake;
  } catch (err) {
    console.error(err);
    makeCache.set(word, false);
    return false;
  } 
}

const modelTermCache = new Map();

async function resolveModelTerm(input, make) {
  const key = `${input}|${make || ""}`.toLowerCase();
  if (modelTermCache.has(key)) return modelTermCache.get(key);

  const params = new URLSearchParams({
    api_key: MARKETCHECK_API_KEY,
    field: "model",
    input,
    term_counts: "false",
  });

  if (make) params.set("make", make);

  const url = `https://api.marketcheck.com/v2/search/car/auto-complete?${params.toString()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = await res.json();
    const terms = data.terms || [];

    const want = normToken(input);

    const best =
      terms.find((t) => normToken(t) === want) ||
      terms[0] ||
      null;

    modelTermCache.set(key, best);
    return best;
  } catch (err) {
    console.error(err);
    modelTermCache.set(key, null);
    return null;
  }
}

function normToken(s) {
  return (s || "").toLowerCase().replace(/[-\s]/g, "");
}

async function getCars(searchTerm = "") {
  if (!listingsContainer) return;

  const params = new URLSearchParams({
    api_key: MARKETCHECK_API_KEY,
    rows: String(DEFAULT_ROWS),
  });

  const q = (searchTerm || "").trim().toLowerCase();
  const parts = q.split(/\s+/).filter(Boolean);

  const year = parts.find((part) => /^\d{4}$/.test(part));
  const rest = parts.filter((part) => part !== year);

  const COLORS = [
    "black","white","gray","grey","silver","blue","red","green","yellow","orange",
    "brown","beige","tan","gold","purple","pink","maroon","navy","teal","lime",
    "cyan","magenta","violet","indigo","turquoise","peach","coral",
  ];

  // 1) detect make anywhere
  let detectedMake = null;
  for (const token of rest) {
    if (await isMake(token)) {
      detectedMake = token;
      break;
    }
  }

  // 2) detect colors
  const colorsFound = rest.filter((w) => COLORS.includes(w));

  // remove make + colors from remaining tokens
  const remainingTokens = rest.filter(
    (w) => w !== detectedMake && !COLORS.includes(w)
  );

  // 3) model/trim split (works even with no make)
  let modelTokens = [];
  let trimTokens = [];

  if (remainingTokens.length) {
    const first = remainingTokens[0];

    const modelTerm = await resolveModelTerm(first, detectedMake || undefined);

    if (modelTerm && normToken(modelTerm) === normToken(first)) {
      modelTokens = [modelTerm.toLowerCase()];
      trimTokens = remainingTokens.slice(1);
    } else {
      modelTokens = [];
      trimTokens = remainingTokens;
    }
  }

  // 4) trim resolution (allowed with make-only / no model)
  const trimQuery = trimTokens.join(" ");
  let detectedTrim = null;

  if (trimQuery) {
    detectedTrim = await isTrim(trimQuery, detectedMake, modelTokens[0] || "");
  }

  // 5) set params
  if (year) params.set("year", year);
  if (detectedMake) params.set("make", detectedMake);
  if (modelTokens.length) params.set("model", modelTokens.join(" "));
  if (detectedTrim) params.set("trim", detectedTrim);
  if (colorsFound.length) params.set("base_ext_color", colorsFound[0]);

  if (minVal && maxVal) {
    params.set("price_range", `${minVal.value}-${maxVal.value}`);
  }

  const url = `https://api.marketcheck.com/v2/search/car/active?${params.toString()}`;
  console.log("REQUEST:", url, { year, detectedMake, modelTokens, trimTokens, trimQuery, detectedTrim });

  try {
    listingsContainer.innerHTML = "<p>Loading...</p>";
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = await res.json();
    const listings = data.listings || [];

    // keep your existing trim token filter as a backup (optional)
    const filtered = trimTokens.length
      ? listings.filter((car) => {
          const text = [
            car.build?.model,
            car.build?.trim,
            car.heading,
          ].filter(Boolean).join(" ").toLowerCase();

          return trimTokens.every((t) => text.includes(t));
        })
      : listings;

    console.log("API listings count:", listings.length);
    console.log("After trim filter:", filtered.length);

    renderCars(filtered);
  } catch (err) {
    console.error(err);
    listingsContainer.innerHTML = "<p>Failed to load listings.</p>";
  }
}

/* ---------- RENDER ---------- */
function renderCars(cars) {
  if (!listingsContainer) return;

  listingsContainer.innerHTML = "";

  if (!cars || cars.length === 0) {
    listingsContainer.innerHTML = "<p>No results found</p>";
    return;
  }

  cars.forEach((car) => {
    const div = document.createElement("div");
    div.className = "car__listing";

    const photo = car.media?.photo_links?.[0] || "";
    const year = car.build?.year || "";
    const make = car.build?.make || "";
    const model = car.build?.model || "";
    const price =
      car.price != null
        ? `$${Number(car.price).toLocaleString()}`
        : "Price N/A";
    const miles =
      car.miles != null
        ? `${Number(car.miles).toLocaleString()} miles`
        : "Miles N/A";

    div.innerHTML = `
      <img src="${photo}" alt="${year} ${make} ${model}" width="200" />
      <h3>${year} ${make} ${model}</h3>
      <p>${price}</p>
      <p>${miles}</p>
    `;

    listingsContainer.appendChild(div);
  });
}

/* ---------- EVENTS (basic) ---------- */
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    debouncedGetCars(e.target.value);
  });
}

if (landingSearchInput) {
  landingSearchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      window.location.href =
        `findyourcar.html?search=${encodeURIComponent(landingSearchInput.value)}`;
    }
  });
}