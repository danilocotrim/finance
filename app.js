// Configuração
const CONFIG = {
    // API de Ações (brapi) - Mantenha seu token aqui
    BRAPI_TOKEN: '4M8EUKCCwQkQf98MrtwpyF', 
    BRAPI_BASE: 'https://brapi.dev/api',
    
    // API de Moedas (AwesomeAPI - Grátis e sem token)
    MOEDA_API: 'https://economia.awesomeapi.com.br/last/USD-BRL'
};

const TOP_STOCKS = [
    { ticker: 'PETR4', name: 'Petrobras', sector: 'energia' },
    { ticker: 'VALE3', name: 'Vale', sector: 'mineracao' },
    { ticker: 'ITUB4', name: 'Itaú', sector: 'financeiro' },
    { ticker: 'WEGE3', name: 'WEG', sector: 'industrial' },
    { ticker: 'BBAS3', name: 'Banco do Brasil', sector: 'financeiro' }
];

document.addEventListener('DOMContentLoaded', () => {
    updateAll();
    setInterval(updateAll, 60000); // Atualiza a cada 60s
    setupListeners();
});

function updateAll() {
    loadIndices();
    loadScreener();
    loadNews();
}

// 1. CARREGAR ÍNDICES (USD via AwesomeAPI, IBOV via BOVA11)
async function loadIndices() {
    // Dólar (AwesomeAPI)
    try {
        const res = await fetch(CONFIG.MOEDA_API);
        const data = await res.json();
        const usd = data.USDBRL;
        
        updateCard('usd', {
            price: parseFloat(usd.bid),
            change: parseFloat(usd.pctChange)
        });
    } catch (e) { console.error('Erro USD:', e); }

    // Ibovespa (Usando BOVA11 como proxy, pois ^BVSP é bloqueado no free)
    fetchStock('BOVA11', (data) => {
        updateCard('ibov', {
            price: data.regularMarketPrice,
            change: data.regularMarketChangePercent
        }, "BOVA11 (ETF)");
    });

    // SMLL (Small Caps - Usando SMAL11)
    fetchStock('SMAL11', (data) => {
        updateCard('smll', {
            price: data.regularMarketPrice,
            change: data.regularMarketChangePercent
        }, "SMAL11 (ETF)");
    });
    
    // IBRX (Usando BRAX11)
    fetchStock('BRAX11', (data) => {
        updateCard('ibrx', {
            price: data.regularMarketPrice,
            change: data.regularMarketChangePercent
        }, "BRAX11 (ETF)");
    });
}

// 2. SCREENER (Tabela de Ações)
async function loadScreener() {
    const tickers = TOP_STOCKS.map(t => t.ticker).join(',');
    const url = `${CONFIG.BRAPI_BASE}/quote/${tickers}?token=${CONFIG.BRAPI_TOKEN}&range=1d&interval=1d`;
    
    try {
        const res = await fetch(url);
        const data = await res.json();
        const tbody = document.getElementById('screener-results');
        
        if(data.results) {
            tbody.innerHTML = '';
            data.results.forEach(stock => {
                const info = TOP_STOCKS.find(t => t.ticker === stock.symbol) || {};
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${stock.symbol}</strong></td>
                    <td>${info.name || stock.symbol}</td>
                    <td>R$ ${stock.regularMarketPrice.toFixed(2)}</td>
                    <td class="${stock.regularMarketChangePercent >= 0 ? 'positive' : 'negative'}">
                        ${stock.regularMarketChangePercent?.toFixed(2)}%
                    </td>
                    <td>${(stock.regularMarketVolume/1000000).toFixed(1)}M</td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) { console.error('Erro Screener:', e); }
}

// FUNÇÕES AUXILIARES
async function fetchStock(ticker, callback) {
    try {
        const url = `${CONFIG.BRAPI_BASE}/quote/${ticker}?token=${CONFIG.BRAPI_TOKEN}&range=1d&interval=1d`;
        const res = await fetch(url);
        const data = await res.json();
        if(data.results && data.results[0]) callback(data.results[0]);
    } catch (e) { console.error(`Erro ${ticker}:`, e); }
}

function updateCard(id, data, labelOverride) {
    const priceEl = document.getElementById(`${id}-price`);
    const changeEl = document.getElementById(`${id}-change`);
    const titleEl = document.querySelector(`[data-symbol="${id.toUpperCase()}"] h3`) || 
                    document.querySelector(`#${id}-price`).parentElement.querySelector('h3');

    if(priceEl) priceEl.innerText = `R$ ${data.price.toFixed(2)}`;
    if(changeEl) {
        changeEl.innerText = `${data.change > 0 ? '+' : ''}${data.change.toFixed(2)}%`;
        changeEl.className = `change ${data.change >= 0 ? 'positive' : 'negative'}`;
    }
    // Muda o título para avisar que é ETF (opcional)
    if(labelOverride && titleEl) titleEl.innerText = labelOverride; 
}

function setupListeners() {
    document.getElementById('search-btn')?.addEventListener('click', () => {
        const ticker = document.getElementById('stock-search-input').value;
        if(ticker) fetchStock(ticker.toUpperCase(), (data) => {
            document.getElementById('stock-result').innerHTML = `
                <h3>${data.symbol}</h3>
                <p class="price">R$ ${data.regularMarketPrice.toFixed(2)} (${data.regularMarketChangePercent.toFixed(2)}%)</p>
            `;
        });
    });
}

function loadNews() {
    // Mantendo estático por enquanto
    document.getElementById('news-container').innerHTML = `
        <div class="news-card"><h3>Ibovespa Futuro sobe</h3><p>InfoMoney • 10 min</p></div>
        <div class="news-card"><h3>Dólar cai para R$ 5,70</h3><p>Valor • 30 min</p></div>
    `;
}
