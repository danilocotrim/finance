// Configuração da API
const API_CONFIG = {
    BASE_URL: 'https://brapi.dev/api',
    // SEU TOKEN AQUI (Mantenha o seu token atual)
    TOKEN: '4M8EUKCCwQkQf98MrtwpyF' 
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
    { ticker: 'BBAS3', name: 'Banco do Brasil', sector: 'financeiro' }
];

document.addEventListener('DOMContentLoaded', () => {
    console.log("Iniciando App Finance BR...");
    loadMarketIndices();
    loadScreenerData();
    loadNews();
    setupEventListeners();
    
    // Atualiza a cada 60s
    setInterval(() => {
        loadMarketIndices();
        loadScreenerData();
    }, 60000);
});

function setupEventListeners() {
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('stock-search-input');
    const filterBtn = document.getElementById('filter-btn');

    if(searchBtn) searchBtn.addEventListener('click', searchStock);
    if(searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchStock();
        });
    }
    if(filterBtn) filterBtn.addEventListener('click', filterStocks);
}

// --- FUNÇÕES DE DADOS ---

async function loadMarketIndices() {
    console.log("Carregando índices...");
    
    // 1. Índices de Ações (^BVSP, etc)
    const indices = [
        { symbol: '^BVSP', id: 'ibov', backup: 'BOVA11' },
        { symbol: 'IBRX', id: 'ibrx', backup: 'BOVA11' }, 
        { symbol: 'SMLL', id: 'smll', backup: 'SMAL11' }
    ];
    
    for (const index of indices) {
        // Tenta buscar cotação (v2/quote geralmente é mais robusta)
        await fetchAndDisplay(index.symbol, index.id, index.backup);
    }

    // 2. USD/BRL (Tratamento Especial)
    try {
        const url = `${API_CONFIG.BASE_URL}/v2/currency?currency=USD-BRL&token=${API_CONFIG.TOKEN}`;
        console.log(`Buscando USD: ${url}`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        console.log("Dados USD recebidos:", data); // Olhe o console para ver isso!

        if (data.currency && data.currency.length > 0) {
            const moeda = data.currency[0];
            // Tenta pegar qualquer campo de preço que vier
            const preco = parseFloat(moeda.bidPrice || moeda.askPrice || moeda.highPrice || 0);
            const variação = parseFloat(moeda.bidChangePercent || moeda.askChangePercent || 0);
            
            updateIndexCard('usd', { regularMarketPrice: preco, regularMarketChangePercent: variação });
        } else {
            console.error("USD: Resposta vazia ou formato inesperado", data);
        }
    } catch (error) {
        console.error('Erro fatal USD:', error);
    }
}

async function fetchAndDisplay(ticker, elementId, backupTicker) {
    try {
        const url = `${API_CONFIG.BASE_URL}/quote/${ticker}?token=${API_CONFIG.TOKEN}&range=1d&interval=1d`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            updateIndexCard(elementId, data.results[0]);
        } else {
            console.warn(`Sem dados para ${ticker}. Tentando backup ${backupTicker}...`);
            if (backupTicker) fetchAndDisplay(backupTicker, elementId, null);
        }
    } catch (error) {
        console.error(`Erro ao carregar ${ticker}:`, error);
        if (backupTicker) fetchAndDisplay(backupTicker, elementId, null);
    }
}

function updateIndexCard(id, data) {
    const priceEl = document.getElementById(`${id}-price`);
    const changeEl = document.getElementById(`${id}-change`);
    
    if (priceEl && changeEl) {
        const price = data.regularMarketPrice || 0;
        const change = data.regularMarketChangePercent || 0;
        
        priceEl.textContent = `R$ ${price.toFixed(2)}`;
        changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        
        changeEl.classList.remove('positive', 'negative');
        changeEl.classList.add(change >= 0 ? 'positive' : 'negative');
    }
}

// --- SCREENER ---

