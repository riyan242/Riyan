// CyberTrade Pro - Main Application
(function () {
  'use strict';

  // State
  let currentView = 'dashboard';
  let currentSymbol = 'BTC/USD';
  let orderSide = 'buy';
  let orderType = 'market';
  let symbols = {};
  let threats = [];
  let allThreats = [];
  let threatTimeline = [];
  let threatsByType = [];
  let geoAttacks = [];
  let sectors = [];
  let ws = null;
  let mainChart = null;
  let dashChart = null;

  // Init
  async function init() {
    setupNavigation();
    setupTradingControls();
    await loadInitialData();
    connectWebSocket();
    startAnimationLoop();
    window.addEventListener('resize', handleResize);
    handleResize();
  }

  // Navigation
  function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const view = btn.dataset.view;
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(view + 'View').classList.add('active');
        currentView = view;
        handleResize();
      });
    });
  }

  // Trading Controls
  function setupTradingControls() {
    // Order side tabs
    document.querySelectorAll('.order-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.order-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        orderSide = tab.dataset.side;
        updateOrderButton();
      });
    });

    // Order type
    document.querySelectorAll('.ot-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.ot-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        orderType = btn.dataset.otype;
        document.getElementById('limitPriceField').style.display = orderType === 'limit' ? 'block' : 'none';
      });
    });

    // Chart type
    document.querySelectorAll('.chart-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (mainChart) {
          mainChart.chartType = btn.dataset.type;
          mainChart.render();
        }
      });
    });

    // Timeframe
    document.querySelectorAll('.tf-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Indicators
    const indBtn = document.getElementById('indicatorBtn');
    const indMenu = document.getElementById('indicatorMenu');
    indBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      indMenu.classList.toggle('open');
    });
    document.addEventListener('click', () => indMenu.classList.remove('open'));
    indMenu.addEventListener('click', (e) => e.stopPropagation());

    indMenu.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        if (mainChart) {
          mainChart.indicators[cb.dataset.ind] = cb.checked;
          mainChart.render();
        }
      });
    });

    // Quantity and percentage buttons
    document.querySelectorAll('.pct-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pct = parseInt(btn.dataset.pct) / 100;
        const price = symbols[currentSymbol]?.price || 0;
        if (price > 0) {
          const maxQty = (parseFloat(document.getElementById('availableBalance').textContent.replace(/[$,]/g, '')) * pct) / price;
          document.getElementById('orderQuantity').value = maxQty.toFixed(4);
          updateOrderTotal();
        }
      });
    });

    document.getElementById('orderQuantity').addEventListener('input', updateOrderTotal);
    document.getElementById('orderPrice').addEventListener('input', updateOrderTotal);

    // Submit order
    document.getElementById('submitOrder').addEventListener('click', submitOrder);

    // Symbol search
    document.getElementById('symbolSearch').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.symbol-list-item').forEach(item => {
        item.style.display = item.dataset.symbol.toLowerCase().includes(q) ? 'flex' : 'none';
      });
    });

    // Threat filters
    document.getElementById('severityFilter').addEventListener('change', filterThreats);
    document.getElementById('statusFilter').addEventListener('change', filterThreats);
  }

  function updateOrderButton() {
    const btn = document.getElementById('submitOrder');
    btn.textContent = `${orderSide === 'buy' ? 'Buy' : 'Sell'} ${currentSymbol}`;
    btn.className = `order-submit ${orderSide === 'buy' ? 'buy-btn' : 'sell-btn'}`;
  }

  function updateOrderTotal() {
    const qty = parseFloat(document.getElementById('orderQuantity').value) || 0;
    const price = orderType === 'limit'
      ? (parseFloat(document.getElementById('orderPrice').value) || 0)
      : (symbols[currentSymbol]?.price || 0);
    document.getElementById('orderTotal').textContent = `$${Helpers.formatPrice(qty * price)}`;
  }

  async function submitOrder() {
    const quantity = parseFloat(document.getElementById('orderQuantity').value);
    if (!quantity || quantity <= 0) return;

    const order = {
      symbol: currentSymbol,
      side: orderSide,
      type: orderType,
      quantity,
      price: orderType === 'limit' ? parseFloat(document.getElementById('orderPrice').value) : undefined,
    };

    const res = await fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(order),
    });
    const result = await res.json();

    if (result.success) {
      document.getElementById('orderQuantity').value = '';
      updateOrderTotal();
      loadPortfolio();
    } else {
      alert(result.message);
    }
  }

  // Data Loading
  async function loadInitialData() {
    const [symbolsRes, threatsRes, portfolioRes] = await Promise.all([
      fetch('/api/market/symbols').then(r => r.json()),
      fetch('/api/threats').then(r => r.json()),
      fetch('/api/portfolio').then(r => r.json()),
    ]);

    symbols = symbolsRes;
    allThreats = threatsRes.threats;
    threats = allThreats;
    threatTimeline = threatsRes.timeline;
    threatsByType = threatsRes.byType;
    geoAttacks = threatsRes.geoAttacks;
    sectors = threatsRes.sectors;

    renderSymbolList();
    renderTickerGrid();
    updateStats(threatsRes.stats);
    ThreatFeedRenderer.renderFeed(threats, document.getElementById('threatFeed'));
    ThreatFeedRenderer.renderTable(threats, document.getElementById('threatTableBody'));
    renderSectors();
    PortfolioRenderer.render(portfolioRes);
    setupThreatTableClicks();

    // Init dashboard symbol selector
    const dashSelector = document.getElementById('dashSymbolSelector');
    Object.keys(symbols).slice(0, 5).forEach((sym, i) => {
      const btn = document.createElement('button');
      btn.textContent = sym.replace('/USD', '');
      if (i === 0) btn.classList.add('active');
      btn.addEventListener('click', () => {
        dashSelector.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadDashChart(sym);
      });
      dashSelector.appendChild(btn);
    });

    // Select first symbol for trading
    selectSymbol(currentSymbol);
    loadDashChart(currentSymbol);
  }

  function renderSymbolList() {
    const list = document.getElementById('symbolList');
    list.innerHTML = '';
    for (const [sym, data] of Object.entries(symbols)) {
      const item = document.createElement('div');
      item.className = `symbol-list-item${sym === currentSymbol ? ' active' : ''}`;
      item.dataset.symbol = sym;
      item.innerHTML = `
        <div>
          <div class="sli-name">${sym}</div>
          <div class="sli-change ${data.changePercent >= 0 ? 'positive' : 'negative'}">${data.changePercent >= 0 ? '+' : ''}${data.changePercent}%</div>
        </div>
        <div style="text-align:right">
          <div class="sli-price">$${Helpers.formatPrice(data.price)}</div>
        </div>
      `;
      item.addEventListener('click', () => selectSymbol(sym));
      list.appendChild(item);
    }
  }

  function renderTickerGrid() {
    const grid = document.getElementById('tickerGrid');
    grid.innerHTML = '';
    for (const [sym, data] of Object.entries(symbols)) {
      const item = document.createElement('div');
      item.className = 'ticker-item';
      item.innerHTML = `
        <div>
          <div class="ticker-symbol">${sym}</div>
        </div>
        <div style="text-align:right">
          <div class="ticker-price" data-sym="${sym}">$${Helpers.formatPrice(data.price)}</div>
          <div class="ticker-change ${data.changePercent >= 0 ? 'positive' : 'negative'}" data-symchange="${sym}">
            ${data.changePercent >= 0 ? '+' : ''}${data.changePercent}%
          </div>
        </div>
      `;
      item.addEventListener('click', () => {
        document.querySelector('.nav-btn[data-view="trading"]').click();
        selectSymbol(sym);
      });
      grid.appendChild(item);
    }
  }

  function renderSectors() {
    const container = document.getElementById('sectorBars');
    const max = sectors.length ? sectors[0].count : 1;
    container.innerHTML = sectors.slice(0, 10).map(s => `
      <div class="sector-bar-item">
        <div class="sector-bar-label">
          <span>${s.sector}</span>
          <span>${s.count}</span>
        </div>
        <div class="sector-bar-track">
          <div class="sector-bar-fill" style="width:${(s.count / max) * 100}%"></div>
        </div>
      </div>
    `).join('');
  }

  function updateStats(stats) {
    document.getElementById('statCritical').textContent = stats.critical;
    document.getElementById('statHigh').textContent = stats.high;
    document.getElementById('statMedium').textContent = stats.medium;
    document.getElementById('statBlocked').textContent = stats.blocked;
    document.getElementById('statActive').textContent = stats.active;

    // Update bar fills
    const total = stats.total || 1;
    document.querySelector('.critical-fill').style.width = (stats.critical / total * 100) + '%';
    document.querySelector('.high-fill').style.width = (stats.high / total * 100) + '%';
    document.querySelector('.medium-fill').style.width = (stats.medium / total * 100) + '%';
    document.querySelector('.blocked-fill').style.width = (stats.blocked / total * 100) + '%';
    document.querySelector('.active-fill').style.width = (stats.active / total * 100) + '%';

    // Threat level
    const level = document.getElementById('globalThreatLevel');
    if (stats.critical > 50) {
      level.textContent = 'SEVERE';
      level.style.color = '#ff1744';
      level.style.borderColor = '#ff1744';
    } else if (stats.critical > 20) {
      level.textContent = 'HIGH';
      level.style.color = '#ff6d00';
      level.style.borderColor = '#ff6d00';
    } else {
      level.textContent = 'ELEVATED';
      level.style.color = '#ff9100';
      level.style.borderColor = '#ff9100';
    }
  }

  async function selectSymbol(sym) {
    currentSymbol = sym;

    // Update UI
    document.getElementById('activeSymbol').textContent = sym;
    document.querySelectorAll('.symbol-list-item').forEach(item => {
      item.classList.toggle('active', item.dataset.symbol === sym);
    });
    updateOrderButton();

    // Load candles
    const candles = await fetch(`/api/market/candles/${encodeURIComponent(sym)}`).then(r => r.json());

    if (!mainChart) {
      mainChart = new CandlestickChart(document.getElementById('mainChart'), {
        subCanvas: document.getElementById('subChart'),
        crosshairEl: document.getElementById('crosshairInfo'),
        yAxisEl: document.getElementById('yAxisLabels'),
      });
    }
    mainChart.setData(candles);

    // Tell server to subscribe
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'subscribe', symbol: sym }));
    }

    updatePriceDisplay();
  }

  async function loadDashChart(sym) {
    const candles = await fetch(`/api/market/candles/${encodeURIComponent(sym)}`).then(r => r.json());
    if (!dashChart) {
      dashChart = new MiniChart(document.getElementById('dashChart'));
    }
    dashChart.drawCandlestick(candles);
  }

  async function loadPortfolio() {
    const data = await fetch('/api/portfolio').then(r => r.json());
    PortfolioRenderer.render(data);
  }

  function updatePriceDisplay() {
    const data = symbols[currentSymbol];
    if (!data) return;
    document.getElementById('activePrice').textContent = `$${Helpers.formatPrice(data.price)}`;
    const changeEl = document.getElementById('activeChange');
    changeEl.textContent = `${data.changePercent >= 0 ? '+' : ''}${data.changePercent}%`;
    changeEl.className = `active-change ${data.changePercent >= 0 ? 'positive' : 'negative'}`;
    updateOrderTotal();
  }

  // WebSocket
  function connectWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}`);

    ws.onopen = () => {
      const statusEl = document.getElementById('connectionStatus');
      statusEl.querySelector('span:last-child').textContent = 'LIVE';
      statusEl.querySelector('.status-dot').style.background = 'var(--accent-green)';
      ws.send(JSON.stringify({ type: 'subscribe', symbol: currentSymbol }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case 'market':
          handleMarketUpdate(msg.data);
          break;
        case 'candle_update':
          if (mainChart && msg.symbol === currentSymbol) {
            mainChart.updateLastCandle(msg.data);
          }
          break;
        case 'orderbook':
          if (msg.symbol === currentSymbol) {
            OrderBookRenderer.render(msg.data, currentSymbol);
          }
          break;
        case 'candles':
          if (mainChart && msg.symbol === currentSymbol) {
            mainChart.setData(msg.data);
          }
          break;
        case 'threat':
          handleNewThreat(msg.data, msg.stats);
          break;
      }
    };

    ws.onclose = () => {
      const statusEl = document.getElementById('connectionStatus');
      statusEl.querySelector('span:last-child').textContent = 'DISCONNECTED';
      statusEl.querySelector('.status-dot').style.background = 'var(--accent-red)';
      setTimeout(connectWebSocket, 3000);
    };
  }

  function handleMarketUpdate(data) {
    for (const [sym, update] of Object.entries(data)) {
      if (symbols[sym]) {
        Object.assign(symbols[sym], update);
      }
    }

    // Update price display if on trading view
    if (currentView === 'trading') {
      updatePriceDisplay();
    }

    // Update symbol list prices
    document.querySelectorAll('.symbol-list-item').forEach(item => {
      const sym = item.dataset.symbol;
      const d = symbols[sym];
      if (!d) return;
      const priceEl = item.querySelector('.sli-price');
      const changeEl = item.querySelector('.sli-change');
      if (priceEl) priceEl.textContent = `$${Helpers.formatPrice(d.price)}`;
      if (changeEl) {
        changeEl.textContent = `${d.changePercent >= 0 ? '+' : ''}${d.changePercent}%`;
        changeEl.className = `sli-change ${d.changePercent >= 0 ? 'positive' : 'negative'}`;
      }
    });

    // Update ticker grid
    for (const [sym, d] of Object.entries(data)) {
      const priceEl = document.querySelector(`[data-sym="${sym}"]`);
      const changeEl = document.querySelector(`[data-symchange="${sym}"]`);
      if (priceEl) priceEl.textContent = `$${Helpers.formatPrice(d.price)}`;
      if (changeEl) {
        changeEl.textContent = `${d.changePercent >= 0 ? '+' : ''}${d.changePercent}%`;
        changeEl.className = `ticker-change ${d.changePercent >= 0 ? 'positive' : 'negative'}`;
      }
    }
  }

  function handleNewThreat(threat, stats) {
    allThreats.unshift(threat);
    if (allThreats.length > 200) allThreats.pop();

    updateStats(stats);
    ThreatFeedRenderer.addThreat(threat, document.getElementById('threatFeed'));

    // Update table if filters match
    filterThreats();
  }

  function filterThreats() {
    const severity = document.getElementById('severityFilter').value;
    const status = document.getElementById('statusFilter').value;

    threats = allThreats.filter(t => {
      if (severity !== 'all' && t.severity !== severity) return false;
      if (status !== 'all' && t.status !== status) return false;
      return true;
    });

    ThreatFeedRenderer.renderTable(threats, document.getElementById('threatTableBody'));
    setupThreatTableClicks();
  }

  function setupThreatTableClicks() {
    document.querySelectorAll('#threatTableBody tr').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.dataset.id;
        const threat = allThreats.find(t => t.id === id);
        ThreatFeedRenderer.renderDetail(threat, document.getElementById('threatDetail'));
      });
    });
  }

  // Resize
  function handleResize() {
    if (mainChart) {
      mainChart.resize();
      mainChart.render();
    }
    if (dashChart) {
      dashChart.resize();
      // Re-render dash chart
      const activeSym = document.querySelector('#dashSymbolSelector button.active');
      if (activeSym) {
        const sym = Object.keys(symbols).find(s => s.replace('/USD', '') === activeSym.textContent) || currentSymbol;
        loadDashChart(sym);
      }
    }
  }

  // Animation loop for threat map and timeline
  function startAnimationLoop() {
    let frameCount = 0;
    function loop() {
      frameCount++;

      // Update every 30 frames (~0.5s at 60fps)
      if (frameCount % 30 === 0) {
        if (currentView === 'dashboard') {
          const timelineCanvas = document.getElementById('threatTimeline');
          if (timelineCanvas) ThreatCharts.drawTimeline(timelineCanvas, threatTimeline);

          const typesCanvas = document.getElementById('threatTypesChart');
          if (typesCanvas) ThreatCharts.drawThreatTypes(typesCanvas, threatsByType);
        }

        if (currentView === 'threats') {
          const mapCanvas = document.getElementById('threatMap');
          if (mapCanvas) ThreatCharts.drawThreatMap(mapCanvas, geoAttacks);

          const vectorsCanvas = document.getElementById('attackVectorsChart');
          if (vectorsCanvas) ThreatCharts.drawAttackVectors(vectorsCanvas, allThreats);
        }
      }

      // Animate threat map continuously for smooth arcs
      if (currentView === 'threats' && frameCount % 3 === 0) {
        const mapCanvas = document.getElementById('threatMap');
        if (mapCanvas) ThreatCharts.drawThreatMap(mapCanvas, geoAttacks);
      }

      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  // Start
  document.addEventListener('DOMContentLoaded', init);
})();
