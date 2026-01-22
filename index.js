window.onload = function() {
  slideMin();
  slideMax();
  getCars();
}

const minVal = document.querySelector(".min__val");
const maxVal = document.querySelector(".max__val");
const priceInputMin = document.querySelector(".min__input");
const priceInputMax = document.querySelector(".max__input");
const minTooltip = document.querySelector(".min__tooltip");
const maxTooltip = document.querySelector(".max__tooltip");
const minGap = 5000;
const range = document.querySelector(".slider__track");
const sliderMinValue = parseInt(minVal.min);
const sliderMaxValue = parseInt(maxVal.max);

function slideMin() {
    let gap = parseInt(maxVal.value) - parseInt(minVal.value);
    if (gap <= minGap) {
        minVal.value = parseInt(maxVal.value) - minGap;
    }
    minTooltip.innerHTML = "$" + minVal.value;
    priceInputMin.value = minVal.value;
    setArea();
}

function slideMax() {
    let gap = parseInt(maxVal.value) - parseInt(minVal.value);
    if (gap <= minGap) {
        maxVal.value = parseInt(minVal.value) + minGap;
    }
    maxTooltip.innerHTML = "$" + maxVal.value;
    priceInputMax.value =  maxVal.value;
    setArea();
}

function setArea() {
    range.style.left = (minVal.value / sliderMaxValue) * 100 + "%";
    minTooltip.style.left = (minVal.value / sliderMaxValue) * 100 + "%";
    range.style.right = 100 - (maxVal.value / sliderMaxValue) * 100 + "%";
    maxTooltip.style.right = 100 - (maxVal.value / sliderMaxValue) * 100 + "%";
    if (maxVal.value - minVal.value < 12500) {
        maxTooltip.style.transform = "translateX(85%) translateY(-100%)";
        minTooltip.style.transform = "translateX(-85%) translateY(-100%)";
    } 
    else {
        maxTooltip.style.transform = "translateX(50%) translateY(-100%)";
        minTooltip.style.transform = "translateX(-50%) translateY(-100%)";
    }
}

function setMinInput() {
    let minPrice = parseInt(priceInputMin.value);
    if (minPrice < sliderMinValue) {
        priceInputMin.value = sliderMinValue;
    }
    minVal.value = priceInputMin.value;
    slideMin();
}

function setMaxInput() {
    let maxPrice = parseInt(priceInputMax.value);
    if (maxPrice > sliderMaxValue) {
        priceInputMax.value = sliderMaxValue;
    }
    maxVal.value = priceInputMax.value;
    slideMax();
}

// 

// LISTINGS

// 

async function getCars(searchTerm = "") {
  const params = new URLSearchParams({
    api_key: "yUohXNeX1BI8FmO3amUzSvAGUWMH86xX",
    state: "FL",
    rows: 10
  });

  const value = searchTerm.trim();

  if (/^\d{4}$/.test(value)) {
    params.append("year", value);
  } 

  else {
    params.append("keyword" || "state:" || "city:", value);
  }

  const url = `https://api.marketcheck.com/v2/search/car/active?${params.toString()}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    renderCars(data.listings || []);
  } catch (error) {
    console.error(error);
  }
}


function renderCars(cars) {
    const container = document.getElementById("car__listings")
    container.innerHTML = ""

if (cars.length === 0) {
    container.innerHTML = "<p>No results found</p>"
    return
}

cars.forEach(car => {
    const div = document.createElement("div");
    div.className = "car__listing";

    div.innerHTML = `<img src="${car.media?.photo_links?.[0] || ''}" width="200" />
      <h3>${car.build?.year} ${car.build?.make} ${car.build?.model}</h3>
      <p>$${car.price}</p>
      <p>${car.miles} miles</p>
    `;

    container.appendChild(div)
})
}

const searchInput = document.getElementById("searchInput");

searchInput.addEventListener("input", (e) => {
    const value = e.target.value.trim();
    getCars(value);
})
