// Configuração da API
const API_CONFIG = {
    BASE_URL: 'https://brapi.dev/api',
    // Substitua abaixo pelo seu token real
    TOKEN: '4M8EUKCCwQkQf98MrtwpyF' 
};

// Principais ações brasileiras (Plano gratuito geralmente libera as blue chips)
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

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadMarketIndices();
    loadScreenerData();
    loadNews();
    setupEventListeners();

    // Atualizar a cada 60 segundos (para economizar requisições e evitar limites)
    setInterval(() => {
        loadMarketIndices();
        loadScreenerData();
    }, 60000);
});

function setupEventListeners() {
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('stock-search-input');

    if(searchBtn) searchBtn.addEventListener('click', searchStock);
    if(searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchStock();
        });
    }

    const filterBtn = document.getElementById('filter-btn');
    if(filterBtn) filterBtn.addEventListener('click', filterStocks);
}

// ------------------------------------------------------------------
// FUNÇÕES DE DADOS (Agora com Token)
// ------------------------------------------------------------------

// Carregar índices principais
async function loadMarketIndices() {
    // Nota: O plano gratuito pode ter restrições para índices como ^BVSP.
    // Se falhar, tentaremos buscar ETFs que seguem o índice (BOVA11, SMAL11)
    const indices = [
        { symbol: '^BVSP', id: 'ibov', backup: 'BOVA11' },
        { symbol: 'IBRX', id: 'ibrx', backup: 'BOVA11' }, // IBRX direto pode não estar disponível
        { symbol: 'SMLL', id: 'smll', backup: 'SMAL11' }
    ];

    for (const index of indices) {
        try {
            const url = `${API_CONFIG.BASE_URL}/quote/${index.symbol}?token=${API_CONFIG.TOKEN}&range=1d&interval=1d`;
            const response = await fetch(url);

            if (!response.ok) throw new Error('Falha na requisição');

            const data = await response.json();

            if (data.results && data.results[0]) {
                updateIndexCard(index.id, data.results[0]);
            } else {
                // Tentar backup se o índice direto falhar
                if(index.backup) loadBackupIndex(index.id, index.backup);
            }
        } catch (error) {
            console.warn(`Tentando backup para ${index.symbol}...`);
            if(index.backup) loadBackupIndex(index.id, index.backup);
        }
    }

    // USD/BRL (Moedas geralmente funcionam bem)
    try {
        const url = `${API_CONFIG.BASE_URL}/v2/currency?currency=USD-BRL&token=${API_CONFIG.TOKEN}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.currency && data.currency[0]) {
             // Adaptar formato da API de moedas para o formato do card
             const currencyData = {
                 regularMarketPrice: parseFloat(data.currency[0].bidPrice),
                 regularMarketChangePercent: parseFloat(data.currency[0].bidChangePercent)
             };
             updateIndexCard('usd', currencyData);
        }
    } catch (error) {
        console.error('Erro ao carregar USD/BRL:', error);
    }
}

async function loadBackupIndex(id, ticker) {
    try {
        const url = `${API_CONFIG.BASE_URL}/quote/${ticker}?token=${API_CONFIG.TOKEN}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.results && data.results[0]) {
            updateIndexCard(id, data.results[0]);
        }
    } catch(e) {
        console.error(`Erro fatal no índice ${id}`, e);
    }
}

function updateIndexCard(id, data) {
    const priceEl = document.getElementById(`${id}-price`);
    const changeEl = document.getElementById(`${id}-change`);

    if (priceEl && changeEl) {
        // Formatar preço
        priceEl.textContent = `R$ ${data.regularMarketPrice.toFixed(2)}`;

        // Formatar variação
        const change = data.regularMarketChangePercent || 0;
        const changeText = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        changeEl.textContent = changeText;

        // Remover classes antigas e adicionar nova cor
        changeEl.classList.remove('positive', 'negative');
        changeEl.classList.add(change >= 0 ? 'positive' : 'negative');
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
        // Adicionando token na busca
        const url = `${API_CONFIG.BASE_URL}/quote/${ticker}?token=${API_CONFIG.TOKEN}&range=1mo&interval=1d&fundamental=true`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.results && data.results[0]) {
            displayStockDetail(data.results[0]);
        } else {
            resultDiv.innerHTML = '<p>Ação não encontrada ou não disponível no plano gratuito.</p>';
        }
    } catch (error) {
        resultDiv.innerHTML = '<p>Erro ao buscar dados. Verifique o ticker ou seu token.</p>';
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
    if(!tbody) return;

    // Evitar "piscar" a tabela se já tiver dados, só atualiza valores se possível
    if(tbody.children.length === 0) {
         tbody.innerHTML = '<tr><td colspan="5" class="loading">Carregando cotações...</td></tr>';
    }

    try {
        const tickers = TOP_STOCKS.map(s => s.ticker).join(',');
        // Requisição em lote (muito mais eficiente)
        const url = `${API_CONFIG.BASE_URL}/quote/${tickers}?token=${API_CONFIG.TOKEN}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.results) {
            displayScreenerResults(data.results);
        }
    } catch (error) {
        console.error('Erro screener:', error);
        tbody.innerHTML = '<tr><td colspan="5">Erro ao carregar (verifique seu token no código)</td></tr>';
    }
}

function displayScreenerResults(stocks) {
    const tbody = document.getElementById('screener-results');
    tbody.innerHTML = '';

    stocks.forEach(stock => {
        const change = stock.regularMarketChangePercent || 0;

        // Tentar encontrar o nome completo na nossa lista local TOP_STOCKS
        const localInfo = TOP_STOCKS.find(s => s.ticker === stock.symbol);
        const name = localInfo ? localInfo.name : (stock.longName || stock.symbol);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${stock.symbol}</strong></td>
            <td>${name}</td>
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
    const sector = document.getElementById('sector-filter').value;
    // Filtragem simples no frontend baseada na nossa lista local
    const filteredTickers = TOP_STOCKS.filter(stock => {
        if (!sector) return true;
        return stock.sector === sector;
    });

    // Atualizar apenas a visualização
    // Nota: Em um app real, faríamos nova chamada ou filtraríamos os dados já carregados
    // Aqui vamos simplificar recarregando o screener apenas com os filtrados
    if(filteredTickers.length > 0) {
         // Atualiza a lista global temporariamente ou filtra visualmente
         // Para simplificar este exemplo, apenas alertamos
         alert("Filtro aplicado! (Lógica de visualização simplificada)");
    }
}

// Notícias (Mantido mock por enquanto)
async function loadNews() {
    const newsContainer = document.getElementById('news-container');
    if(!newsContainer) return;

    const mockNews = [
        { title: 'Ibovespa sobe impulsionado por Vale e Petrobras', source: 'Valor Econômico', time: 'Há 30 min' },
        { title: 'Dólar opera em queda à espera de dados dos EUA', source: 'InfoMoney', time: 'Há 1h' },
        { title: 'Bancos lideram ganhos no pregão de hoje', source: 'Brazil Journal', time: 'Há 2h' },
        { title: 'Copom sinaliza manutenção da taxa Selic', source: 'G1 Economia', time: 'Há 4h' }
    ];

    newsContainer.innerHTML = mockNews.map(news => `
        <div class="news-card">
            <h3>${news.title}</h3>
            <p class="source">${news.source} • ${news.time}</p>
        </div>
    `).join('');
}

function formatVolume(volume) {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
    return volume.toString();
}
