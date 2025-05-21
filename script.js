let actualChart, predictedChart;
let historicalData = [], historicalLabels = [];
let futureLabels = [], predictedPrices = [];

const actualCtx = document.getElementById('actualChart').getContext('2d');
const predictedCtx = document.getElementById('predictedChart').getContext('2d');
const searchInput = document.getElementById('search');
const suggestionsBox = document.getElementById('suggestions');
const predictionReport = document.getElementById('predictionReport');

const actualChartContainer = document.getElementById('actualChartContainer');
const predictedChartContainer = document.getElementById('predictedChartContainer');

searchInput.addEventListener('input', async () => {
  const query = searchInput.value.trim();
  if (query.length < 2) {
    suggestionsBox.style.display = 'none';
    return;
  }

  const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${query}`);
  const data = await res.json();

  suggestionsBox.innerHTML = '';
  if (data.coins.length > 0) {
    suggestionsBox.style.display = 'block';
    data.coins.slice(0, 5).forEach(coin => {
      const li = document.createElement('li');
      li.textContent = `${coin.name} (${coin.symbol.toUpperCase()})`;
      li.dataset.id = coin.id;
      suggestionsBox.appendChild(li);
    });
  } else {
    suggestionsBox.style.display = 'none';
  }
});

suggestionsBox.addEventListener('click', async (e) => {
  if (e.target.tagName === 'LI') {
    const coinId = e.target.dataset.id;
    searchInput.value = e.target.textContent;
    suggestionsBox.innerHTML = '';
    suggestionsBox.style.display = 'none';
    predictionReport.style.display = 'none';
    predictionReport.innerHTML = '';
    predictedChartContainer.style.display = 'none';
    await loadHistoricalData(coinId);
  }
});

async function loadHistoricalData(coinId) {
  // Fetch last 15 days of price data
  const res = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=15`);
  const data = await res.json();
  const prices = data.prices;

  // Map to avoid duplicate dates, one price per day
  const datePriceMap = new Map();
  prices.forEach(([timestamp, price]) => {
    const date = new Date(timestamp).toISOString().split('T')[0];
    if (!datePriceMap.has(date)) {
      datePriceMap.set(date, price);
    }
  });

  historicalLabels = [...datePriceMap.keys()];
  historicalData = [...datePriceMap.values()].map(p => +p.toFixed(2));

  // Show actual chart container
  actualChartContainer.style.display = 'block';
  // Hide predicted chart container and prediction report when new coin selected
  predictedChartContainer.style.display = 'none';
  predictionReport.style.display = 'none';

  renderActualChart();

  if (predictedChart) {
    predictedChart.destroy();
    predictedChart = null;
  }
  predictedPrices = [];
  futureLabels = [];
}

function renderActualChart() {
  if (actualChart) actualChart.destroy();

  actualChart = new Chart(actualCtx, {
    type: 'line',
    data: {
      labels: historicalLabels,
      datasets: [{
        label: 'Actual Price (Last 15 Days)',
        data: historicalData,
        borderColor: '#22d3ee',
        backgroundColor: 'rgba(34, 211, 238, 0.1)',
        tension: 0.4,
        pointRadius: 5,
        borderWidth: 2,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest',
        intersect: false
      },
      plugins: {
        tooltip: {
          enabled: true,
          callbacks: {
            title: ctx => `Date: ${ctx[0].label}`,
            label: ctx => `Price: $${ctx.parsed.y}`
          }
        },
        legend: { display: true }
      },
      scales: {
        x: {
          title: { display: true, text: 'Date' },
          ticks: { maxRotation: 45, minRotation: 45, maxTicksLimit: 15 },
          grid: { display: false },
          type: 'category',
          offset: true,
        },
        y: {
          title: { display: true, text: 'Price (USD)' },
          beginAtZero: false,
          grid: { color: '#f0f0f0' }
        }
      }
    }
  });
}

function generatePrediction() {
  if (!historicalData.length) {
    alert("Please select a coin first.");
    return;
  }

  const lastPrice = historicalData[historicalData.length - 1];
  const growthRate = 0.005; // 0.5% daily growth
  const volatility = 0.02; // 2% fluctuation

  predictedPrices = [];
  futureLabels = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i <= 30; i++) {
    const fluctuation = (Math.random() - 0.5) * volatility * lastPrice;
    const predicted = lastPrice * (1 + growthRate * i) + fluctuation;
    predictedPrices.push(+predicted.toFixed(2));

    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + i);
    futureLabels.push(futureDate.toISOString().split('T')[0]);
  }

  renderPredictedChart();
  generateReport();
}

function renderPredictedChart() {
  if (predictedChart) predictedChart.destroy();

  predictedChart = new Chart(predictedCtx, {
    type: 'line',
    data: {
      labels: futureLabels,
      datasets: [{
        label: 'Predicted Price (Next 30 Days)',
        data: predictedPrices,
        borderColor: '#f87171',
        backgroundColor: 'rgba(248, 113, 113, 0.1)',
        borderDash: [6, 4],
        tension: 0.4,
        pointRadius: 5,
        borderWidth: 2,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest',
        intersect: false
      },
      plugins: {
        tooltip: {
          enabled: true,
          callbacks: {
            title: ctx => `Date: ${ctx[0].label}`,
            label: ctx => `Price: $${ctx.parsed.y}`
          }
        },
        legend: { display: true }
      },
      scales: {
        x: {
          title: { display: true, text: 'Date' },
          ticks: { maxRotation: 45, minRotation: 45, maxTicksLimit: 15 },
          grid: { display: false },
          type: 'category',
          offset: true,
        },
        y: {
          title: { display: true, text: 'Price (USD)' },
          beginAtZero: false,
          grid: { color: '#f0f0f0' }
        }
      }
    }
  });

  // Show predicted chart container after rendering
  predictedChartContainer.style.display = 'block';
}

function generateReport() {
    const avg = (predictedPrices.reduce((a, b) => a + b, 0) / predictedPrices.length).toFixed(2);
    const min = Math.min(...predictedPrices).toFixed(2);
    const max = Math.max(...predictedPrices).toFixed(2);
    const start = predictedPrices[0];
    const end = predictedPrices[predictedPrices.length - 1];
    const trend = end > start ? "📈 Upward" : "📉 Downward";
  
    // Starting price of current date (last actual price)
    const currentDatePrice = historicalData[historicalData.length - 1].toFixed(2);
  
    predictionReport.innerHTML = `
      <h2>Prediction Summary</h2>
      <ul>
        <li>Starting price (current date): $${currentDatePrice}</li>
        <li>Average predicted price: $${avg}</li>
        <li>Minimum predicted price: $${min}</li>
        <li>Maximum predicted price: $${max}</li>
        <li>Ending predicted price (after 30 days): $${end}</li>
        <li>Trend: ${trend}</li>
      </ul>
      <p><i>Note: This is a simple simulated prediction and not financial advice.</i></p>
    `;
  
    predictionReport.style.display = 'block';
  }
  

