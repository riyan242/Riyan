class MarketEngine {
  constructor() {
    this.symbols = this.initSymbols();
    this.orderBook = {};
    this.trades = [];
    this.portfolio = {
      balance: 100000,
      positions: {},
      orders: [],
      tradeHistory: [],
    };
    this.candles = {};
    this.initCandles();
    this.initOrderBooks();
  }

  initSymbols() {
    return {
      'BTC/USD': { price: 67450.00, change: 0, changePercent: 0, volume: 0, high: 67800, low: 66900, open: 67200, bid: 67448, ask: 67452, volatility: 0.002 },
      'ETH/USD': { price: 3520.00, change: 0, changePercent: 0, volume: 0, high: 3580, low: 3470, open: 3500, bid: 3519, ask: 3521, volatility: 0.003 },
      'SOL/USD': { price: 142.50, change: 0, changePercent: 0, volume: 0, high: 146, low: 139, open: 141, bid: 142.40, ask: 142.60, volatility: 0.005 },
      'AAPL': { price: 178.50, change: 0, changePercent: 0, volume: 0, high: 180, low: 177, open: 178, bid: 178.48, ask: 178.52, volatility: 0.001 },
      'GOOGL': { price: 141.20, change: 0, changePercent: 0, volume: 0, high: 143, low: 140, open: 141.50, bid: 141.18, ask: 141.22, volatility: 0.001 },
      'MSFT': { price: 415.30, change: 0, changePercent: 0, volume: 0, high: 418, low: 413, open: 414, bid: 415.28, ask: 415.32, volatility: 0.001 },
      'TSLA': { price: 248.90, change: 0, changePercent: 0, volume: 0, high: 255, low: 245, open: 250, bid: 248.85, ask: 248.95, volatility: 0.004 },
      'NVDA': { price: 875.50, change: 0, changePercent: 0, volume: 0, high: 885, low: 868, open: 872, bid: 875.40, ask: 875.60, volatility: 0.003 },
      'CYBER/USD': { price: 45.20, change: 0, changePercent: 0, volume: 0, high: 47, low: 44, open: 45, bid: 45.18, ask: 45.22, volatility: 0.006 },
      'THREAT/USD': { price: 12.80, change: 0, changePercent: 0, volume: 0, high: 13.5, low: 12.2, open: 12.5, bid: 12.78, ask: 12.82, volatility: 0.008 },
    };
  }

  initCandles() {
    const now = Date.now();
    for (const symbol of Object.keys(this.symbols)) {
      this.candles[symbol] = [];
      const basePrice = this.symbols[symbol].price;
      let price = basePrice * (1 - Math.random() * 0.1);

      for (let i = 500; i >= 0; i--) {
        const timestamp = now - i * 60000;
        const open = price;
        const volatility = this.symbols[symbol].volatility;
        const change1 = (Math.random() - 0.48) * basePrice * volatility;
        const change2 = (Math.random() - 0.48) * basePrice * volatility;
        const high = Math.max(open, open + Math.abs(change1), open + Math.abs(change2));
        const low = Math.min(open, open - Math.abs(change1), open - Math.abs(change2));
        const close = open + change1;
        price = close;
        const volume = Math.floor(Math.random() * 10000 + 1000);

        this.candles[symbol].push({
          timestamp,
          open: parseFloat(open.toFixed(2)),
          high: parseFloat(high.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          close: parseFloat(close.toFixed(2)),
          volume,
        });
      }
      this.symbols[symbol].price = price;
    }
  }

  initOrderBooks() {
    for (const symbol of Object.keys(this.symbols)) {
      const price = this.symbols[symbol].price;
      const bids = [];
      const asks = [];
      for (let i = 0; i < 20; i++) {
        const spread = price * 0.0001 * (i + 1);
        bids.push({
          price: parseFloat((price - spread).toFixed(2)),
          quantity: parseFloat((Math.random() * 10 + 0.1).toFixed(4)),
          total: 0,
        });
        asks.push({
          price: parseFloat((price + spread).toFixed(2)),
          quantity: parseFloat((Math.random() * 10 + 0.1).toFixed(4)),
          total: 0,
        });
      }
      let cumBid = 0, cumAsk = 0;
      bids.forEach(b => { cumBid += b.quantity; b.total = parseFloat(cumBid.toFixed(4)); });
      asks.forEach(a => { cumAsk += a.quantity; a.total = parseFloat(cumAsk.toFixed(4)); });
      this.orderBook[symbol] = { bids, asks };
    }
  }

  tick() {
    const updates = {};
    for (const [symbol, data] of Object.entries(this.symbols)) {
      const change = (Math.random() - 0.48) * data.price * data.volatility;
      data.price = parseFloat((data.price + change).toFixed(2));
      data.change = parseFloat((data.price - data.open).toFixed(2));
      data.changePercent = parseFloat(((data.change / data.open) * 100).toFixed(2));
      data.high = Math.max(data.high, data.price);
      data.low = Math.min(data.low, data.price);
      data.bid = parseFloat((data.price - Math.random() * data.price * 0.0002).toFixed(2));
      data.ask = parseFloat((data.price + Math.random() * data.price * 0.0002).toFixed(2));
      data.volume += Math.floor(Math.random() * 100);

      const candles = this.candles[symbol];
      const lastCandle = candles[candles.length - 1];
      const now = Date.now();
      if (now - lastCandle.timestamp > 60000) {
        candles.push({
          timestamp: now,
          open: lastCandle.close,
          high: data.price,
          low: data.price,
          close: data.price,
          volume: Math.floor(Math.random() * 1000),
        });
        if (candles.length > 600) candles.shift();
      } else {
        lastCandle.close = data.price;
        lastCandle.high = Math.max(lastCandle.high, data.price);
        lastCandle.low = Math.min(lastCandle.low, data.price);
        lastCandle.volume += Math.floor(Math.random() * 50);
      }

      this.updateOrderBook(symbol, data.price);

      updates[symbol] = {
        price: data.price,
        change: data.change,
        changePercent: data.changePercent,
        high: data.high,
        low: data.low,
        volume: data.volume,
        bid: data.bid,
        ask: data.ask,
        lastCandle: candles[candles.length - 1],
      };
    }

    if (Math.random() < 0.3) {
      const syms = Object.keys(this.symbols);
      const sym = syms[Math.floor(Math.random() * syms.length)];
      const side = Math.random() > 0.5 ? 'buy' : 'sell';
      const qty = parseFloat((Math.random() * 5 + 0.01).toFixed(4));
      this.trades.unshift({
        symbol: sym,
        side,
        price: this.symbols[sym].price,
        quantity: qty,
        timestamp: Date.now(),
      });
      if (this.trades.length > 100) this.trades.pop();
    }

    return updates;
  }

  updateOrderBook(symbol, price) {
    const book = this.orderBook[symbol];
    book.bids = [];
    book.asks = [];
    for (let i = 0; i < 20; i++) {
      const spread = price * 0.0001 * (i + 1) * (1 + Math.random() * 0.5);
      book.bids.push({
        price: parseFloat((price - spread).toFixed(2)),
        quantity: parseFloat((Math.random() * 10 + 0.1).toFixed(4)),
        total: 0,
      });
      book.asks.push({
        price: parseFloat((price + spread).toFixed(2)),
        quantity: parseFloat((Math.random() * 10 + 0.1).toFixed(4)),
        total: 0,
      });
    }
    let cumBid = 0, cumAsk = 0;
    book.bids.forEach(b => { cumBid += b.quantity; b.total = parseFloat(cumBid.toFixed(4)); });
    book.asks.forEach(a => { cumAsk += a.quantity; a.total = parseFloat(cumAsk.toFixed(4)); });
  }

  executeOrder(order) {
    const { symbol, side, type, quantity, price: limitPrice } = order;
    const sym = this.symbols[symbol];
    if (!sym) return { success: false, message: 'Unknown symbol' };

    const execPrice = type === 'market' ? sym.price : limitPrice;
    const total = execPrice * quantity;

    if (side === 'buy') {
      if (total > this.portfolio.balance) return { success: false, message: 'Insufficient funds' };
      this.portfolio.balance -= total;
      if (!this.portfolio.positions[symbol]) {
        this.portfolio.positions[symbol] = { quantity: 0, avgPrice: 0, totalCost: 0 };
      }
      const pos = this.portfolio.positions[symbol];
      pos.totalCost += total;
      pos.quantity += quantity;
      pos.avgPrice = pos.totalCost / pos.quantity;
    } else {
      const pos = this.portfolio.positions[symbol];
      if (!pos || pos.quantity < quantity) return { success: false, message: 'Insufficient position' };
      pos.quantity -= quantity;
      this.portfolio.balance += total;
      if (pos.quantity <= 0) delete this.portfolio.positions[symbol];
    }

    const trade = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      symbol, side, type, quantity, price: execPrice, total,
      timestamp: Date.now(),
      status: 'filled',
    };
    this.portfolio.tradeHistory.unshift(trade);
    return { success: true, trade };
  }

  getSymbols() { return this.symbols; }
  getCandles(symbol) { return this.candles[symbol] || []; }
  getOrderBook(symbol) { return this.orderBook[symbol] || { bids: [], asks: [] }; }
  getRecentTrades() { return this.trades.slice(0, 50); }
  getPortfolio() {
    const positions = {};
    for (const [sym, pos] of Object.entries(this.portfolio.positions)) {
      const currentPrice = this.symbols[sym]?.price || 0;
      positions[sym] = {
        ...pos,
        currentPrice,
        marketValue: parseFloat((pos.quantity * currentPrice).toFixed(2)),
        pnl: parseFloat(((currentPrice - pos.avgPrice) * pos.quantity).toFixed(2)),
        pnlPercent: parseFloat((((currentPrice - pos.avgPrice) / pos.avgPrice) * 100).toFixed(2)),
      };
    }
    const totalValue = Object.values(positions).reduce((s, p) => s + p.marketValue, 0);
    return {
      balance: parseFloat(this.portfolio.balance.toFixed(2)),
      totalValue: parseFloat((this.portfolio.balance + totalValue).toFixed(2)),
      positions,
      tradeHistory: this.portfolio.tradeHistory.slice(0, 50),
    };
  }
}

module.exports = MarketEngine;
