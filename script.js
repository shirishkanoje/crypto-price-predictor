let actualChart, predictedChart;

let historicalData = [];
let historicalLabels = [];
let predictedPrices = [];
let futureLabels = [];

let selectedCoinId = null;
let debounceTimer;
let cache = {};
let isLoading = false;

const searchInput = document.getElementById("search");
const suggestionsBox = document.getElementById("suggestions");
const report = document.getElementById("report");

const actualCtx = document.getElementById("actualChart");
const predictedCtx = document.getElementById("predictedChart");


// ================= SEARCH (FAST)
searchInput.addEventListener("input", () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchSuggestions, 400);
});

async function fetchSuggestions() {
  const query = searchInput.value.trim().toLowerCase();

  if (query.length < 2) {
    suggestionsBox.style.display = "none";
    return;
  }

  // CACHE
  if (cache[query]) {
    renderSuggestions(cache[query]);
    return;
  }

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${query}`
    );

    const data = await res.json();

    cache[query] = data.coins;
    renderSuggestions(data.coins);

  } catch (err) {
    console.error("API error:", err);
  }
}

function renderSuggestions(coins) {
  suggestionsBox.innerHTML = "";

  if (!coins.length) return;

  suggestionsBox.style.display = "block";

  coins.slice(0, 5).forEach((coin) => {
    const li = document.createElement("li");
    li.textContent = `${coin.name} (${coin.symbol})`;
    li.dataset.id = coin.id;

    li.onclick = () => {
      selectedCoinId = coin.id;
      searchInput.value = coin.name;
      suggestionsBox.style.display = "none";

      loadHistoricalData();
    };

    suggestionsBox.appendChild(li);
  });
}


// ================= LOAD DATA
async function loadHistoricalData() {
  if (!selectedCoinId) return;

  isLoading = true;

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${selectedCoinId}/market_chart?vs_currency=usd&days=15`
    );

    const data = await res.json();
    const prices = data.prices;

    if (!prices || prices.length === 0) {
      alert("No data found");
      return;
    }

    const map = new Map();

    prices.forEach(([time, price]) => {
      const date = new Date(time).toISOString().split("T")[0];
      if (!map.has(date)) map.set(date, price);
    });

    historicalLabels = [...map.keys()];
    historicalData = [...map.values()].map(p => +p.toFixed(2));

    renderActualChart();

  } catch (err) {
    alert("Error loading data");
    console.error(err);
  }

  isLoading = false;
}


// ================= ACTUAL CHART
function renderActualChart() {
  if (actualChart) actualChart.destroy();

  actualChart = new Chart(actualCtx, {
    type: "line",
    data: {
      labels: historicalLabels,
      datasets: [{
        label: "Actual Price",
        data: historicalData,
        borderColor: "#22d3ee",
        tension: 0.4
      }]
    }
  });
}


// ================= PREDICTION
function generatePrediction() {
  if (isLoading) {
    alert("Please wait, loading...");
    return;
  }

  if (!historicalData.length) {
    alert("Select a coin first");
    return;
  }

  const last = historicalData[historicalData.length - 1];

  predictedPrices = [];
  futureLabels = [];

  for (let i = 1; i <= 30; i++) {
    const value = last * (1 + 0.005 * i);
    predictedPrices.push(+value.toFixed(2));

    const d = new Date();
    d.setDate(d.getDate() + i);
    futureLabels.push(d.toISOString().split("T")[0]);
  }

  renderPredictedChart();
  generateReport();
}


// ================= PREDICTED CHART
function renderPredictedChart() {
  if (predictedChart) predictedChart.destroy();

  predictedChart = new Chart(predictedCtx, {
    type: "line",
    data: {
      labels: futureLabels,
      datasets: [{
        label: "Predicted Price",
        data: predictedPrices,
        borderColor: "#f87171",
        borderDash: [5, 5],
        tension: 0.4
      }]
    }
  });
}


// ================= REPORT
function generateReport() {
  const avg = (predictedPrices.reduce((a, b) => a + b, 0) / predictedPrices.length).toFixed(2);
  const min = Math.min(...predictedPrices).toFixed(2);
  const max = Math.max(...predictedPrices).toFixed(2);

  report.innerHTML = `
    <h3>Prediction Summary</h3>
    <p>Average: $${avg}</p>
    <p>Min: $${min}</p>
    <p>Max: $${max}</p>
  `;
}
