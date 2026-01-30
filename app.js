// Configuração da API
const API_CONFIG = {
    // Yahoo Finance API alternativa (gratuita via RapidAPI ou brapi.dev)
    BRAPI_BASE: 'https://brapi.dev/api',
    // ou use Alpha Vantage, Twelve Data, etc.
};

// Principais ações brasileiras
const TOP_STOCKS = [
    { ticker: 'PETR4', name: 'Petrobras PN', sector: 'energia' },
    { ticker: 'VALE3', name: 'Vale ON', sector: 'mineracao' },
    { ticker: 'ITUB4', name: 'Itaú Unibanco PN', sector: 'financeiro' },
    { ticker: 'BBDC4', name: 'Bradesco PN', sector: 'financeiro' },
    { ticker: 'ABEV3', name: 'Ambev ON', sector: 'consumo' },
    { ticker: 'WEGE3', name: 'WEG ON', sector: 'industrial' },
    { ticker: 'MGLU3', name: 'Magazine Luiza ON', sector: 'varejo' },
    { ticker: 'B3SA3', name: 'B3 ON', sector: 'financeiro' }
];

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadMarketIndices();
    loadScreenerData();
    loadNews();
    setupEventListeners();

    // Atualizar a cada 30 segundos
    setInterval(loadMarketIndices, 30000);
});

function setupEventListeners() {
    document.getElementById('search-btn').addEventListener('click', searchStock);
    document.getElementById('stock-search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchStock();
    });
    document.getElementById('filter-btn').addEventListener('click', filterStocks);
}

// Carregar índices principais
async function loadMarketIndices() {
    const indices = [
        { symbol: '^BVSP', id: 'ibov' },
        { symbol: 'IBRX', id: 'ibrx' },
        { symbol: 'SMLL', id: 'smll' }
    ];

    for (const index of indices) {
        try {
            // Exemplo usando brapi.dev (API gratuita brasileira)
            const response = await fetch(`${API_CONFIG.BRAPI_BASE}/quote/${index.symbol}?range=1d&interval=1d`);
            const data = await response.json();

            if (data.results && data.results[0]) {
                const result = data.results[0];
                updateIndexCard(index.id, result);
            }
        } catch (error) {
            console.error(`Erro ao carregar ${index.symbol}:`, error);
        }
    }

    // USD/BRL
    try {
        const response = await fetch(`${API_CONFIG.BRAPI_BASE}/quote/USDBRL?range=1d&interval=1d`);
        const data = await response.json();
        if (data.results && data.results[0]) {
            updateIndexCard('usd', data.results[0]);
        }
    } catch (error) {
        console.error('Erro ao carregar USD/BRL:', error);
    }
}

function updateIndexCard(id, data) {
    const priceEl = document.getElementById(`${id}-price`);
    const changeEl = document.getElementById(`${id}-change`);

    if (priceEl && changeEl) {
        priceEl.textContent = `R$ ${data.regularMarketPrice.toFixed(2)}`;

        const change = data.regularMarketChangePercent;
        const changeText = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        changeEl.textContent = changeText;
        changeEl.className = `change ${change >= 0 ? 'positive' : 'negative'}`;
    }
}

// Buscar ação específica
async function searchStock() {
    const input = document.getElementById('stock-search-input');
    const resultDiv = document.getElementById('stock-result');
    const ticker = input.value.trim().toUpperCase();

    if (!ticker) return;

    resultDiv.innerHTML = '<p class="loading">Carregando...</p>';

    try {
        const response = await fetch(`${API_CONFIG.BRAPI_BASE}/quote/${ticker}?range=1mo&interval=1d&fundamental=true`);
        const data = await response.json();

        if (data.results && data.results[0]) {
            displayStockDetail(data.results[0]);
        } else {
            resultDiv.innerHTML = '<p>Ação não encontrada. Verifique o ticker.</p>';
        }
    } catch (error) {
        resultDiv.innerHTML = '<p>Erro ao buscar dados. Tente novamente.</p>';
        console.error(error);
    }
}

