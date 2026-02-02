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

/* ---------- CONFIG ---------- */
const minGap = 5000;
const sliderMinValue = minVal ? parseInt(minVal.min, 10) : 0;
const sliderMaxValue = maxVal ? parseInt(maxVal.max, 10) : 100000;

// const MARKETCHECK_API_KEY = "yUohXNeX1BI8FmO3amUzSvAGUWMH86xX";
const DEFAULT_ROWS = 1;

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
  getCars("");
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
    console.log("autocomplete raw repsonse:", data);

    const isValidMake = Array.isArray(data.terms) && data.terms.length > 0;
    makeCache.set(word, isValidMake);
    return isValidMake;
  } catch (err) {
    console.error(err);
    makeCache.set(word, false);
    return false;
  } 
}

async function getCars(searchTerm = "") {
  if (!listingsContainer) return;

  const params = new URLSearchParams({
    api_key: MARKETCHECK_API_KEY,
    rows: String(DEFAULT_ROWS),
  });

  const q = (searchTerm || "").trim().toLowerCase();
  const parts = q.split(/\s+/);
  const year = parts.find((part) => /^\d{4}$/.test(part));
  const rest = parts.filter((part) => part !== year);
  const firstToken = rest[0];
  const isMakeResult = firstToken ? await isMake(firstToken) : false;

  

  if (year) {
    params.set("year", year);
  }

  if (rest.length > 0) {
    if (isMakeResult) {
      params.set("make", firstToken);
  
      if (rest.length > 1) {
        params.set("model", rest.slice(1).join(" "));
      }
    } else {
    params.set("model", rest[0]);
  }
}
  console.log({ year, rest, isMakeResult });
  

  // SETTING SLIDER PRICING IN API //
  if (minVal && maxVal) {
    const minPrice = minVal.value;
    const maxPrice = maxVal.value;

    params.set("price_range", `${minPrice}-${maxPrice}`);
  }

  const url = `https://api.marketcheck.com/v2/search/car/active?${params.toString()}`;

  console.log(url)
  try {
    listingsContainer.innerHTML = "<p>Loading...</p>";
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = await res.json();
    renderCars(data.listings || []);
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

// Your HTML currently uses oninput="slideMin()" / slideMax() and onchange="setMinInput()" etc.
// You can keep those for now while you learn, or convert them to addEventListener later.