async function loadScreenerData() {
    const tbody = document.getElementById('screener-results');
    if (!tbody) return;

    if(tbody.children.length === 0) tbody.innerHTML = '<tr><td colspan="5">Atualizando...</td></tr>';

    try {
        const tickers = TOP_STOCKS.map(s => s.ticker).join(',');
        const url = `${API_CONFIG.BASE_URL}/quote/${tickers}?token=${API_CONFIG.TOKEN}&range=1d&interval=1d`;
        
        console.log(`Buscando Screener: ${url}`);
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.results) {
            displayScreenerResults(data.results);
        } else {
            console.error("Screener: Resposta sem 'results'", data);
            tbody.innerHTML = '<tr><td colspan="5">Erro: API não retornou dados.</td></tr>';
        }
    } catch (error) {
        console.error('Erro Screener:', error);
        tbody.innerHTML = '<tr><td colspan="5">Erro de conexão. Verifique o console.</td></tr>';
    }
}

function displayScreenerResults(stocks) {
    const tbody = document.getElementById('screener-results');
    tbody.innerHTML = '';
    
    stocks.forEach(stock => {
        const localInfo = TOP_STOCKS.find(s => s.ticker === stock.symbol);
        const name = localInfo ? localInfo.name : stock.symbol;
        const price = stock.regularMarketPrice || 0;
        const change = stock.regularMarketChangePercent || 0;
        const vol = stock.regularMarketVolume || 0;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${stock.symbol}</strong></td>
            <td>${name}</td>
            <td>R$ ${price.toFixed(2)}</td>
            <td class="${change >= 0 ? 'positive' : 'negative'}">
                ${change >= 0 ? '+' : ''}${change.toFixed(2)}%
            </td>
            <td>${formatVolume(vol)}</td>
        `;
        tbody.appendChild(row);
    });
}

// --- BUSCA ---

async function searchStock() {
    const input = document.getElementById('stock-search-input');
    const resultDiv = document.getElementById('stock-result');
    const ticker = input.value.trim().toUpperCase();
    
    if (!ticker) return;
    
    resultDiv.innerHTML = '<p>Buscando...</p>';
    
    try {
        const url = `${API_CONFIG.BASE_URL}/quote/${ticker}?token=${API_CONFIG.TOKEN}&range=1d&interval=1d`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            displayStockDetail(data.results[0]);
        } else {
            resultDiv.innerHTML = '<p>Ação não encontrada.</p>';
        }
    } catch (error) {
        console.error(error);
        resultDiv.innerHTML = '<p>Erro na busca.</p>';
    }
}

function displayStockDetail(stock) {
    const resultDiv = document.getElementById('stock-result');
    const price = stock.regularMarketPrice || 0;
    const change = stock.regularMarketChangePercent || 0;
    
    resultDiv.innerHTML = `
        <div class="stock-header">
            <h3>${stock.longName || stock.symbol}</h3>
            <p class="ticker">${stock.symbol}</p>
        </div>
        <div class="stock-price">
            <p class="price">R$ ${price.toFixed(2)}</p>
            <p class="change ${change >= 0 ? 'positive' : 'negative'}">
                ${change >= 0 ? '+' : ''}${change.toFixed(2)}%
            </p>
        </div>
    `;
}

// --- UTILS ---

function filterStocks() {
    alert("Filtro visual não implementado nesta versão simplificada.");
}

function loadNews() {
    const newsContainer = document.getElementById('news-container');
    if(!newsContainer) return;
    // Mock news (não alterado)
    const mockNews = [
        { title: 'Mercado hoje: Ibovespa oscila com exterior', source: 'Valor', time: '10 min' },
        { title: 'Dólar futuro abre em baixa', source: 'InfoMoney', time: '30 min' }
    ];
    newsContainer.innerHTML = mockNews.map(n => 
        `<div class="news-card"><h3>${n.title}</h3><p>${n.source} • ${n.time}</p></div>`
    ).join('');
}

function formatVolume(v) {
    if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
    if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
    if (v >= 1e3) return (v / 1e3).toFixed(2) + 'K';
    return v;
}