function displayStockDetail(stock) {
    const resultDiv = document.getElementById('stock-result');
    const change = stock.regularMarketChangePercent || 0;

    resultDiv.innerHTML = `
        <div class="stock-header">
            <h3>${stock.longName || stock.symbol}</h3>
            <p class="ticker">${stock.symbol}</p>
        </div>
        <div class="stock-price">
            <p class="price">R$ ${stock.regularMarketPrice.toFixed(2)}</p>
            <p class="change ${change >= 0 ? 'positive' : 'negative'}">
                ${change >= 0 ? '+' : ''}${change.toFixed(2)}%
            </p>
        </div>
        <div class="stock-metrics">
            <div class="metric">
                <span>Abertura:</span>
                <strong>R$ ${(stock.regularMarketOpen || 0).toFixed(2)}</strong>
            </div>
            <div class="metric">
                <span>Máxima:</span>
                <strong>R$ ${(stock.regularMarketDayHigh || 0).toFixed(2)}</strong>
            </div>
            <div class="metric">
                <span>Mínima:</span>
                <strong>R$ ${(stock.regularMarketDayLow || 0).toFixed(2)}</strong>
            </div>
            <div class="metric">
                <span>Volume:</span>
                <strong>${formatVolume(stock.regularMarketVolume || 0)}</strong>
            </div>
        </div>
    `;
}

// Screener
async function loadScreenerData() {
    const tbody = document.getElementById('screener-results');
    tbody.innerHTML = '<tr><td colspan="5" class="loading">Carregando...</td></tr>';

    try {
        const tickers = TOP_STOCKS.map(s => s.ticker).join(',');
        const response = await fetch(`${API_CONFIG.BRAPI_BASE}/quote/${tickers}?range=1d&interval=1d`);
        const data = await response.json();

        if (data.results) {
            displayScreenerResults(data.results);
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5">Erro ao carregar dados</td></tr>';
        console.error(error);
    }
}

function displayScreenerResults(stocks) {
    const tbody = document.getElementById('screener-results');
    tbody.innerHTML = '';

    stocks.forEach(stock => {
        const change = stock.regularMarketChangePercent || 0;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${stock.symbol}</strong></td>
            <td>${stock.longName || stock.shortName || '-'}</td>
            <td>R$ ${stock.regularMarketPrice.toFixed(2)}</td>
            <td class="${change >= 0 ? 'positive' : 'negative'}">
                ${change >= 0 ? '+' : ''}${change.toFixed(2)}%
            </td>
            <td>${formatVolume(stock.regularMarketVolume || 0)}</td>
        `;
        tbody.appendChild(row);
    });
}

function filterStocks() {
    // Implementar filtros customizados
    const sector = document.getElementById('sector-filter').value;
    const minPrice = parseFloat(document.getElementById('min-price').value) || 0;
    const maxPrice = parseFloat(document.getElementById('max-price').value) || Infinity;

    // Lógica de filtro aqui
    loadScreenerData(); // Recarregar com filtros
}

// Notícias
async function loadNews() {
    const newsContainer = document.getElementById('news-container');
    newsContainer.innerHTML = '<p class="loading">Carregando notícias...</p>';

    // Exemplo: integrar com NewsAPI, ou scraping de portais brasileiros
    // Para demonstração, vamos simular
    const mockNews = [
        { title: 'Ibovespa fecha em alta com otimismo no mercado', source: 'Valor Econômico', time: 'Há 2h' },
        { title: 'Petrobras anuncia novo dividendo extraordinário', source: 'InfoMoney', time: 'Há 4h' },
        { title: 'Dólar cai com expectativa de decisão do Copom', source: 'G1', time: 'Há 5h' },
        { title: 'Vale supera expectativas no trimestre', source: 'Reuters', time: 'Há 6h' }
    ];

    newsContainer.innerHTML = mockNews.map(news => `
        <div class="news-card">
            <h3>${news.title}</h3>
            <p class="source">${news.source} • ${news.time}</p>
        </div>
    `).join('');
}

// Utilidades
function formatVolume(volume) {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
    return volume.toString();
}